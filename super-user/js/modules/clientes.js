import { sb } from './supabase.js'
import { formatDate, mostrarMensaje, getBadgeTipo, getTipoIcono } from './utils.js'
import { getCurrentUser } from './main.js'

let clientes = []
let clientesFiltrados = []
let pagina = 1
const POR_PAGINA = 10
let clienteAEliminar = null

function renderizarTabla() {
    const tbody = document.getElementById('clientesBody')
    if (!tbody) return

    const inicio = (pagina - 1) * POR_PAGINA
    const fin = inicio + POR_PAGINA
    const paginados = clientesFiltrados.slice(inicio, fin)

    if (paginados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">📋 No hay clientes</td></tr>'
        document.getElementById('paginacion').innerHTML = ''
        document.getElementById('totalClientes').innerHTML = ''
        return
    }

    tbody.innerHTML = paginados.map(c => `
        <tr>
            <td>${getBadgeTipo(c.tipo_cliente)}</td>
            <td><strong>${c.nombre_empresa || '-'}</strong><br><small>${c.nif_cif || ''}</small></td>
            <td>${c.contacto_nombre || '-'}</td>
            <td>${c.contacto_email || '-'}</td>
            <td><span class="badge badge-${c.plan?.toLowerCase() || 'basico'}">${c.plan || 'BASICO'}</span></td>
            <td><span class="badge ${c.activo ? 'badge-activo' : 'badge-inactivo'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td><span class="badge ${c.consentimiento ? 'badge-activo' : 'badge-inactivo'}">${c.consentimiento ? '✅ Aceptado' : '❌ Pendiente'}</span></td>
            <td>
                <button class="btn-sm ver-cliente" data-id="${c.id}">👁️ Ver</button>
                <button class="btn-sm editar-cliente" data-id="${c.id}">✏️ Editar</button>
                <button class="btn-sm toggle-cliente" data-id="${c.id}" data-activo="${c.activo}">${c.activo ? '❌' : '✅'}</button>
                <button class="btn-sm eliminar-cliente" data-id="${c.id}" data-nombre="${c.nombre_empresa?.replace(/"/g, '&quot;') || ''}">🗑️</button>
            </td>
        </tr>
    `).join('')

    const totalPaginas = Math.ceil(clientesFiltrados.length / POR_PAGINA)
    let pagHtml = ''
    for (let i = 1; i <= totalPaginas; i++) {
        pagHtml += `<button class="${i === pagina ? 'active' : ''}" data-pagina="${i}">${i}</button>`
    }
    document.getElementById('paginacion').innerHTML = pagHtml
    document.getElementById('totalClientes').innerHTML = `Mostrando ${clientesFiltrados.length} clientes · Página ${pagina} de ${totalPaginas || 1}`

    document.querySelectorAll('#paginacion button').forEach(btn => {
        btn.onclick = () => {
            pagina = parseInt(btn.dataset.pagina)
            renderizarTabla()
        }
    })
}

function aplicarFiltros() {
    const busqueda = document.getElementById('buscadorCliente')?.value.toLowerCase() || ''
    const plan = document.getElementById('filtroPlan')?.value || ''
    const estado = document.getElementById('filtroEstado')?.value || ''
    const provincia = document.getElementById('filtroProvincia')?.value || ''

    clientesFiltrados = clientes.filter(c => {
        if (busqueda && !`${c.nombre_empresa} ${c.nif_cif} ${c.contacto_email} ${c.contacto_nombre}`.toLowerCase().includes(busqueda)) return false
        if (plan && c.plan !== plan) return false
        if (estado === 'activo' && !c.activo) return false
        if (estado === 'inactivo' && c.activo) return false
        if (provincia && c.provincia !== provincia) return false
        return true
    })
    pagina = 1
    renderizarTabla()
}

async function cargarDatos() {
    const { data: empresas, error } = await sb.from('empresas').select('*').order('created_at', { ascending: false })
    if (error) {
        mostrarMensaje('Error cargando clientes: ' + error.message, 'error')
        return
    }

    clientes = empresas || []
    for (const c of clientes) {
        const { data: perfil } = await sb.from('perfiles')
            .select('nombre_razon_social, email, telefono, consentimiento_tratamiento_datos, id')
            .eq('empresa_id', c.id)
            .eq('rol', 'gerente')
            .maybeSingle()
        c.contacto_nombre = perfil?.nombre_razon_social || ''
        c.contacto_email = perfil?.email || c.email || ''
        c.consentimiento = perfil?.consentimiento_tratamiento_datos || false
        c.perfil_id = perfil?.id || null
    }

    const provincias = [...new Set(clientes.map(c => c.provincia).filter(p => p))]
    const selectProvincia = document.getElementById('filtroProvincia')
    if (selectProvincia) {
        selectProvincia.innerHTML = '<option value="">Todas las provincias</option>' + provincias.map(p => `<option value="${p}">${p}</option>`).join('')
    }

    aplicarFiltros()
}

// Ver cliente
async function verCliente(id) {
    const cliente = clientes.find(c => c.id === id)
    if (!cliente) return

    let consentimientos = []
    if (cliente.perfil_id) {
        const { data } = await sb.from('historico_consentimientos')
            .select('*')
            .eq('perfil_id', cliente.perfil_id)
            .order('fecha_aceptacion', { ascending: false })
        consentimientos = data || []
    }

    const detalle = document.getElementById('detalleCliente')
    const historico = document.getElementById('historicoConsentimientos')
    const modal = document.getElementById('modalVerCliente')

    if (detalle && historico && modal) {
        detalle.innerHTML = `
            <div class="detalle-info">
                <p><strong>🏢 ${cliente.nombre_empresa || '-'}</strong></p>
                <p>📋 Tipo: ${getTipoIcono(cliente.tipo_cliente)}</p>
                <p>📋 NIF: ${cliente.nif_cif || '-'}</p>
                <p>📍 ${cliente.calle || ''} ${cliente.numero || ''} ${cliente.piso || ''}</p>
                <p>📮 ${cliente.codigo_postal || ''} ${cliente.ciudad || ''} ${cliente.provincia || ''}</p>
                <p>📞 ${cliente.telefono || '-'}</p>
                <p>📧 ${cliente.contacto_email || '-'}</p>
                <p>👤 Contacto: ${cliente.contacto_nombre || '-'}</p>
                <p>📱 WhatsApp: ${cliente.whatsapp_contacto || '-'}</p>
                <p>🏷️ Plan: ${cliente.plan || 'BASICO'}</p>
                <p>📅 Alta: ${formatDate(cliente.created_at)}</p>
            </div>
        `
        historico.innerHTML = `<div class="detalle-info"><strong>📜 Consentimientos:</strong><p>${consentimientos.length || 0} registros</p></div>`
        modal.style.display = 'flex'
    }
}

// Editar cliente
async function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id)
    if (!cliente) return

    document.getElementById('editClienteId').value = id
    document.getElementById('editNombre').value = cliente.nombre_empresa || ''
    document.getElementById('editEmail').value = cliente.contacto_email || cliente.email || ''
    document.getElementById('editNif').value = cliente.nif_cif || ''
    document.getElementById('editTelefono').value = cliente.telefono || ''
    document.getElementById('editWhatsapp').value = cliente.whatsapp_contacto || ''

    document.getElementById('modalEditarCliente').style.display = 'flex'
}

async function guardarEdicion() {
    const id = document.getElementById('editClienteId').value
    const updateData = {
        nombre_empresa: document.getElementById('editNombre').value,
        email: document.getElementById('editEmail').value,
        nif_cif: document.getElementById('editNif').value,
        telefono: document.getElementById('editTelefono').value,
        whatsapp_contacto: document.getElementById('editWhatsapp').value
    }

    await sb.from('empresas').update(updateData).eq('id', id)
    mostrarMensaje('✅ Cliente actualizado')
    document.getElementById('modalEditarCliente').style.display = 'none'
    await cargarDatos()
}

// Eliminar cliente
function eliminarCliente(id, nombre) {
    clienteAEliminar = { id, nombre }
    document.getElementById('mensajeEliminacionCliente').innerHTML = `¿Eliminar a <strong>"${nombre}"</strong>?`
    document.getElementById('passwordConfirmacion').value = ''
    document.getElementById('modalConfirmarEliminacion').style.display = 'flex'
}

async function confirmarEliminacion() {
    const currentUser = getCurrentUser()
    const password = document.getElementById('passwordConfirmacion').value

    if (!password) {
        mostrarMensaje('Introduce tu contraseña', 'error')
        return
    }

    const { error } = await sb.auth.signInWithPassword({
        email: currentUser.email,
        password: password
    })

    if (error) {
        mostrarMensaje('Contraseña incorrecta', 'error')
        return
    }

    await sb.from('empresas').delete().eq('id', clienteAEliminar.id)
    mostrarMensaje(`✅ Cliente "${clienteAEliminar.nombre}" eliminado`)
    document.getElementById('modalConfirmarEliminacion').style.display = 'none'
    await cargarDatos()
    clienteAEliminar = null
}

// Crear cliente (simplificado)
async function crearCliente() {
    const nombreEmpresa = document.getElementById('razonSocial')?.value || document.getElementById('nombreFisica')?.value || ''
    const email = document.getElementById('emailContacto')?.value || document.getElementById('emailFisica')?.value || ''

    if (!nombreEmpresa || !email) {
        mostrarMensaje('Nombre y email son obligatorios', 'error')
        return
    }

    const { error } = await sb.from('empresas').insert({
        nombre_empresa: nombreEmpresa,
        email: email,
        activo: true,
        created_at: new Date().toISOString()
    })

    if (error) {
        mostrarMensaje('Error: ' + error.message, 'error')
        return
    }

    mostrarMensaje('✅ Cliente creado')
    document.getElementById('modalAltaCliente').style.display = 'none'
    await cargarDatos()
}

// Toggle activo
async function toggleCliente(id, activo) {
    await sb.from('empresas').update({ activo: !activo }).eq('id', id)
    mostrarMensaje(activo ? 'Cliente desactivado' : 'Cliente activado')
    await cargarDatos()
}

// Delegación de eventos
function setupEventos() {
    const container = document.getElementById('moduloContainer')
    if (!container) return

    container.onclick = async (e) => {
        const btn = e.target
        if (btn.classList.contains('ver-cliente')) {
            e.preventDefault()
            await verCliente(btn.dataset.id)
        }
        else if (btn.classList.contains('editar-cliente')) {
            e.preventDefault()
            await editarCliente(btn.dataset.id)
        }
        else if (btn.classList.contains('toggle-cliente')) {
            e.preventDefault()
            await toggleCliente(btn.dataset.id, btn.dataset.activo === 'true')
        }
        else if (btn.classList.contains('eliminar-cliente')) {
            e.preventDefault()
            eliminarCliente(btn.dataset.id, btn.dataset.nombre)
        }
    }
}

// Cerrar modales
function setupModales() {
    const cerrarBtns = ['btnCancelarAlta', 'btnCancelarEdicion', 'btnCerrarDetalle', 'btnCerrarClienteCreado', 'btnCancelarEliminacion']
    cerrarBtns.forEach(id => {
        const btn = document.getElementById(id)
        if (btn) {
            btn.onclick = () => {
                const modal = btn.closest('.modal')
                if (modal) modal.style.display = 'none'
            }
        }
    })

    document.getElementById('btnGuardarEdicion').onclick = guardarEdicion
    document.getElementById('btnGuardarCliente').onclick = crearCliente
    document.getElementById('btnConfirmarEliminacion').onclick = confirmarEliminacion

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none'
        }
    })
}

// Función pública para iniciar el módulo
export async function iniciar() {
    console.log('🚀 Iniciando módulo clientes')
    await cargarDatos()
    setupEventos()
    setupModales()
    initTipoSujetoSelector()
}

export async function refrescar() {
    await cargarDatos()
}

function initTipoSujetoSelector() {
    const btns = document.querySelectorAll('.tipo-sujeto-btn')
    const datosJuridica = document.getElementById('datosJuridica')
    const datosFisica = document.getElementById('datosFisica')

    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            if (btn.dataset.tipo === 'juridica') {
                if (datosJuridica) datosJuridica.style.display = 'block'
                if (datosFisica) datosFisica.style.display = 'none'
            } else {
                if (datosJuridica) datosJuridica.style.display = 'none'
                if (datosFisica) datosFisica.style.display = 'block'
            }
        }
    })
}
