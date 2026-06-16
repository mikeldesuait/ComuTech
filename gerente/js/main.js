// gerente/js/main.js
// Punto de entrada principal del panel gerente

import { sb } from './config/supabase.js'
import { 
    hacerLogin, cerrarSesion, verificarSesion, 
    getCurrentUser, getCurrentPerfil, getCurrentEmpresaId 
} from './modules/auth.js'
import { 
    mostrarMensaje, formatearFecha, formatearFechaHora, 
    escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga,
    mostrarModalConfirmacion, mostrarModalInformativo
} from './modules/utils.js'

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let currentUser = null
let currentPerfil = null
let currentEmpresaId = null
let tabActiva = 'tareas'

// Variables para módulos dinámicos
let tareasModule = null
let personalModule = null
let clientesModule = null
let materialesModule = null
let facturacionModule = null
let impuestosModule = null

let tareasData = []
let tecnicosInternosData = []
let tecnicosExternosData = []
let clientesData = []
let activosData = []
let stockData = []
let gastosData = []
let facturasData = []
let pagosData = []
let vacacionesData = []
let ausenciasData = []

// ============================================================
// INICIALIZACIÓN
// ============================================================

export async function init() {
    console.log('🚀 Iniciando Panel Gerente')
    
    setupLoginListener()
    
    const tieneSesion = await verificarSesion()
    if (tieneSesion) {
        currentUser = getCurrentUser()
        currentPerfil = getCurrentPerfil()
        currentEmpresaId = getCurrentEmpresaId()
        await mostrarDashboard()
    } else {
        mostrarLoginPanel()
    }
}

// ============================================================
// LOGIN
// ============================================================

function setupLoginListener() {
    const btnLogin = document.getElementById('btnLogin')
    if (btnLogin) {
        const newBtn = btnLogin.cloneNode(true)
        btnLogin.parentNode.replaceChild(newBtn, btnLogin)
        
        newBtn.onclick = async () => {
            const email = document.getElementById('email').value.trim()
            const password = document.getElementById('password').value
            
            try {
                const result = await hacerLogin(email, password)
                currentUser = result.user
                currentPerfil = result.perfil
                currentEmpresaId = result.empresaId
                await mostrarDashboard()
            } catch (error) {
                const errorMsg = document.getElementById('errorMsg')
                if (errorMsg) errorMsg.innerText = error.message
            }
        }
    }
    
    const passwordInput = document.getElementById('password')
    if (passwordInput) {
        passwordInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const btnLogin = document.getElementById('btnLogin')
                if (btnLogin) btnLogin.click()
            }
        }
    }
}

function mostrarLoginPanel() {
    const loginPanel = document.getElementById('loginPanel')
    const dashboardPanel = document.getElementById('dashboardPanel')
    
    if (loginPanel) loginPanel.style.display = 'flex'
    if (dashboardPanel) dashboardPanel.style.display = 'none'
    
    const errorMsg = document.getElementById('errorMsg')
    if (errorMsg) errorMsg.innerText = ''
    
    const email = document.getElementById('email')
    const password = document.getElementById('password')
    if (email) email.value = ''
    if (password) password.value = ''
}

// ============================================================
// MOSTRAR DASHBOARD
// ============================================================

async function mostrarDashboard() {
    const loginPanel = document.getElementById('loginPanel')
    const dashboardPanel = document.getElementById('dashboardPanel')
    
    if (loginPanel) loginPanel.style.display = 'none'
    if (dashboardPanel) dashboardPanel.style.display = 'block'
    
    const nombreGerente = document.getElementById('nombreGerente')
    const emailGerente = document.getElementById('emailGerente')
    const nombreEmpresaBanner = document.getElementById('nombreEmpresaBanner')
    
    if (nombreGerente) nombreGerente.innerHTML = currentPerfil?.nombre_razon_social || 'Gerente'
    if (emailGerente) emailGerente.innerHTML = currentUser?.email || ''
    
    const empresaInfo = await getEmpresaInfo()
    if (nombreEmpresaBanner) nombreEmpresaBanner.innerHTML = empresaInfo?.nombre_empresa || 'Mi Empresa'
    
    setupDashboardListeners()
    await cargarDatosIniciales()
    await renderizarPanel()
}

async function getEmpresaInfo() {
    if (!currentEmpresaId) return { nombre_empresa: 'Sin empresa' }
    try {
        const { data, error } = await sb.from('empresas').select('nombre_empresa').eq('id', currentEmpresaId).maybeSingle()
        if (error || !data) return { nombre_empresa: 'Empresa no encontrada' }
        return data
    } catch (error) {
        return { nombre_empresa: 'Error' }
    }
}

function setupDashboardListeners() {
    const btnLogout = document.getElementById('btnLogout')
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true)
        btnLogout.parentNode.replaceChild(newBtn, btnLogout)
        newBtn.onclick = async () => { await cerrarSesion(); window.location.reload() }
    }
    
    const btnRefrescar = document.getElementById('btnRefrescar')
    if (btnRefrescar) {
        const newBtn = btnRefrescar.cloneNode(true)
        btnRefrescar.parentNode.replaceChild(newBtn, btnRefrescar)
        newBtn.onclick = async () => {
            mostrarMensaje('🔄 Refrescando...', 'exito')
            await cargarDatosIniciales()
            await renderizarPanel()
        }
    }
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        const newBtn = btn.cloneNode(true)
        btn.parentNode.replaceChild(newBtn, btn)
        newBtn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
            newBtn.classList.add('active')
            tabActiva = newBtn.dataset.tab
            renderizarPanel()
        }
    })
}

// ============================================================
// CARGAR DATOS INICIALES
// ============================================================

async function cargarDatosIniciales() {
    tareasModule = await import('./modules/tareas.js')
    personalModule = await import('./modules/personal.js')
    clientesModule = await import('./modules/clientes.js')
    materialesModule = await import('./modules/materiales.js')
    facturacionModule = await import('./modules/facturacion.js')
    impuestosModule = await import('./modules/impuestos.js')
    
    tareasData = await tareasModule.cargarTareas(currentEmpresaId)
    tecnicosInternosData = await personalModule.cargarTecnicosInternos(currentEmpresaId)
    tecnicosExternosData = await personalModule.cargarTecnicosExternos(currentEmpresaId)
    clientesData = await clientesModule.cargarClientes(currentEmpresaId)
    activosData = []
    stockData = await materialesModule.cargarStockMateriales(currentEmpresaId)
    gastosData = await materialesModule.cargarGastosMateriales(currentEmpresaId)
    facturasData = await facturacionModule.cargarIngresos(currentEmpresaId)
    pagosData = await facturacionModule.cargarPagos(currentEmpresaId)
    vacacionesData = await personalModule.cargarVacaciones(currentEmpresaId)
    ausenciasData = await personalModule.cargarAusencias(currentEmpresaId)
}

// ============================================================
// RENDERIZAR PANEL PRINCIPAL
// ============================================================

async function renderizarPanel() {
    const container = document.getElementById('contenidoPanel')
    if (!container) return
    
    let contenido = ''
    if (tabActiva === 'tareas') {
        contenido = await renderizarTareas()
    } else if (tabActiva === 'personal') {
        contenido = await renderizarPersonal()
    } else if (tabActiva === 'clientes') {
        contenido = await renderizarClientes()
    } else if (tabActiva === 'materiales') {
        contenido = await renderizarMateriales()
    } else if (tabActiva === 'facturacion') {
        contenido = await renderizarFacturacion()
    } else if (tabActiva === 'impuestos') {
        contenido = await renderizarImpuestos()
    }
    
    container.innerHTML = contenido
    asignarEventosSubmodulos()
}

// ============================================================
// RENDERIZADO DE TAREAS
// ============================================================

async function renderizarTareas() {
    const subvista = localStorage.getItem('gerente_tareas_subvista') || 'lista'
    
    if (subvista === 'crear') return renderizarFormularioCrearTarea()
    if (subvista === 'editar') {
        const tareaId = localStorage.getItem('gerente_tarea_editar')
        const tarea = tareasData.find(t => t.id === tareaId)
        if (tarea) return renderizarFormularioEditarTarea(tarea)
    }
    if (subvista === 'detalle') {
        const tareaId = localStorage.getItem('gerente_tarea_detalle')
        const tarea = tareasData.find(t => t.id === tareaId)
        if (tarea) return await renderizarDetalleTarea(tarea)
    }
    return renderizarListaTareas()
}

function renderizarListaTareas() {
    if (!tareasData || tareasData.length === 0) {
        return `<div class="container"><div class="card"><div class="card-header">📋 Lista de Tareas</div><div class="text-center" style="padding:40px;"><p>📭 No hay tareas</p><button id="btnCrearTareaLista" class="btn-success">➕ Crear</button></div></div></div>`
    }
    
    let html = `<div class="container"><div class="card"><div class="card-header">📋 Tareas<button id="btnCrearTareaLista" class="btn-success" style="float:right;">➕ Nueva</button></div><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Nº</th><th>Título</th><th>Cliente</th><th>Técnico</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`
    for (const t of tareasData) {
        const prioridadClass = t.prioridad === 'urgente' ? 'badge-inactivo' : (t.prioridad === 'alta' ? 'badge-pendiente' : 'badge-activo')
        const estadoClass = t.estado === 'completada' ? 'badge-activo' : (t.estado === 'cancelada' ? 'badge-inactivo' : 'badge-pendiente')
        html += `<tr><td><strong>${escapeHtml(t.numero_tarea)}</strong></td>
        <td>${escapeHtml(t.titulo)}</span></div></td>
        <td>${escapeHtml(t.empresas?.nombre_empresa || '-')}</span></div></td>
        <td>${escapeHtml(t.perfiles?.nombre_razon_social || 'Sin')}</span></div></td>
        <td><span class="badge ${prioridadClass}">${t.prioridad || 'media'}</span></td>
        <td><span class="badge ${estadoClass}">${t.estado || 'pendiente'}</span></td>
        <td><button class="btn-sm ver-tarea" data-id="${t.id}" style="background:#0284c7;">👁️</button>
        ${t.estado === 'pendiente' ? `<button class="btn-sm asignar-tarea" data-id="${t.id}" style="background:#e67e22;">🔄</button>` : ''}
        </td>`
    }
    html += `</tbody></table></div></div></div>`
    return html
}

function renderizarFormularioCrearTarea() {
    const clientesOptions = clientesData.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('')
    const tecnicosOptions = `<option value="">-- Sin asignar --</option>` + tecnicosInternosData.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')
    
    return `<div class="container"><div class="card"><div class="card-header">➕ Crear Tarea<button id="btnVolverTareas" class="btn-warning" style="float:right;">◀ Volver</button></div>
        <div class="row-flex"><div class="grupo"><label>🏢 Cliente *</label><select id="tareaCliente">${clientesOptions}</select></div>
        <div class="grupo"><label>👨‍🔧 Técnico</label><select id="tareaTecnico">${tecnicosOptions}</select></div></div>
        <div class="row-flex"><div class="grupo"><label>⭐ Prioridad</label><select id="tareaPrioridad"><option value="baja">🟢 Baja</option><option value="media" selected>🟡 Media</option><option value="alta">🔴 Alta</option><option value="urgente">🔥 Urgente</option></select></div>
        <div class="grupo"><label>📝 Título *</label><input type="text" id="tareaTitulo"></div></div>
        <div class="form-group"><label>📄 Descripción</label><textarea id="tareaDescripcion" rows="3"></textarea></div>
        <div class="form-group"><label>📋 Orden de trabajo</label><textarea id="tareaOrdenTrabajo" rows="4"></textarea></div>
        <div class="btn-group" style="display:flex;gap:12px;"><button id="btnGuardarTarea" class="btn-success">💾 Guardar</button><button id="btnCancelarTarea" class="btn-danger">✖ Cancelar</button></div>
    </div></div><style>.full-width{width:100%;padding:10px;border-radius:8px;border:1px solid var(--ios-border);}</style>`
}

function renderizarFormularioEditarTarea(tarea) {
    const clientesOptions = clientesData.map(c => `<option value="${c.id}" ${c.id === tarea.empresa_id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')
    const tecnicosOptions = `<option value="">-- Sin asignar --</option>` + tecnicosInternosData.map(t => `<option value="${t.id}" ${t.id === tarea.perfil_id ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`).join('')
    
    return `<div class="container"><div class="card"><div class="card-header">✏️ Editar ${escapeHtml(tarea.numero_tarea)}<button id="btnVolverTareas" class="btn-warning" style="float:right;">◀ Volver</button></div>
        <input type="hidden" id="editTareaId" value="${tarea.id}">
        <div class="row-flex"><div class="grupo"><label>🏢 Cliente</label><select id="editTareaCliente">${clientesOptions}</select></div>
        <div class="grupo"><label>👨‍🔧 Técnico</label><select id="editTareaTecnico">${tecnicosOptions}</select></div></div>
        <div class="row-flex"><div class="grupo"><label>⭐ Prioridad</label><select id="editTareaPrioridad"><option value="baja" ${tarea.prioridad === 'baja' ? 'selected' : ''}>🟢 Baja</option><option value="media" ${tarea.prioridad === 'media' ? 'selected' : ''}>🟡 Media</option><option value="alta" ${tarea.prioridad === 'alta' ? 'selected' : ''}>🔴 Alta</option><option value="urgente" ${tarea.prioridad === 'urgente' ? 'selected' : ''}>🔥 Urgente</option></select></div>
        <div class="grupo"><label>📝 Título</label><input type="text" id="editTareaTitulo" value="${escapeHtml(tarea.titulo)}"></div></div>
        <div class="form-group"><label>📄 Descripción</label><textarea id="editTareaDescripcion" rows="3">${escapeHtml(tarea.descripcion || '')}</textarea></div>
        <div class="form-group"><label>📋 Orden de trabajo</label><textarea id="editTareaOrdenTrabajo" rows="4">${escapeHtml(tarea.orden_trabajo || '')}</textarea></div>
        <div class="row-flex"><div class="grupo"><label>📌 Estado</label><select id="editTareaEstado"><option value="pendiente" ${tarea.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option><option value="en_progreso" ${tarea.estado === 'en_progreso' ? 'selected' : ''}>⚙️ Progreso</option><option value="completada" ${tarea.estado === 'completada' ? 'selected' : ''}>✅ Completada</option><option value="cancelada" ${tarea.estado === 'cancelada' ? 'selected' : ''}>❌ Cancelada</option></select></div></div>
        <div class="btn-group" style="display:flex;gap:12px;"><button id="btnGuardarEdicion" class="btn-success">💾 Guardar</button><button id="btnCancelarEdicion" class="btn-danger">✖ Cancelar</button></div>
    </div></div>`
}

async function renderizarDetalleTarea(tarea) {
    const historial = await tareasModule.getHistorialAsignaciones(tarea.id)
    const prioridadClass = tarea.prioridad === 'urgente' ? 'badge-inactivo' : (tarea.prioridad === 'alta' ? 'badge-pendiente' : 'badge-activo')
    const estadoClass = tarea.estado === 'completada' ? 'badge-activo' : (tarea.estado === 'cancelada' ? 'badge-inactivo' : 'badge-pendiente')
    
    let historialHtml = ''
    if (historial.length > 0) {
        historialHtml = `<div class="card" style="margin-top:16px;"><div class="card-header">📜 Historial</div>${historial.map(h => `<div style="padding:8px;border-bottom:1px solid var(--ios-border);"><small>${h.tipo === 'asignacion' ? '📌 Asignada' : '🔄 Reasignada'} a ${escapeHtml(h.perfiles?.nombre_razon_social || '?')} el ${formatearFechaHora(h.fecha_asignacion)}${h.motivo ? `<br>Motivo: ${escapeHtml(h.motivo)}` : ''}</small></div>`).join('')}</div>`
    }
    
    return `<div class="container"><div class="card"><div class="card-header">📋 ${escapeHtml(tarea.numero_tarea)} - ${escapeHtml(tarea.titulo)}
        <div style="float:right;"><button id="btnEditarTarea" class="btn-info">✏️ Editar</button><button id="btnAsignarTarea" class="btn-warning">🔄 Asignar</button><button id="btnCerrarDetalle" class="btn-danger">✖ Cerrar</button></div></div>
        <div style="background:var(--ios-bg);padding:16px;border-radius:12px;"><p><strong>Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || '-')}</p><p><strong>Técnico:</strong> ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}</p>
        <p><strong>Prioridad:</strong> <span class="badge ${prioridadClass}">${tarea.prioridad || 'media'}</span></p><p><strong>Estado:</strong> <span class="badge ${estadoClass}">${tarea.estado || 'pendiente'}</span></p>
        <p><strong>Descripción:</strong> ${escapeHtml(tarea.descripcion || '-')}</p>${tarea.orden_trabajo ? `<p><strong>Orden trabajo:</strong><br><div style="background:white;padding:12px;border-radius:8px;">${escapeHtml(tarea.orden_trabajo)}</div></p>` : ''}</div>
        ${historialHtml}</div></div>`
}


// ============================================================
// RENDERIZADO DE PERSONAL
// ============================================================

async function renderizarPersonal() {
    const subvista = localStorage.getItem('gerente_personal_subvista') || 'internos'
    
    if (!personalModule) {
        personalModule = await import('./modules/personal.js')
    }
    
    // Recargar datos antes de renderizar
    tecnicosInternosData = await personalModule.cargarTecnicosInternos(currentEmpresaId)
    tecnicosExternosData = await personalModule.cargarTecnicosExternos(currentEmpresaId)
    vacacionesData = await personalModule.cargarVacaciones(currentEmpresaId)
    ausenciasData = await personalModule.cargarAusencias(currentEmpresaId)
    
    const html = `<div class="container"><div class="card"><div class="card-header">👥 Personal</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn-sm ${subvista === 'internos' ? 'btn-success' : 'btn-info'}" data-subtab="internos">👨‍🔧 Internos (${tecnicosInternosData.length})</button>
            <button class="btn-sm ${subvista === 'externos' ? 'btn-success' : 'btn-info'}" data-subtab="externos">🔌 Externos (${tecnicosExternosData.length})</button>
            <button class="btn-sm ${subvista === 'vacaciones' ? 'btn-warning' : 'btn-info'}" data-subtab="vacaciones">🌴 Vacaciones (${vacacionesData.filter(v=>v.estado==='pendiente').length})</button>
            <button class="btn-sm ${subvista === 'ausencias' ? 'btn-danger' : 'btn-info'}" data-subtab="ausencias">⚠️ Ausencias (${ausenciasData.length})</button>
        </div>
        <div id="personalSubcontenido">${await renderizarPersonalSubvista(subvista)}</div>
    </div></div>`
    
    return html
}

// ============================================================
// RENDERIZAR SUBVISTA DE PERSONAL
// ============================================================

async function renderizarPersonalSubvista(subvista) {
    if (!personalModule) {
        personalModule = await import('./modules/personal.js')
    }
    
    const { renderizarListaTecnicos, renderizarListaVacaciones, renderizarListaAusencias } = personalModule
    
    if (subvista === 'internos') {
        return renderizarListaTecnicos(
            tecnicosInternosData, 
            'interno', 
            (id) => editarTecnico(id, 'interno'), 
            (id) => eliminarTecnico(id),
            () => mostrarModalAgregarTecnico('interno')
        )
    } else if (subvista === 'externos') {
        return renderizarListaTecnicos(
            tecnicosExternosData, 
            'externo', 
            (id) => editarTecnico(id, 'externo'), 
            (id) => eliminarTecnicoExterno(id),
            () => mostrarModalAgregarTecnico('externo')
        )
    } else if (subvista === 'vacaciones') {
        return renderizarListaVacaciones(vacacionesData, tecnicosInternosData, (id) => aprobarVacacion(id, 'aprobada'), (id) => aprobarVacacion(id, 'rechazada'))
    } else if (subvista === 'ausencias') {
        return renderizarListaAusencias(ausenciasData, tecnicosInternosData)
    }
    return '<div class="text-center" style="padding:40px;">Selecciona una opción</div>'
}

// ============================================================
// FUNCIONES DE PERSONAL
// ============================================================

// ============================================================
// MODAL AGREGAR TÉCNICO
// ============================================================

function mostrarModalAgregarTecnico(tipo = 'interno') {
    const titulo = tipo === 'interno' ? '➕ Alta de trabajador interno' : '➕ Alta de trabajador externo / subcontrata'
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3>${titulo}</h3>
            
            <!-- Tipo de trabajador -->
            <div class="form-group">
                <label>📋 Tipo de trabajador *</label>
                <select id="tecTipo" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--ios-border);">
                    <option value="interno" ${tipo === 'interno' ? 'selected' : ''}>👨‍🔧 Trabajador interno (contratado)</option>
                    <option value="externo" ${tipo === 'externo' ? 'selected' : ''}>🔌 Trabajador externo / subcontrata</option>
                </select>
            </div>
            
            <!-- Datos personales -->
            <div class="row-flex">
                <div class="grupo">
                    <label>👤 Nombre *</label>
                    <input type="text" id="tecNombre" placeholder="Nombre">
                </div>
                <div class="grupo">
                    <label>Apellido *</label>
                    <input type="text" id="tecApellido" placeholder="Apellido">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📋 DNI / NIE *</label>
                    <input type="text" id="tecDni" placeholder="12345678A">
                </div>
                <div class="grupo">
                    <label>📅 Fecha de nacimiento</label>
                    <input type="date" id="tecFechaNacimiento">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📞 Teléfono</label>
                    <input type="tel" id="tecTelefono" placeholder="Teléfono">
                </div>
                <div class="grupo">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="tecEmail" placeholder="email@personal.com">
                </div>
            </div>
            
            <!-- Datos laborales -->
            <div class="card-header" style="margin-top: 16px;">📋 Datos laborales</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📅 Fecha de alta</label>
                    <input type="date" id="tecFechaAlta" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="grupo">
                    <label>🔧 Especialidad</label>
                    <input type="text" id="tecEspecialidad" placeholder="Ej: Electricidad, Fontanería...">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📋 Nº Seguridad Social</label>
                    <input type="text" id="tecSeguridadSocial" placeholder="12/34567890/12">
                </div>
                <div class="grupo">
                    <label>📅 Fecha fin contrato (si aplica)</label>
                    <input type="date" id="tecFechaFin">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo" id="salarioContainer">
                    <label>💰 Salario por hora (€)</label>
                    <input type="number" id="tecSalario" step="0.01" placeholder="15.00">
                </div>
                <div class="grupo" id="empresaContainer" style="display: none;">
                    <label>🏢 Empresa subcontratada</label>
                    <input type="text" id="tecEmpresaExterna" placeholder="Nombre de la empresa externa">
                </div>
            </div>
            
            <!-- Credenciales de acceso -->
            <div class="card-header" style="margin-top: 16px;">🔐 Credenciales de acceso</div>
            
            <div class="alert-info" style="background: #dbeafe; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
                <small>🔑 <strong>Email:</strong> Se generará automáticamente con el dominio de tu empresa.</small>
                <br>
                <small>🔑 <strong>Nick:</strong> Se generará automáticamente a partir del nombre y apellido.</small>
                <br>
                <small>🔑 <strong>Contraseña inicial:</strong> <strong>Tecnico2026</strong> (el trabajador deberá cambiarla en su primer acceso).</small>
            </div>
            
            <div class="form-group">
                <label>📋 Resumen de credenciales</label>
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px;">
                    <div>📧 Email: <span id="previewEmail" style="color: #1e4663;">INT0001@dominio.es</span></div>
                    <div>👤 Nick: <span id="previewNick" style="color: #1e4663;">nombreapellido</span></div>
                    <div>🔑 Contraseña: <span id="previewPassword" style="color: #1e4663;">Tecnico2026</span></div>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button id="btnGuardarTecnico" class="btn-aceptar">💾 Dar de alta</button>
                <button id="btnCancelarTecnico" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    // Mostrar/ocultar campos según tipo
    const tipoSelect = document.getElementById('tecTipo')
    const salarioContainer = document.getElementById('salarioContainer')
    const empresaContainer = document.getElementById('empresaContainer')
    
    if (tipoSelect) {
        tipoSelect.onchange = () => {
            if (tipoSelect.value === 'interno') {
                salarioContainer.style.display = 'block'
                empresaContainer.style.display = 'none'
            } else {
                salarioContainer.style.display = 'none'
                empresaContainer.style.display = 'block'
            }
            actualizarPreview()
        }
    }
    
    // Generar vista previa de credenciales
    const nombreInput = document.getElementById('tecNombre')
    const apellidoInput = document.getElementById('tecApellido')
    const emailInput = document.getElementById('tecEmail')
    const previewEmail = document.getElementById('previewEmail')
    const previewNick = document.getElementById('previewNick')
    
    function actualizarPreview() {
        const nombre = nombreInput?.value.trim() || 'nombre'
        const apellido = apellidoInput?.value.trim() || 'apellido'
        const email = emailInput?.value.trim()
        const dominio = currentUser?.email?.split('@')[1] || 'empresa.es'
        const prefijo = tipoSelect?.value === 'interno' ? 'INT' : 'EXT'
        const nick = `${nombre.toLowerCase()}${apellido.toLowerCase()}`
        
        if (previewEmail) {
            previewEmail.textContent = email || `${prefijo}0001@${dominio}`
        }
        if (previewNick) {
            previewNick.textContent = nick
        }
    }
    
    if (nombreInput) nombreInput.oninput = actualizarPreview
    if (apellidoInput) apellidoInput.oninput = actualizarPreview
    if (emailInput) emailInput.oninput = actualizarPreview
    
    // Guardar
    document.getElementById('btnGuardarTecnico').onclick = async () => {
        const tipo = document.getElementById('tecTipo').value
        const nombre = document.getElementById('tecNombre').value.trim()
        const apellido = document.getElementById('tecApellido').value.trim()
        const dni = document.getElementById('tecDni').value.trim()
        const telefono = document.getElementById('tecTelefono').value.trim()
        const emailPersonal = document.getElementById('tecEmail').value.trim()
        const fechaNacimiento = document.getElementById('tecFechaNacimiento').value
        const fechaAlta = document.getElementById('tecFechaAlta').value
        const fechaFin = document.getElementById('tecFechaFin').value
        const especialidad = document.getElementById('tecEspecialidad').value.trim()
        const seguridadSocial = document.getElementById('tecSeguridadSocial').value.trim()
        const salario = parseFloat(document.getElementById('tecSalario').value) || 0
        const empresaExterna = document.getElementById('tecEmpresaExterna').value.trim()
        
        if (!nombre || !apellido) {
            mostrarMensaje('Nombre y apellido obligatorios', 'error')
            return
        }
        
        if (!dni) {
            mostrarMensaje('DNI/NIE obligatorio', 'error')
            return
        }
        
        const datos = {
            nombre,
            apellido,
            dni,
            telefono,
            email: emailPersonal || null,
            fechaNacimiento: fechaNacimiento || null,
            fechaAlta: fechaAlta || null,
            fechaFin: fechaFin || null,
            especialidad: especialidad || null,
            seguridadSocial: seguridadSocial || null,
            salario: salario,
            empresaExterna: empresaExterna || null
        }
        
        const email = currentUser?.email
        
        const exito = tipo === 'interno' 
            ? await personalModule.crearTecnicoInterno(datos, currentEmpresaId, email) 
            : await personalModule.crearTecnicoExterno(datos, currentEmpresaId, email)
        
        if (exito) {
            modal.remove()
            // Recargar datos y forzar actualización de la subvista
            await cargarDatosIniciales()
            const subvistaActual = localStorage.getItem('gerente_personal_subvista') || 'internos'
            localStorage.setItem('gerente_personal_subvista', subvistaActual)
            await renderizarPanel()
        }
    }
    
    document.getElementById('btnCancelarTecnico').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

// gerente/js/main.js
// Función editarTecnico completa (reemplazar en main.js)

async function editarTecnico(id, tipo) {
    const tecnicos = tipo === 'interno' ? tecnicosInternosData : tecnicosExternosData
    const tecnico = tecnicos.find(t => t.id === id)
    if (!tecnico) return
    
    const { renderizarModalEditarTecnico } = personalModule
    
    // Obtener SUPABASE_URL para Edge Functions
    const SUPABASE_URL = "https://idbdkxhhqeuarcqcaweo.supabase.co"
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 650px;">
            <h3>✏️ Editar ${tipo === 'interno' ? 'trabajador interno' : 'trabajador externo'}</h3>
            ${renderizarModalEditarTecnico(tecnico, tipo)}
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnGuardarEdicionTecnico').onclick = async () => {
        const datos = {
            nombre: document.getElementById('editTecNombre').value.trim(),
            email: document.getElementById('editTecEmail').value.trim(),
            telefono: document.getElementById('editTecTelefono').value.trim(),
            especialidad: document.getElementById('editTecEspecialidad').value.trim(),
            fechaAlta: document.getElementById('editTecFechaAlta').value || null,
            fechaFin: document.getElementById('editTecFechaFin').value || null,
            seguridadSocial: document.getElementById('editTecSeguridadSocial').value.trim(),
            activo: document.getElementById('editTecActivo').value === 'true'
        }
        
        // ============================================================
        // 1. ACTUALIZAR NICK EN perfiles, tecnicos y auth.users
        // ============================================================
        const nuevoNick = document.getElementById('editTecNick').value.trim()
        let nickActualizado = false
        
        if (nuevoNick && nuevoNick !== tecnico.nick) {
            // Verificar que el nick no esté en uso por otro usuario
            const { data: existente, error: checkError } = await sb
                .from('perfiles')
                .select('id')
                .eq('nick', nuevoNick)
                .neq('user_id', tecnico.user_id)
                .maybeSingle()
            
            if (checkError) {
                mostrarMensaje('Error al verificar nick', 'error')
                return
            }
            
            if (existente) {
                mostrarMensaje('❌ El nick ya está en uso por otro usuario', 'error')
                return
            }
            
            // 1a. Actualizar nick en perfiles
            const { error: perfilError } = await sb
                .from('perfiles')
                .update({ nick: nuevoNick })
                .eq('user_id', tecnico.user_id)
            
            if (perfilError) {
                mostrarMensaje('Error al actualizar nick en perfiles', 'error')
                return
            }
            
            // 1b. Actualizar nick en tecnicos
            const { error: tecError } = await sb
                .from('tecnicos')
                .update({ nick: nuevoNick })
                .eq('id', id)
            
            if (tecError) {
                mostrarMensaje('Error al actualizar nick en tecnicos', 'error')
                return
            }
            
            // 1c. Actualizar metadata en auth.users (vía Edge Function)
            try {
                const { data: session } = await sb.auth.getSession()
                const response = await fetch(`${SUPABASE_URL}/functions/v1/actualizar-metadata-tecnico`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        user_id: tecnico.user_id,
                        nick: nuevoNick,
                        nombre: datos.nombre
                    })
                })
                
                const result = await response.json()
                if (!response.ok) {
                    console.error('Error actualizando metadata:', result)
                    mostrarMensaje('⚠️ Nick actualizado en la app pero no en metadata de auth', 'error')
                } else {
                    nickActualizado = true
                }
            } catch (error) {
                console.error('Error en Edge Function:', error)
                mostrarMensaje('⚠️ Nick actualizado pero metadata no se sincronizó', 'error')
            }
        }
        
        // ============================================================
        // 2. ACTUALIZAR CONTRASEÑA EN auth.users (vía Edge Function)
        // ============================================================
        const nuevaPassword = document.getElementById('editTecPassword').value
        let passActualizada = false
        
        if (nuevaPassword && nuevaPassword.length >= 6) {
            try {
                const { data: session } = await sb.auth.getSession()
                const response = await fetch(`${SUPABASE_URL}/functions/v1/actualizar-password-tecnico`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        user_id: tecnico.user_id,
                        nueva_password: nuevaPassword
                    })
                })
                
                const result = await response.json()
                if (!response.ok) throw new Error(result.error)
                
                passActualizada = true
                mostrarMensaje('✅ Contraseña actualizada', 'exito')
            } catch (error) {
                console.error('Error actualizando password:', error)
                mostrarMensaje('Error al actualizar contraseña', 'error')
                return
            }
        }
        
        // ============================================================
        // 3. ACTUALIZAR DATOS LABORALES
        // ============================================================
        let exito = false
        
        if (tipo === 'interno') {
            datos.salario_hora = parseFloat(document.getElementById('editTecSalario').value) || 0
            exito = await personalModule.actualizarTecnicoInterno(id, datos)
        } else {
            datos.empresa_externa = document.getElementById('editTecEmpresaExterna').value.trim()
            exito = await personalModule.actualizarTecnicoExterno(id, datos)
        }
        
        if (exito) {
            modal.remove()
            await cargarDatosIniciales()
            const subvista = localStorage.getItem('gerente_personal_subvista') || (tipo === 'interno' ? 'internos' : 'externos')
            localStorage.setItem('gerente_personal_subvista', subvista)
            await renderizarPanel()
            
            let mensaje = '✅ Cambios guardados'
            if (nickActualizada) mensaje += ' | Nick actualizado'
            if (passActualizada) mensaje += ' | Contraseña actualizada'
            mostrarMensaje(mensaje, 'exito')
        } else {
            mostrarMensaje('Error al actualizar datos laborales', 'error')
        }
    }
    
    document.getElementById('btnCancelarEdicionTecnico').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

async function eliminarTecnico(id) {
    mostrarModalConfirmacion('¿Eliminar este trabajador?', async () => {
        const exito = await personalModule.eliminarTecnico(id)
        if (exito) {
            await cargarDatosIniciales()
            const subvista = localStorage.getItem('gerente_personal_subvista') || 'internos'
            localStorage.setItem('gerente_personal_subvista', subvista)
            await renderizarPanel()
        }
    })
}

async function eliminarTecnicoExterno(id) {
    mostrarModalConfirmacion('¿Eliminar este trabajador externo?', async () => {
        const exito = await personalModule.eliminarTecnicoExterno(id)
        if (exito) {
            await cargarDatosIniciales()
            const subvista = localStorage.getItem('gerente_personal_subvista') || 'externos'
            localStorage.setItem('gerente_personal_subvista', subvista)
            await renderizarPanel()
        }
    })
}

async function aprobarVacacion(id, estado) {
    const exito = await personalModule.aprobarVacaciones(id, estado, currentPerfil?.id)
    if (exito) {
        await cargarDatosIniciales()
        renderizarPanel()
    }
}

// ============================================================
// RENDERIZADO DE CLIENTES
// ============================================================

async function renderizarClientes() {
    const subvista = localStorage.getItem('gerente_clientes_subvista') || 'lista'
    
    if (!clientesModule) {
        clientesModule = await import('./modules/clientes.js')
    }
    
    if (subvista === 'crear') {
        const { renderizarFormularioCrearCliente } = clientesModule
        return `<div class="container">
            <div class="card">
                <div class="card-header">➕ Nuevo Cliente
                    <button id="btnVolverClientes" class="btn-warning btn-sm" style="float:right;">◀ Volver</button>
                </div>
                <div id="clientesSubcontenido">
                    ${renderizarFormularioCrearCliente()}
                </div>
            </div>
        </div>`
    }
    
    // Vista lista
    setTimeout(() => mostrarListaClientes(), 50)
    
    return `<div class="container">
        <div class="card">
            <div class="card-header">🏢 Clientes
                <button id="btnAltaCliente" class="btn-success btn-sm" style="float:right;">➕ Alta</button>
            </div>
            <div id="clientesSubcontenido">
                <div class="text-center" style="padding:40px;">Cargando clientes...</div>
            </div>
        </div>
    </div>`
}

// ============================================================
// FUNCIONES DE CLIENTES
// ============================================================

async function mostrarListaClientes() {
    if (clientesData.length === 0) {
        document.getElementById('clientesSubcontenido').innerHTML = `
            <div class="text-center" style="padding:40px;">
                <p>🏢 No hay clientes registrados</p>
            </div>
        `
        return
    }
    
    const { renderizarListaClientes } = clientesModule
    const html = renderizarListaClientes(
        clientesData,
        (id) => editarCliente(id),
        (id) => regenerarCodigoCliente(id),
        (id, activo) => toggleAccesoCliente(id, activo),
        (id) => mostrarActivosCliente(id)
    )
    document.getElementById('clientesSubcontenido').innerHTML = html
    
    document.getElementById('btnAltaCliente')?.addEventListener('click', () => mostrarAltaCliente())
    document.querySelectorAll('.editar-cliente').forEach(btn => btn.addEventListener('click', () => editarCliente(btn.dataset.id)))
    document.querySelectorAll('.regenerar-codigo').forEach(btn => btn.addEventListener('click', () => regenerarCodigoCliente(btn.dataset.id)))
    document.querySelectorAll('.toggle-acceso').forEach(btn => btn.addEventListener('click', () => toggleAccesoCliente(btn.dataset.id, btn.dataset.activo === 'true')))
    document.querySelectorAll('.ver-activos').forEach(btn => btn.addEventListener('click', () => mostrarActivosCliente(btn.dataset.id)))
}

async function mostrarAltaCliente() {
    localStorage.setItem('gerente_clientes_subvista', 'crear')
    await renderizarPanel()
}

async function editarCliente(id) {
    const cliente = clientesData.find(c => c.id === id)
    if (!cliente) return
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <h3>✏️ Editar ${escapeHtml(cliente.nombre)}</h3>
            <input type="hidden" id="editClienteId" value="${cliente.id}">
            <div class="form-group"><label>🏢 Nombre</label><input type="text" id="editNombre" value="${escapeHtml(cliente.nombre)}"></div>
            <div class="form-group"><label>📋 NIF/CIF</label><input type="text" id="editNif" value="${escapeHtml(cliente.nif_cif || '')}"></div>
            <div class="form-group"><label>📧 Email</label><input type="email" id="editEmail" value="${escapeHtml(cliente.email || '')}"></div>
            <div class="form-group"><label>📞 Teléfono</label><input type="tel" id="editTelefono" value="${escapeHtml(cliente.telefono || '')}"></div>
            <div class="form-group"><label>📍 Dirección</label><input type="text" id="editDireccion" value="${escapeHtml(cliente.direccion || '')}"></div>
            <div class="row-flex"><div class="grupo"><label>Ciudad</label><input type="text" id="editCiudad" value="${escapeHtml(cliente.ciudad || '')}"></div>
            <div class="grupo"><label>Provincia</label><input type="text" id="editProvincia" value="${escapeHtml(cliente.provincia || '')}"></div></div>
            <div class="form-group"><label>🔑 Código acceso</label><input type="text" id="editCodigo" value="${escapeHtml(cliente.codigo_acceso || '')}" readonly style="background:#f1f5f9;"></div>
            <div class="modal-buttons"><button id="btnGuardarEdicionCliente" class="btn-aceptar">💾 Guardar</button><button id="btnCancelarEdicionCliente" class="btn-cancelar">Cancelar</button></div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnGuardarEdicionCliente').onclick = async () => {
        const datos = {
            nombre: document.getElementById('editNombre').value.trim(),
            nifCif: document.getElementById('editNif').value,
            email: document.getElementById('editEmail').value,
            telefono: document.getElementById('editTelefono').value,
            direccion: document.getElementById('editDireccion').value,
            ciudad: document.getElementById('editCiudad').value,
            provincia: document.getElementById('editProvincia').value
        }
        const exito = await clientesModule.actualizarCliente(id, datos)
        if (exito) {
            modal.remove()
            await cargarDatosIniciales()
            renderizarPanel()
        }
    }
    document.getElementById('btnCancelarEdicionCliente').onclick = () => modal.remove()
}

async function regenerarCodigoCliente(id) {
    const nuevoCodigo = await clientesModule.regenerarCodigoAcceso(id)
    if (nuevoCodigo) {
        await cargarDatosIniciales()
        mostrarListaClientes()
    }
}

async function toggleAccesoCliente(id, activo) {
    const exito = await clientesModule.toggleAccesoCliente(id, !activo)
    if (exito) {
        await cargarDatosIniciales()
        mostrarListaClientes()
    }
}

async function mostrarActivosCliente(clienteId) {
    const cliente = clientesData.find(c => c.id === clienteId)
    if (!cliente) return
    
    const activos = await clientesModule.cargarActivos(clienteId)
    const { renderizarActivosCliente } = clientesModule
    
    document.getElementById('clientesSubcontenido').innerHTML = renderizarActivosCliente(activos, cliente.nombre)
    
    document.getElementById('btnVolverClientes')?.addEventListener('click', () => {
        localStorage.setItem('gerente_clientes_subvista', 'lista')
        renderizarPanel()
    })
    document.getElementById('btnAgregarActivo')?.addEventListener('click', () => mostrarModalCrearActivo(clienteId))
    document.querySelectorAll('.editar-activo').forEach(btn => btn.addEventListener('click', () => mostrarModalEditarActivo(btn.dataset.id, clienteId)))
    document.querySelectorAll('.eliminar-activo').forEach(btn => btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar este activo?')) {
            await clientesModule.eliminarActivo(btn.dataset.id)
            mostrarActivosCliente(clienteId)
        }
    }))
    document.querySelectorAll('.ver-mapa').forEach(btn => btn.addEventListener('click', () => {
        const lat = btn.dataset.lat
        const lon = btn.dataset.lon
        if (lat && lon) {
            window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')
        } else {
            mostrarMensaje('Este activo no tiene coordenadas guardadas', 'error')
        }
    }))
}

// ============================================================
// OBTENER COORDENADAS DESDE DIRECCIÓN
// ============================================================

function setupCoordenadas() {
    const btnObtener = document.getElementById('btnObtenerCoordenadas')
    if (!btnObtener) return
    
    const newBtn = btnObtener.cloneNode(true)
    btnObtener.parentNode.replaceChild(newBtn, btnObtener)
    
    newBtn.onclick = async () => {
        const direccion = document.getElementById('activoDireccion')?.value || ''
        const localidad = document.getElementById('activoLocalidad')?.value || ''
        const codigoPostal = document.getElementById('activoCodigoPostal')?.value || ''
        
        if (!direccion && !localidad && !codigoPostal) {
            mostrarMensaje('Introduce dirección, localidad o código postal', 'error')
            return
        }
        
        const query = encodeURIComponent(`${direccion}, ${localidad}, ${codigoPostal}, España`)
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
        
        mostrarMensaje('🔍 Buscando coordenadas...', 'exito')
        
        try {
            const response = await fetch(url)
            const data = await response.json()
            
            if (data && data.length > 0) {
                document.getElementById('activoLatitud').value = data[0].lat
                document.getElementById('activoLongitud').value = data[0].lon
                mostrarMensaje('✅ Coordenadas obtenidas', 'exito')
            } else {
                mostrarMensaje('❌ No se encontró la ubicación', 'error')
            }
        } catch (error) {
            console.error(error)
            mostrarMensaje('Error al obtener coordenadas', 'error')
        }
    }
}

// ============================================================
// MODALES DE ACTIVOS
// ============================================================

function mostrarModalCrearActivo(clienteId) {
    const modal = document.getElementById('modalActivo')
    if (!modal) return
    
    document.getElementById('modalActivoTitulo').innerHTML = '🏗️ Nuevo Activo'
    document.getElementById('activoId').value = ''
    document.getElementById('activoNombre').value = ''
    document.getElementById('activoTipoAcceso').value = 'libre'
    document.getElementById('activoUbicacion').value = ''
    document.getElementById('activoContacto').value = ''
    document.getElementById('activoHoraApertura').value = ''
    document.getElementById('activoHoraCierre').value = ''
    document.getElementById('activoDireccion').value = ''
    document.getElementById('activoLocalidad').value = ''
    document.getElementById('activoCodigoPostal').value = ''
    document.getElementById('activoInstrucciones').value = ''
    document.getElementById('activoLatitud').value = ''
    document.getElementById('activoLongitud').value = ''
    document.getElementById('activoDatosTecnicos').value = ''
    
    modal.style.display = 'flex'
    
    setTimeout(() => setupCoordenadas(), 50)
    
    const btnGuardar = document.getElementById('btnGuardarActivo')
    const btnCancelar = document.getElementById('btnCancelarActivo')
    
    const guardarHandler = async () => {
        const datos = {
            nombre: document.getElementById('activoNombre').value.trim(),
            tipoAcceso: document.getElementById('activoTipoAcceso').value,
            ubicacion: document.getElementById('activoUbicacion').value,
            contacto: document.getElementById('activoContacto').value,
            horaApertura: document.getElementById('activoHoraApertura').value,
            horaCierre: document.getElementById('activoHoraCierre').value,
            direccion: document.getElementById('activoDireccion').value,
            localidad: document.getElementById('activoLocalidad').value,
            codigoPostal: document.getElementById('activoCodigoPostal').value,
            instrucciones: document.getElementById('activoInstrucciones').value,
            latitud: document.getElementById('activoLatitud').value || null,
            longitud: document.getElementById('activoLongitud').value || null,
            datosTecnicos: document.getElementById('activoDatosTecnicos').value || null
        }
        
        if (!datos.nombre) {
            mostrarMensaje('El nombre del activo es obligatorio', 'error')
            return
        }
        
        await clientesModule.crearActivo(datos, clienteId)
        modal.style.display = 'none'
        mostrarActivosCliente(clienteId)
        
        btnGuardar.removeEventListener('click', guardarHandler)
        btnCancelar.removeEventListener('click', cancelarHandler)
    }
    
    const cancelarHandler = () => {
        modal.style.display = 'none'
        btnGuardar.removeEventListener('click', guardarHandler)
        btnCancelar.removeEventListener('click', cancelarHandler)
    }
    
    const newBtnGuardar = btnGuardar.cloneNode(true)
    const newBtnCancelar = btnCancelar.cloneNode(true)
    btnGuardar.parentNode.replaceChild(newBtnGuardar, btnGuardar)
    btnCancelar.parentNode.replaceChild(newBtnCancelar, btnCancelar)
    
    newBtnGuardar.addEventListener('click', guardarHandler)
    newBtnCancelar.addEventListener('click', cancelarHandler)
    
    modal.onclick = (e) => { if (e.target === modal) cancelarHandler() }
}

async function mostrarModalEditarActivo(activoId, clienteId) {
    const activos = await clientesModule.cargarActivos(clienteId)
    const activo = activos.find(a => a.id === activoId)
    if (!activo) return
    
    const modal = document.getElementById('modalActivo')
    if (!modal) return
    
    document.getElementById('modalActivoTitulo').innerHTML = '✏️ Editar Activo'
    document.getElementById('activoId').value = activo.id
    document.getElementById('activoNombre').value = activo.nombre || ''
    document.getElementById('activoTipoAcceso').value = activo.tipo_acceso || 'libre'
    document.getElementById('activoUbicacion').value = activo.ubicacion || ''
    document.getElementById('activoContacto').value = activo.contacto || ''
    document.getElementById('activoHoraApertura').value = activo.hora_apertura || ''
    document.getElementById('activoHoraCierre').value = activo.hora_cierre || ''
    document.getElementById('activoDireccion').value = activo.direccion || ''
    document.getElementById('activoLocalidad').value = activo.localidad || ''
    document.getElementById('activoCodigoPostal').value = activo.codigo_postal || ''
    document.getElementById('activoInstrucciones').value = activo.instrucciones_acceso || ''
    document.getElementById('activoLatitud').value = activo.latitud || ''
    document.getElementById('activoLongitud').value = activo.longitud || ''
    document.getElementById('activoDatosTecnicos').value = activo.datos_tecnicos || ''
    
    modal.style.display = 'flex'
    
    setTimeout(() => setupCoordenadas(), 50)
    
    const btnGuardar = document.getElementById('btnGuardarActivo')
    const btnCancelar = document.getElementById('btnCancelarActivo')
    
    const guardarHandler = async () => {
        const datos = {
            nombre: document.getElementById('activoNombre').value.trim(),
            tipoAcceso: document.getElementById('activoTipoAcceso').value,
            ubicacion: document.getElementById('activoUbicacion').value,
            contacto: document.getElementById('activoContacto').value,
            horaApertura: document.getElementById('activoHoraApertura').value,
            horaCierre: document.getElementById('activoHoraCierre').value,
            direccion: document.getElementById('activoDireccion').value,
            localidad: document.getElementById('activoLocalidad').value,
            codigoPostal: document.getElementById('activoCodigoPostal').value,
            instrucciones: document.getElementById('activoInstrucciones').value,
            latitud: document.getElementById('activoLatitud').value || null,
            longitud: document.getElementById('activoLongitud').value || null,
            datosTecnicos: document.getElementById('activoDatosTecnicos').value || null
        }
        
        if (!datos.nombre) {
            mostrarMensaje('El nombre del activo es obligatorio', 'error')
            return
        }
        
        await clientesModule.actualizarActivo(activoId, datos)
        modal.style.display = 'none'
        mostrarActivosCliente(clienteId)
        
        btnGuardar.removeEventListener('click', guardarHandler)
        btnCancelar.removeEventListener('click', cancelarHandler)
    }
    
    const cancelarHandler = () => {
        modal.style.display = 'none'
        btnGuardar.removeEventListener('click', guardarHandler)
        btnCancelar.removeEventListener('click', cancelarHandler)
    }
    
    const newBtnGuardar = btnGuardar.cloneNode(true)
    const newBtnCancelar = btnCancelar.cloneNode(true)
    btnGuardar.parentNode.replaceChild(newBtnGuardar, btnGuardar)
    btnCancelar.parentNode.replaceChild(newBtnCancelar, btnCancelar)
    
    newBtnGuardar.addEventListener('click', guardarHandler)
    newBtnCancelar.addEventListener('click', cancelarHandler)
    
    modal.onclick = (e) => { if (e.target === modal) cancelarHandler() }
}

// ============================================================
// FUNCIONES DE MATERIALES, FACTURACIÓN E IMPUESTOS (placeholders)
// ============================================================

async function mostrarStockMateriales() {
    if (stockData.length === 0) {
        document.getElementById('materialesSubcontenido').innerHTML = `<div class="text-center" style="padding:40px;"><p>📦 No hay materiales</p><button id="btnAgregarMaterial" class="btn-success">➕ Agregar</button></div>`
        document.getElementById('btnAgregarMaterial')?.addEventListener('click', () => alert('Próximamente: agregar material'))
        return
    }
    let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Material</th><th>Cantidad</th><th>Precio</th><th>Proveedor</th><th>Stock mínimo</th></tr></thead><tbody>`
    for (const m of stockData) {
        html += `<tr><td><strong>${escapeHtml(m.nombre)}</strong></td>
        <td>${m.cantidad} uds</span></div></td>
        <td>${formatMoney(m.precio_unitario || 0)}€</span></div></td>
        <td>${escapeHtml(m.proveedor || '-')}</span></div></td>
        <td>${m.stock_minimo || 0}</span></div></td>
        `
    }
    html += `</tbody></table><div style="margin-top:16px;"><button id="btnAgregarMaterial" class="btn-success">➕ Agregar</button></div></div>`
    document.getElementById('materialesSubcontenido').innerHTML = html
    document.getElementById('btnAgregarMaterial')?.addEventListener('click', () => alert('Próximamente: agregar material'))
}

async function mostrarGastosMateriales() {
    if (gastosData.length === 0) {
        document.getElementById('materialesSubcontenido').innerHTML = `<div class="text-center" style="padding:40px;"><p>💰 No hay gastos</p><button id="btnRegistrarGasto" class="btn-success">➕ Registrar</button></div>`
        document.getElementById('btnRegistrarGasto')?.addEventListener('click', () => alert('Próximamente: registrar gasto'))
        return
    }
    let total = 0
    for (const g of gastosData) total += g.importe_total || 0
    let html = `<div class="card" style="margin-bottom:16px;"><div class="card-header">📊 Total gastos: ${formatMoney(total)}€</div></div>`
    html += `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Proveedor</th><th>Factura</th><th>Fecha</th><th>Importe</th></tr></thead><tbody>`
    for (const g of gastosData) {
        html += `<tr><td>${escapeHtml(g.proveedor)}</span></div></td>
        <td>${escapeHtml(g.numero_factura || '-')}</span></div></td>
        <td>${formatearFecha(g.fecha)}</span></div></td>
        <td>${formatMoney(g.importe_total || 0)}€</span></div></td>
        `
    }
    html += `</tbody></table><div style="margin-top:16px;"><button id="btnRegistrarGasto" class="btn-success">➕ Registrar</button></div>`
    document.getElementById('materialesSubcontenido').innerHTML = html
    document.getElementById('btnRegistrarGasto')?.addEventListener('click', () => alert('Próximamente: registrar gasto'))
}

async function mostrarIngresos() {
    if (facturasData.length === 0) {
        document.getElementById('facturacionSubcontenido').innerHTML = `<div class="text-center" style="padding:40px;"><p>📈 No hay facturas</p><button id="btnNuevaFactura" class="btn-success">➕ Nueva</button></div>`
        document.getElementById('btnNuevaFactura')?.addEventListener('click', () => alert('Próximamente: nueva factura'))
        return
    }
    let total = 0, cobrado = 0
    for (const f of facturasData) { total += f.importe_total; cobrado += f.total_cobrado || 0 }
    let html = `<div class="card" style="margin-bottom:16px;"><div class="card-header">💰 Total facturado: ${formatMoney(total)}€ | Cobrado: ${formatMoney(cobrado)}€ | Pendiente: ${formatMoney(total - cobrado)}€</div></div>`
    html += `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Nº</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>`
    for (const f of facturasData) {
        html += `<td><td><strong>${escapeHtml(f.numero_factura)}</strong></td><td>${escapeHtml(f.cliente_nombre || '-')}</td><td>${formatearFecha(f.fecha_expedicion)}</td><td>${formatMoney(f.importe_total)}€</td><td>${f.estado === 'pagada' ? '<span class="badge badge-activo">✅ Pagada</span>' : '<span class="badge badge-pendiente">⏳ Pendiente</span>'}</td></tr>`
    }
    html += `</tbody></table><div style="margin-top:16px;"><button id="btnNuevaFactura" class="btn-success">➕ Nueva</button></div>`
    document.getElementById('facturacionSubcontenido').innerHTML = html
    document.getElementById('btnNuevaFactura')?.addEventListener('click', () => alert('Próximamente: nueva factura'))
}

async function mostrarPagos() {
    if (pagosData.length === 0) {
        document.getElementById('facturacionSubcontenido').innerHTML = `<div class="text-center" style="padding:40px;"><p>💳 No hay pagos</p></div>`
        return
    }
    let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Concepto</th><th>Beneficiario</th><th>Importe</th><th>Fecha</th></tr></thead><tbody>`
    for (const p of pagosData) {
        const importe = p.total_general || p.importe_total || 0
        html += `<tr><td>${p.tipo === 'tecnico' ? 'Pago a técnico' : 'Compra proveedor'}</td><td>${escapeHtml(p.tecnicos?.nombre || p.proveedor || '-')}</td><td>${formatMoney(importe)}€</td><td>${formatearFecha(p.created_at || p.fecha)}</td></tr>`
    }
    html += `</tbody></table>`
    document.getElementById('facturacionSubcontenido').innerHTML = html
}

async function mostrarIRPF() {
    const año = new Date().getFullYear()
    document.getElementById('impuestosSubcontenido').innerHTML = `
        <div class="card" style="margin-top:16px;"><div class="card-header">📋 IRPF - Modelo 130</div>
        <div class="row-flex"><div class="grupo"><label>Año</label><select id="irpfAnio"><option value="${año}">${año}</option><option value="${año-1}">${año-1}</option></select></div>
        <div class="grupo"><label>Trimestre</label><select id="irpfTrimestre"><option value="1">1er Trimestre</option><option value="2">2o Trimestre</option><option value="3">3er Trimestre</option><option value="4">4o Trimestre</option></select></div>
        <button id="btnCalcularIRPF" class="btn-success">Calcular</button></div>
        <div id="irpfResultado" class="text-center" style="padding:20px;">Selecciona período y calcula</div></div>`
    
    document.getElementById('btnCalcularIRPF')?.addEventListener('click', async () => {
        const anio = document.getElementById('irpfAnio').value
        const trimestre = document.getElementById('irpfTrimestre').value
        const resultado = await impuestosModule.calcularIRPF(currentEmpresaId, trimestre, anio)
        if (resultado) {
            document.getElementById('irpfResultado').innerHTML = `<div style="background:#f0fdf4;padding:20px;border-radius:16px;">
                <p><strong>Período:</strong> ${resultado.periodo}</p>
                <p><strong>Ingresos:</strong> ${formatMoney(resultado.totalIngresos)}€</p>
                <p><strong>Gastos:</strong> ${formatMoney(resultado.totalGastos)}€</p>
                <p><strong>Rendimiento neto:</strong> ${formatMoney(resultado.rendimientoNeto)}€</p>
                <p><strong style="font-size:18px;">20% a pagar: ${formatMoney(resultado.pagoFraccionado)}€</strong></p></div>`
        }
    })
}

async function mostrarIVA() {
    const año = new Date().getFullYear()
    document.getElementById('impuestosSubcontenido').innerHTML = `
        <div class="card" style="margin-top:16px;"><div class="card-header">📋 IVA - Modelo 303</div>
        <div class="row-flex"><div class="grupo"><label>Año</label><select id="ivaAnio"><option value="${año}">${año}</option><option value="${año-1}">${año-1}</option></select></div>
        <div class="grupo"><label>Trimestre</label><select id="ivaTrimestre"><option value="1">1er Trimestre</option><option value="2">2o Trimestre</option><option value="3">3er Trimestre</option><option value="4">4o Trimestre</option></select></div>
        <button id="btnCalcularIVA" class="btn-success">Calcular</button></div>
        <div id="ivaResultado" class="text-center" style="padding:20px;">Selecciona período y calcula</div></div>`
    
    document.getElementById('btnCalcularIVA')?.addEventListener('click', async () => {
        const anio = document.getElementById('ivaAnio').value
        const trimestre = document.getElementById('ivaTrimestre').value
        const resultado = await impuestosModule.calcularIVA(currentEmpresaId, trimestre, anio)
        if (resultado) {
            const resultadoClass = resultado.resultado >= 0 ? 'badge-inactivo' : 'badge-activo'
            const resultadoTexto = resultado.resultado >= 0 ? `${formatMoney(resultado.resultado)}€ a ingresar` : `${formatMoney(Math.abs(resultado.resultado))}€ a devolver`
            document.getElementById('ivaResultado').innerHTML = `<div style="background:#f0fdf4;padding:20px;border-radius:16px;">
                <p><strong>Período:</strong> ${resultado.periodo}</p>
                <p><strong>Ingresos - Base:</strong> ${formatMoney(resultado.totalBaseIngresos)}€ | <strong>IVA:</strong> ${formatMoney(resultado.totalIvaIngresos)}€</p>
                <p><strong>Gastos - Base:</strong> ${formatMoney(resultado.totalBaseGastos)}€ | <strong>IVA:</strong> ${formatMoney(resultado.totalIvaGastos)}€</p>
                <p><strong>Resultado:</strong> <span class="badge ${resultadoClass}" style="font-size:16px;">${resultadoTexto}</span></p></div>`
        }
    })
}

// ============================================================
// FUNCIONES CRUD DE TAREAS
// ============================================================

async function guardarNuevaTarea() {
    const clienteId = document.getElementById('tareaCliente')?.value
    const tecnicoId = document.getElementById('tareaTecnico')?.value || null
    const prioridad = document.getElementById('tareaPrioridad')?.value
    const titulo = document.getElementById('tareaTitulo')?.value.trim()
    const descripcion = document.getElementById('tareaDescripcion')?.value.trim()
    const ordenTrabajo = document.getElementById('tareaOrdenTrabajo')?.value.trim()
    
    if (!clienteId || !titulo) { mostrarMensaje('Completa los campos obligatorios', 'error'); return }
    const nuevaTarea = await tareasModule.crearTarea({ clienteId, tecnicoId, titulo, descripcion, prioridad, ordenTrabajo })
    if (nuevaTarea) { await cargarDatosIniciales(); localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() }
}

async function guardarEdicionTarea() {
    const tareaId = document.getElementById('editTareaId')?.value
    const clienteId = document.getElementById('editTareaCliente')?.value
    const tecnicoId = document.getElementById('editTareaTecnico')?.value || null
    const prioridad = document.getElementById('editTareaPrioridad')?.value
    const titulo = document.getElementById('editTareaTitulo')?.value.trim()
    const descripcion = document.getElementById('editTareaDescripcion')?.value.trim()
    const ordenTrabajo = document.getElementById('editTareaOrdenTrabajo')?.value.trim()
    const estado = document.getElementById('editTareaEstado')?.value
    
    const exito = await tareasModule.actualizarTarea(tareaId, { clienteId, tecnicoId, titulo, descripcion, prioridad, ordenTrabajo, estado })
    if (exito) { await cargarDatosIniciales(); localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() }
}

async function abrirModalAsignar(tareaId) {
    const tarea = tareasData.find(t => t.id === tareaId)
    if (!tarea) return
    const tecnicosOptions = tecnicosInternosData.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `<div class="modal-content" style="max-width:450px;"><h3>🔄 Reasignar: ${escapeHtml(tarea.titulo)}</h3>
        <div class="form-group"><label>👨‍🔧 Técnico</label><select id="asignarTecnico">${tecnicosOptions}</select></div>
        <div class="form-group"><label>Motivo</label><textarea id="asignarMotivo" rows="2"></textarea></div>
        <div class="modal-buttons"><button id="btnConfirmarAsignar" class="btn-aceptar">✅ Asignar</button><button id="btnCancelarAsignar" class="btn-cancelar">Cancelar</button></div></div>`
    document.body.appendChild(modal)
    
    document.getElementById('btnConfirmarAsignar').onclick = async () => {
        const nuevoTecnicoId = document.getElementById('asignarTecnico').value
        const motivo = document.getElementById('asignarMotivo').value
        if (!nuevoTecnicoId) { mostrarMensaje('Selecciona un técnico', 'error'); return }
        const exito = await tareasModule.asignarTarea(tareaId, nuevoTecnicoId, motivo)
        if (exito) { modal.remove(); await cargarDatosIniciales(); renderizarPanel() }
    }
    document.getElementById('btnCancelarAsignar').onclick = () => modal.remove()
}

// ============================================================
// ASIGNAR EVENTOS DE SUBMÓDULOS
// ============================================================

function asignarEventosSubmodulos() {
    // Tareas
    document.getElementById('btnCrearTareaLista')?.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'crear'); renderizarPanel() })
    document.getElementById('btnVolverTareas')?.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() })
    document.getElementById('btnGuardarTarea')?.addEventListener('click', guardarNuevaTarea)
    document.getElementById('btnCancelarTarea')?.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() })
    document.getElementById('btnGuardarEdicion')?.addEventListener('click', guardarEdicionTarea)
    document.getElementById('btnCancelarEdicion')?.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() })
    document.getElementById('btnEditarTarea')?.addEventListener('click', () => { const id = localStorage.getItem('gerente_tarea_detalle'); localStorage.setItem('gerente_tareas_subvista', 'editar'); localStorage.setItem('gerente_tarea_editar', id); renderizarPanel() })
    document.getElementById('btnAsignarTarea')?.addEventListener('click', () => { const id = localStorage.getItem('gerente_tarea_detalle'); abrirModalAsignar(id) })
    document.getElementById('btnCerrarDetalle')?.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'lista'); renderizarPanel() })
    
    document.querySelectorAll('.ver-tarea').forEach(btn => btn.addEventListener('click', () => { localStorage.setItem('gerente_tareas_subvista', 'detalle'); localStorage.setItem('gerente_tarea_detalle', btn.dataset.id); renderizarPanel() }))
    document.querySelectorAll('.asignar-tarea').forEach(btn => btn.addEventListener('click', () => abrirModalAsignar(btn.dataset.id)))
    
    // Personal
    document.querySelectorAll('[data-subtab]').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem('gerente_personal_subvista', btn.dataset.subtab)
            renderizarPanel()
        })
    })
    
    // Clientes
    document.getElementById('btnAltaCliente')?.addEventListener('click', () => mostrarAltaCliente())
    document.getElementById('btnVolverClientes')?.addEventListener('click', () => {
        localStorage.setItem('gerente_clientes_subvista', 'lista')
        renderizarPanel()
    })
    
    // Materiales
    document.getElementById('btnStockMateriales')?.addEventListener('click', () => mostrarStockMateriales())
    document.getElementById('btnGastosMateriales')?.addEventListener('click', () => mostrarGastosMateriales())
    
    // Facturación
    document.getElementById('btnIngresos')?.addEventListener('click', () => mostrarIngresos())
    document.getElementById('btnPagos')?.addEventListener('click', () => mostrarPagos())
    
    // Impuestos
    document.getElementById('btnIRPF')?.addEventListener('click', () => mostrarIRPF())
    document.getElementById('btnIVA')?.addEventListener('click', () => mostrarIVA())
}

export default { init }