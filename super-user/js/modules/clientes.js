// js/modules/clientes.js
// 📋 LÓGICA PRINCIPAL DE LA HABITACIÓN DE CLIENTES

import { sb } from './supabase.js'
import { mostrarMensaje } from './utils.js'
import { abrirModalElegirTipoCliente } from './modales/modalesGenerales.js'

// ============================================================
// VARIABLES PRIVADAS
// ============================================================

let clientes = []
let clientesFiltrados = []
let paginaActual = 1
const registrosPorPagina = 10

// ============================================================
// FUNCIONES AUXILIARES DE BADGES
// ============================================================

function getBadgeTipo(tipo) {
    const badges = {
        'administrador': '<span class="badge badge-administrador">🏢 Administrador</span>',
        'comunidad': '<span class="badge badge-comunidad">🏘️ Comunidad</span>',
        'autonomo': '<span class="badge badge-autonomo">👤 Autónomo</span>',
        'empresa': '<span class="badge badge-empresa">🏭 Empresa</span>'
    }
    return badges[tipo] || badges['empresa']
}

function getBadgePlan(plan) {
    const planes = {
        'BASICO': '<span class="badge badge-basico">📒 Básico</span>',
        'PRO': '<span class="badge badge-pro">📘 Pro</span>',
        'EMPRESA': '<span class="badge badge-empresa-plan">📕 Empresa</span>'
    }
    return planes[plan] || planes['BASICO']
}

function getBadgeEstado(activo) {
    if (activo) {
        return '<span class="badge badge-activo">✅ Activo</span>'
    }
    return '<span class="badge badge-inactivo">❌ Inactivo</span>'
}

function getBadgeConsentimiento(consentimiento) {
    if (consentimiento) {
        return '<span class="badge badge-activo">✅ Aceptado</span>'
    }
    return '<span class="badge badge-inactivo">❌ Pendiente</span>'
}

function escapeHtml(text) {
    if (!text) return text
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// ============================================================
// RENDERIZAR TABLA
// ============================================================

function renderizarTabla() {
    const tbody = document.getElementById('clientesBody')
    if (!tbody) return

    const inicio = (paginaActual - 1) * registrosPorPagina
    const fin = inicio + registrosPorPagina
    const paginados = clientesFiltrados.slice(inicio, fin)

    if (paginados.length === 0) {
        tbody.innerHTML = `<td><td colspan="8" style="text-align:center; padding:40px;">
            📋 No hay clientes que coincidan
        <\/td><tr>`
        document.getElementById('paginacion').innerHTML = ''
        document.getElementById('totalClientes').innerHTML = ''
        return
    }

    tbody.innerHTML = paginados.map(cliente => `
        <tr>
            <td data-label="Tipo">${getBadgeTipo(cliente.tipo_cliente)}</td>
            <td data-label="Empresa">
                <strong>${escapeHtml(cliente.nombre_empresa) || '-'}</strong><br>
                <small>${escapeHtml(cliente.nif_cif) || ''}</small>
            </td>
            <td data-label="Contacto">${escapeHtml(cliente.contacto_nombre) || '-'}</td>
            <td data-label="Email">${escapeHtml(cliente.contacto_email) || '-'}</td>
            <td data-label="Plan">${getBadgePlan(cliente.plan)}</td>
            <td data-label="Estado">${getBadgeEstado(cliente.activo)}</td>
            <td data-label="RGPD">${getBadgeConsentimiento(cliente.consentimiento)}</td>
            <td data-label="Acciones" class="acciones">
                <button class="btn-sm ver-cliente" data-id="${cliente.id}">👁️ Ver</button>
                <button class="btn-sm editar-cliente" data-id="${cliente.id}">✏️ Editar</button>
                <button class="btn-sm toggle-cliente" data-id="${cliente.id}" data-activo="${cliente.activo}">
                    ${cliente.activo ? '❌ Desactivar' : '✅ Activar'}
                </button>
                <button class="btn-sm eliminar-cliente" data-id="${cliente.id}" data-nombre="${escapeHtml(cliente.nombre_empresa) || ''}">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('')

    const totalPaginas = Math.ceil(clientesFiltrados.length / registrosPorPagina)
    let pagHtml = ''
    for (let i = 1; i <= totalPaginas; i++) {
        pagHtml += `<button class="${i === paginaActual ? 'active' : ''}" data-pagina="${i}">${i}</button>`
    }
    document.getElementById('paginacion').innerHTML = pagHtml
    document.getElementById('totalClientes').innerHTML = `Mostrando ${clientesFiltrados.length} clientes · Página ${paginaActual} de ${totalPaginas || 1}`

    document.querySelectorAll('#paginacion button').forEach(btn => {
        btn.onclick = () => {
            paginaActual = parseInt(btn.dataset.pagina)
            renderizarTabla()
        }
    })
}

// ============================================================
// CARGAR CLIENTES DESDE SUPABASE
// ============================================================

export async function cargarClientes() {
    try {
        const { data: empresas, error } = await sb.from('empresas')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        clientes = empresas || []

        for (const cliente of clientes) {
            const { data: perfil } = await sb.from('perfiles')
                .select('nombre_razon_social, email, telefono, consentimiento_tratamiento_datos, id')
                .eq('empresa_id', cliente.id)
                .eq('rol', 'gerente')
                .maybeSingle()

            cliente.contacto_nombre = perfil?.nombre_razon_social || ''
            cliente.contacto_email = perfil?.email || cliente.email || ''
            cliente.consentimiento = perfil?.consentimiento_tratamiento_datos || false
            cliente.perfil_id = perfil?.id || null
        }

        actualizarFiltroProvincias()
        aplicarFiltros()

    } catch (error) {
        console.error('Error cargando clientes:', error)
        mostrarMensaje('Error cargando clientes: ' + error.message, 'error')
    }
}

// ============================================================
// FILTROS
// ============================================================

function actualizarFiltroProvincias() {
    const provincias = [...new Set(clientes.map(c => c.provincia).filter(p => p))]
    const selectProvincia = document.getElementById('filtroProvincia')
    
    if (selectProvincia) {
        selectProvincia.innerHTML = '<option value="">Todas las provincias</option>' +
            provincias.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')
    }
}

function aplicarFiltros() {
    const busqueda = document.getElementById('buscadorCliente')?.value.toLowerCase() || ''
    const plan = document.getElementById('filtroPlan')?.value || ''
    const estado = document.getElementById('filtroEstado')?.value || ''
    const provincia = document.getElementById('filtroProvincia')?.value || ''

    clientesFiltrados = clientes.filter(cliente => {
        if (busqueda) {
            const textoBuscar = `${cliente.nombre_empresa} ${cliente.nif_cif} ${cliente.contacto_email} ${cliente.contacto_nombre}`.toLowerCase()
            if (!textoBuscar.includes(busqueda)) return false
        }
        
        if (plan && cliente.plan !== plan) return false
        if (estado === 'activo' && !cliente.activo) return false
        if (estado === 'inactivo' && cliente.activo) return false
        if (provincia && cliente.provincia !== provincia) return false
        
        return true
    })

    paginaActual = 1
    renderizarTabla()
}

// ============================================================
// EVENTOS DE LOS BOTONES DE LA TABLA
// ============================================================

function setupEventosTabla() {
    const container = document.getElementById('moduloContainer')
    if (!container) return

    container.onclick = async (e) => {
        const btn = e.target
        
        if (btn.classList.contains('ver-cliente')) {
            e.preventDefault()
            const cliente = clientes.find(c => c.id === btn.dataset.id)
            if (cliente) {
                const { abrirModalVerCliente } = await import('./modales/modalesVision.js')
                abrirModalVerCliente(cliente)
            }
        }
        
        else if (btn.classList.contains('editar-cliente')) {
            e.preventDefault()
            const cliente = clientes.find(c => c.id === btn.dataset.id)
            if (cliente) {
                if (cliente.tipo_cliente === 'autonomo') {
                    const { abrirModalEditarAutonomo } = await import('./modales/modalesEdicionAutonomo.js')
                    abrirModalEditarAutonomo(cliente)
                } else {
                    const { abrirModalEditarEmpresa } = await import('./modales/modalesEdicionEmpresa.js')
                    abrirModalEditarEmpresa(cliente)
                }
            }
        }
        
        else if (btn.classList.contains('toggle-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const activo = btn.dataset.activo === 'true'
            
            const { error } = await sb.from('empresas')
                .update({ activo: !activo })
                .eq('id', id)
            
            if (error) {
                mostrarMensaje('Error al cambiar estado', 'error')
            } else {
                mostrarMensaje(activo ? 'Cliente desactivado' : 'Cliente activado', 'exito')
                await cargarClientes()
            }
        }
        
        else if (btn.classList.contains('eliminar-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const nombre = btn.dataset.nombre
            const { abrirModalEliminarCliente } = await import('./modales/modalesEliminacion.js')
            abrirModalEliminarCliente(id, nombre)
        }
    }
}

// ============================================================
// INICIALIZAR MÓDULO
// ============================================================

export async function iniciar() {
    console.log('🚀 Iniciando habitación de clientes')
    
    await cargarClientes()
    setupEventosTabla()
    
    const buscador = document.getElementById('buscadorCliente')
    const filtroPlan = document.getElementById('filtroPlan')
    const filtroEstado = document.getElementById('filtroEstado')
    const filtroProvincia = document.getElementById('filtroProvincia')
    
    if (buscador) buscador.addEventListener('input', aplicarFiltros)
    if (filtroPlan) filtroPlan.addEventListener('change', aplicarFiltros)
    if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros)
    if (filtroProvincia) filtroProvincia.addEventListener('change', aplicarFiltros)
    
    const btnNuevo = document.getElementById('btnNuevoCliente')
    if (btnNuevo) {
        btnNuevo.onclick = async () => {
            const { abrirModalElegirTipoCliente } = await import('./modales/modalesGenerales.js')
            abrirModalElegirTipoCliente()
        }
    }
}

// ============================================================
// EXPORTAR FUNCIONES PÚBLICAS
// ============================================================

export default {
    iniciar,
    cargarClientes
}