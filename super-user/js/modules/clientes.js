// js/modules/clientes.js
// 📋 LÓGICA PRINCIPAL DE LA HABITACIÓN DE CLIENTES

import { sb } from './supabase.js'
import { mostrarMensaje, escapeHtml } from './utils.js'
import { abrirModalElegirTipoCliente } from './modales/modalesGenerales.js'

// ============================================================
// VARIABLES PRIVADAS
// ============================================================

let clientes = []
let clientesFiltrados = []

// ============================================================
// FUNCIONES AUXILIARES DE BADGES
// ============================================================

function getBadgePlanClass(plan) {
    const classes = {
        'BASICO': 'badge-basico',
        'PRO': 'badge-pro',
        'EMPRESA': 'badge-empresa-plan'
    }
    return classes[plan] || 'badge-basico'
}

function getBadgePlanTexto(plan) {
    const textos = {
        'BASICO': '📒 Básico',
        'PRO': '📘 Pro',
        'EMPRESA': '📕 Empresa'
    }
    return textos[plan] || 'BASICO'
}

// ============================================================
// RENDERIZAR CLIENTES (MODO MÓVIL - CARDS)
// ============================================================

function renderizarClientes() {
    const container = document.getElementById('listaClientes')
    if (!container) return

    if (!clientesFiltrados || clientesFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--ios-gray);">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>No hay clientes que coincidan</p>
            </div>
        `
        return
    }

    container.innerHTML = clientesFiltrados.map(cliente => `
        <div class="cliente-card" data-id="${cliente.id}">
            <div class="cliente-header">
                <div>
                    <div class="cliente-nombre">${escapeHtml(cliente.nombre_empresa || 'Sin nombre')}</div>
                    <div class="cliente-nif">${escapeHtml(cliente.nif_cif || 'Sin NIF')}</div>
                </div>
                <div class="cliente-actions">
                    <button class="action-btn ver-cliente" data-id="${cliente.id}" title="Ver">👁️</button>
                    <button class="action-btn editar-cliente" data-id="${cliente.id}" title="Editar">✏️</button>
                    <button class="action-btn documentos-cliente" data-id="${cliente.id}" data-nombre="${escapeHtml(cliente.nombre_empresa)}" title="Documentación legal">📋</button>
                    <button class="action-btn eliminar-cliente" data-id="${cliente.id}" title="Eliminar">🗑️</button>
                </div>
            </div>
            <div class="cliente-contacto">
                <span>📧 ${escapeHtml(cliente.contacto_email || cliente.email || '-')}</span>
                <span>📱 ${escapeHtml(cliente.telefono || '-')}</span>
            </div>
            <div class="cliente-badges">
                <span class="badge ${getBadgePlanClass(cliente.plan)}">${getBadgePlanTexto(cliente.plan)}</span>
                <span class="badge ${cliente.activo ? 'badge-activo' : 'badge-inactivo'}">
                    ${cliente.activo ? '✅ Activo' : '❌ Inactivo'}
                </span>
                <span class="badge ${cliente.consentimiento ? 'badge-activo' : 'badge-inactivo'}">
                    ${cliente.consentimiento ? '📜 RGPD ✅' : '📜 RGPD ❌'}
                </span>
            </div>
        </div>
    `).join('')
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

            const { data: suscripcion } = await sb.from('suscripciones_clientes')
                .select('plan')
                .eq('empresa_id', cliente.id)
                .eq('estado', 'activa')
                .maybeSingle()

            cliente.contacto_nombre = perfil?.nombre_razon_social || ''
            cliente.contacto_email = perfil?.email || cliente.email || ''
            cliente.consentimiento = perfil?.consentimiento_tratamiento_datos || false
            cliente.perfil_id = perfil?.id || null
            cliente.plan = suscripcion?.plan || 'BASICO'
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
        selectProvincia.innerHTML = '<option value="">Todas</option>' +
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

    renderizarClientes()
}

// ============================================================
// EVENTOS DE LOS BOTONES
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
        
        else if (btn.classList.contains('eliminar-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const nombre = btn.dataset.nombre
            const cliente = clientes.find(c => c.id === id)
            const nombreCliente = cliente?.nombre_empresa || nombre
            const { abrirModalEliminarCliente } = await import('./modales/modalesEliminacion.js')
            abrirModalEliminarCliente(id, nombreCliente)
        }
        else if (btn.classList.contains('documentos-cliente')) {
    e.preventDefault()
    const id = btn.dataset.id
    const nombre = btn.dataset.nombre
    const { descargarDocumentacionCliente } = await import('./generarPDF.js')
    descargarDocumentacionCliente(id, nombre)
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