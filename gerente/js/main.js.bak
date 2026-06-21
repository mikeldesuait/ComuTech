// gerente/js/main.js
// Punto de entrada principal del panel gerente - VERSIÓN COMPLETA CON DEEPSEEK

import { sb } from './config/supabase.js'
import { 
    hacerLogin, cerrarSesion, verificarSesion, 
    getCurrentUser, getCurrentPerfil, getCurrentEmpresaId 
} from './modules/auth.js'
import { 
    mostrarMensaje, formatearFecha, formatearFechaHora, 
    escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga,
    mostrarModalConfirmacion, mostrarModalInformativo,
    getEstadoBadge, getPrioridadBadge, getEstadoLabel,
    getEstadosDisponibles, getEstadoColor, getEstadoIcono
} from './modules/utils.js'
import { ESTADOS_TAREA } from './modules/tareas.js'

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

// Variables para servicios y tipos
let serviciosData = []
let tiposTareaData = []
let plantillasData = []

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
    
    // Cargar servicios, tipos y plantillas
    serviciosData = await tareasModule.cargarServicios()
    tiposTareaData = await tareasModule.cargarTiposTarea()
    plantillasData = await tareasModule.cargarPlantillasTarea(currentEmpresaId)
    
    console.log('📋 Servicios cargados:', serviciosData.length)
    console.log('📋 Tipos de tarea cargados:', tiposTareaData.length)
    console.log('📋 Plantillas cargadas:', plantillasData.length)
    
    tareasData = await tareasModule.cargarTareas(currentEmpresaId)
    
    tecnicosInternosData = await personalModule.cargarTecnicosInternos(currentEmpresaId)
    console.log('📋 Técnicos internos cargados:', tecnicosInternosData.length)
    
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
// RENDERIZADO DE TAREAS (ACTUALIZADO)
// ============================================================

async function renderizarTareas() {
    const subvista = localStorage.getItem('gerente_tareas_subvista') || 'lista'
    
    if (subvista === 'crear') {
        const { renderizarFormularioCrear } = tareasModule
        const tecnicos = await tareasModule.cargarTecnicos(currentEmpresaId)
        const clientes = await tareasModule.cargarClientesDeEmpresa(currentEmpresaId)
        
        // Recargar servicios y tipos para el formulario
        const servicios = await tareasModule.cargarServicios()
        const tiposTarea = await tareasModule.cargarTiposTarea()
        const plantillas = await tareasModule.cargarPlantillasTarea(currentEmpresaId)
        
        return `<div class="container">
            <div class="card">
                <div class="card-header">📋 Tareas
                    <button id="btnVolverTareas" class="btn-warning" style="float:right;">◀ Volver</button>
                </div>
                ${renderizarFormularioCrear(clientes, tecnicos, servicios, tiposTarea, plantillas)}
            </div>
        </div>`
    }
    
    if (subvista === 'detalle') {
        const tareaId = localStorage.getItem('gerente_tarea_detalle')
        const tarea = tareasData.find(t => t.id === tareaId)
        if (tarea) {
            return await renderizarDetalleTarea(tarea)
        }
    }
    
    return await renderizarListaTareas()
}

// ============================================================
// RENDERIZAR LISTA DE TAREAS CON RESUMEN, FILTROS Y BÚSQUEDA
// ============================================================

async function renderizarListaTareas() {
    const { renderizarListaTareas } = tareasModule
    
    const tareasRecargadas = await tareasModule.cargarTareas(currentEmpresaId)
    tareasData = tareasRecargadas
    
    console.log('📋 Tareas recargadas:', tareasData.length)
    
    const tecnicos = await tareasModule.cargarTecnicos(currentEmpresaId)
    const clientes = clientesData || []
    const activos = activosData || []
    
    const html = renderizarListaTareas(tareasData, null, null, tecnicos, clientes, activos)
    
    return `<div class="container" id="tareasContainer">${html}</div>`
}

// ============================================================
// ENRIQUECER DESCRIPCIÓN CON DEEPSEEK
// ============================================================

async function enriquecerDescripcion(servicio, tipo, descripcion, cliente, activo) {
    try {
        const { data: session } = await sb.auth.getSession()
        
        const response = await fetch(
            `https://idbdkxhhqeuarcqcaweo.supabase.co/functions/v1/enriquecer-tarea`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    servicio: servicio || '',
                    tipo: tipo || '',
                    descripcion: descripcion || '',
                    cliente: cliente || '',
                    activo: activo || ''
                })
            }
        )
        
        const result = await response.json()
        
        if (!response.ok) {
            console.error('Error en enriquecer-tarea:', result)
            return null
        }
        
        return result.enriquecido || null
    } catch (error) {
        console.error('Error llamando a enriquecer-tarea:', error)
        return null
    }
}

// ============================================================
// ✅ NUEVO: RENDERIZAR DETALLE DE TAREA CON CAMBIO DE ESTADO
// ============================================================

// ============================================================
// ✅ NUEVO: RENDERIZAR DETALLE DE TAREA CON EDITOR DE DESCRIPCIÓN
// ============================================================

async function renderizarDetalleTarea(tarea) {
    const { renderizarDetalleTarea, cambiarEstadoTarea, reasignarTarea } = tareasModule
    
    const historial = await tareasModule.getHistorialAsignaciones(tarea.id)
    const historialEstados = await tareasModule.getHistorialEstados(tarea.id)
    
    // ✅ Obtener activo y dirección desde la base de datos
    const activoNombre = tarea.activos?.nombre || 'No especificado'
    const activoDireccion = tarea.activos?.direccion || 'Sin dirección'
    const activoLocalidad = tarea.activos?.localidad || ''
    const activoContacto = tarea.activos?.contacto || ''
    const ubicacionCompleta = activoDireccion + (activoLocalidad ? `, ${activoLocalidad}` : '')
    
    // ✅ Si la descripción contiene HTML, mostrarla como HTML
    const descripcionHTML = tarea.descripcion?.includes('<div') 
        ? tarea.descripcion 
        : `<p>${escapeHtml(tarea.descripcion || '-')}</p>`
    
    return `<div class="container">
        <div class="card">
            <div class="card-header">
                📋 ${escapeHtml(tarea.numero_tarea)} - ${escapeHtml(tarea.titulo)}
                <div style="float:right;">
                    <button id="btnVolverTareas" class="btn-warning" style="margin-right:8px;">◀ Volver</button>
                    <button id="btnReasignarTarea" class="btn-info" style="background:#e67e22;">🔄 Reasignar</button>
                    <button id="btnEditarDescripcion" class="btn-info" style="background:#0284c7;">✏️ Editar descripción</button>
                </div>
            </div>
            
            <div style="background:var(--ios-bg); padding:16px; border-radius:12px;">
                <div class="row-flex">
                    <div class="grupo"><strong>Cliente:</strong> ${escapeHtml(tarea.cliente?.nombre || '-')}</div>
                    <div class="grupo"><strong>Técnico:</strong> ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}</div>
                </div>
                <div class="row-flex">
                    <div class="grupo"><strong>Servicio:</strong> ${tarea.servicio?.icono || ''} ${escapeHtml(tarea.servicio?.nombre || '-')}</div>
                    <div class="grupo"><strong>Tipo:</strong> ${escapeHtml(tarea.tipo_tarea?.nombre || '-')}</div>
                </div>
                
                <!-- ✅ UBICACIÓN DEL ACTIVO (desde base de datos) -->
                <div class="orden-ubicacion" style="background:#e0f2fe; padding:12px 16px; border-radius:8px; margin-bottom:12px; border-left:4px solid #0284c7;">
                    <h4 style="margin:0 0 4px 0; font-size:13px; color:#0369a1;">📍 Ubicación del activo</h4>
                    <p style="margin:2px 0; font-size:13px; color:#0c4a6e;">
                        <strong>Activo:</strong> ${escapeHtml(activoNombre)}
                    </p>
                    <p style="margin:2px 0; font-size:13px; color:#0c4a6e;">
                        <strong>Dirección:</strong> ${escapeHtml(ubicacionCompleta || 'Sin dirección')}
                    </p>
                    ${activoContacto ? `<p style="margin:2px 0; font-size:13px; color:#0c4a6e;"><strong>Contacto:</strong> ${escapeHtml(activoContacto)}</p>` : ''}
                </div>
                
                <div class="row-flex">
                    <div class="grupo"><strong>Prioridad:</strong> ${getPrioridadBadge(tarea.prioridad)}</div>
                    <div class="grupo"><strong>Estado:</strong> ${getEstadoBadge(tarea.estado)}</div>
                </div>
                <div class="row-flex">
                    <div class="grupo"><strong>Fecha creación:</strong> ${formatearFecha(tarea.created_at)}</div>
                    <div class="grupo"><strong>Fecha límite:</strong> ${formatearFecha(tarea.fecha_fin_prevista) || 'Sin fecha'}</div>
                </div>
                ${tarea.fecha_aceptacion ? `<div><strong>Fecha aceptación:</strong> ${formatearFecha(tarea.fecha_aceptacion)}</div>` : ''}
                ${tarea.fecha_desplazamiento ? `<div><strong>Inicio desplazamiento:</strong> ${formatearFecha(tarea.fecha_desplazamiento)}</div>` : ''}
                ${tarea.fecha_llegada ? `<div><strong>Llegada al sitio:</strong> ${formatearFecha(tarea.fecha_llegada)}</div>` : ''}
                ${tarea.fecha_fin_trabajo ? `<div><strong>Finalización:</strong> ${formatearFecha(tarea.fecha_fin_trabajo)}</div>` : ''}
                ${tarea.tiempo_estimado_minutos ? `<div><strong>Tiempo estimado:</strong> ${tarea.tiempo_estimado_minutos} min</div>` : ''}
                ${tarea.tiempo_real_minutos ? `<div><strong>Tiempo real:</strong> ${tarea.tiempo_real_minutos} min</div>` : ''}
                ${tarea.motivo_suspension ? `<div><strong>Motivo suspensión:</strong> ${escapeHtml(tarea.motivo_suspension)}</div>` : ''}
                
                <div style="margin-top:12px;">
                    <strong>📋 Descripción / Instrucciones:</strong>
                    <div id="descripcionContainer" class="descripcion-container" style="margin-top:8px;">
                        ${descripcionHTML}
                    </div>
                    <div id="editorDescripcion" style="display:none; margin-top:12px;">
                        <textarea id="textoDescripcion" rows="12" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--ios-border); font-family:monospace; font-size:14px;">${escapeHtml(tarea.descripcion || '')}</textarea>
                        <div style="display:flex; gap:12px; margin-top:8px;">
                            <button id="btnGuardarDescripcion" class="btn-success">💾 Guardar</button>
                            <button id="btnCancelarEdicionDescripcion" class="btn-danger">✖ Cancelar</button>
                            <button id="btnRegenerarDescripcion" class="btn-info" style="background:#8b5cf6;">🔄 Regenerar con IA</button>
                        </div>
                    </div>
                </div>
            </div>
            
            ${getEstadosDisponibles(tarea.estado).length > 0 ? `
            <div style="margin-top:16px; padding:16px; background:#f8fafc; border-radius:12px;">
                <strong>🔄 Cambiar estado:</strong>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                    ${getEstadosDisponibles(tarea.estado).map(e => `
                        <button class="btn-sm btn-cambiar-estado" 
                                data-tarea-id="${tarea.id}"
                                data-estado="${e.value}" 
                                style="background:#2c7a4d; color:white;">
                            ${e.label}
                        </button>
                    `).join('')}
                </div>
            </div>` : ''}
            
            ${historialEstados && historialEstados.length > 0 ? `
            <div class="card" style="margin-top:16px;">
                <div class="card-header">📜 Historial de estados</div>
                ${historialEstados.slice(0, 10).map(h => `
                    <div style="padding:6px 0; border-bottom:1px solid var(--ios-border); font-size:13px;">
                        <span class="badge ${getEstadoBadgeClass(h.estado_nuevo)}">${getEstadoLabel(h.estado_nuevo)}</span>
                        <span style="color:#6b7280;">${formatearFecha(h.fecha)}</span>
                        ${h.comentario ? `<span style="color:#6b7280;">- ${escapeHtml(h.comentario)}</span>` : ''}
                        <span style="color:#6b7280; font-size:11px;">(${h.usuario_tipo})</span>
                    </div>
                `).join('')}
            </div>` : ''}
            
            ${historial && historial.length > 0 ? `
            <div class="card" style="margin-top:16px;">
                <div class="card-header">🔄 Historial de asignaciones</div>
                ${historial.slice(0, 10).map(h => `
                    <div style="padding:6px 0; border-bottom:1px solid var(--ios-border); font-size:13px;">
                        ${h.tipo === 'asignacion' ? '📌 Asignada' : '🔄 Reasignada'} a 
                        ${escapeHtml(h.tecnico?.nombre_razon_social || '?')} 
                        el ${formatearFecha(h.fecha_asignacion)}
                        ${h.motivo ? `<br><span style="color:#6b7280;">Motivo: ${escapeHtml(h.motivo)}</span>` : ''}
                    </div>
                `).join('')}
            </div>` : ''}
        </div>
    </div>`
}

function getEstadoBadgeClass(estado) {
    const clases = {
        'pendiente_aceptacion': 'badge-pendiente',
        'vista': 'badge-info',
        'aceptada': 'badge-activo',
        'rechazada': 'badge-inactivo',
        'en_desplazamiento': 'badge-warning',
        'trabajando_onsite': 'badge-info',
        'terminada': 'badge-completada',
        'suspendida': 'badge-danger',
        'cancelada': 'badge-cancelada'
    }
    return clases[estado] || 'badge-pendiente'
}

// ============================================================
// ✅ NUEVO: FUNCIÓN PARA CAMBIAR ESTADO DESDE EL DETALLE
// ============================================================

async function handleCambiarEstado(tareaId, nuevoEstado) {
    const { cambiarEstadoTarea } = tareasModule
    
    if (nuevoEstado === ESTADOS_TAREA.SUSPENDIDA) {
        const motivo = prompt('📝 Motivo de la suspensión:')
        if (!motivo) {
            mostrarMensaje('Debes indicar un motivo', 'error')
            return
        }
        const exito = await cambiarEstadoTarea(tareaId, nuevoEstado, motivo, 'gerente')
        if (exito) {
            await cargarDatosIniciales()
            await renderizarPanel()
        }
        return
    }
    
    const estadoLabel = getEstadoLabel(nuevoEstado)
    mostrarModalConfirmacion(
        `¿Confirmas el cambio de estado a "${estadoLabel}"?`,
        async () => {
            const exito = await cambiarEstadoTarea(tareaId, nuevoEstado, '', 'gerente')
            if (exito) {
                await cargarDatosIniciales()
                await renderizarPanel()
            }
        },
        `✅ Cambiar a ${estadoLabel}`,
        'Cancelar'
    )
}

// ============================================================
// ✅ NUEVO: FUNCIÓN PARA REASIGNAR TAREA
// ============================================================

async function handleReasignarTarea(tareaId) {
    const tarea = tareasData.find(t => t.id === tareaId)
    if (!tarea) {
        mostrarMensaje('Tarea no encontrada', 'error')
        return
    }
    
    const tecnicos = await tareasModule.cargarTecnicos(currentEmpresaId)
    const tecnicosOptions = tecnicos
        .filter(t => t.id !== tarea.perfil_id)
        .map(t => `<option value="${t.id}">${escapeHtml(t.nombre_razon_social)}</option>`)
        .join('')
    
    if (!tecnicosOptions) {
        mostrarMensaje('No hay otros técnicos disponibles', 'error')
        return
    }
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h3>🔄 Reasignar tarea</h3>
            <p><strong>Tarea:</strong> ${escapeHtml(tarea.titulo)} (${escapeHtml(tarea.numero_tarea)})</p>
            <p><strong>Técnico actual:</strong> ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}</p>
            <div class="form-group">
                <label>👨‍🔧 Nuevo técnico</label>
                <select id="reasignarTecnico" style="width:100%; padding:12px; border-radius:12px;">
                    <option value="">-- Seleccionar --</option>
                    ${tecnicosOptions}
                </select>
            </div>
            <div class="form-group">
                <label>📝 Motivo</label>
                <textarea id="reasignarMotivo" rows="2" placeholder="Motivo de la reasignación..."></textarea>
            </div>
            <div style="background:#fef3c7; padding:12px; border-radius:12px; margin-top:8px;">
                <small>⚠️ Al reasignar, la tarea volverá al estado <strong>"Pendiente de aceptación"</strong></small>
            </div>
            <div class="modal-buttons">
                <button id="btnConfirmarReasignar" class="btn-aceptar">✅ Reasignar</button>
                <button id="btnCancelarReasignar" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnConfirmarReasignar').onclick = async () => {
        const nuevoTecnicoId = document.getElementById('reasignarTecnico').value
        const motivo = document.getElementById('reasignarMotivo').value.trim()
        
        if (!nuevoTecnicoId) {
            mostrarMensaje('Selecciona un técnico', 'error')
            return
        }
        
        const { reasignarTarea } = tareasModule
        const exito = await reasignarTarea(tareaId, nuevoTecnicoId, motivo)
        
        if (exito) {
            modal.remove()
            await cargarDatosIniciales()
            await renderizarPanel()
        }
    }
    
    document.getElementById('btnCancelarReasignar').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

// ============================================================
// FUNCIONES DE TAREAS (CRUD) - ACTUALIZADO CON SERVICIOS, TIPOS Y DEEPSEEK
// ============================================================

async function guardarNuevaTarea() {
    const clienteId = document.getElementById('tareaCliente')?.value
    const activoId = document.getElementById('tareaActivo')?.value || null
    const tecnicoId = document.getElementById('tareaTecnico')?.value || null
    const servicioId = document.getElementById('tareaServicio')?.value || null
    const tipoTareaId = document.getElementById('tareaTipo')?.value || null
    const plantillaId = document.getElementById('tareaPlantilla')?.value || null
    const prioridad = document.getElementById('tareaPrioridad')?.value || 'media'
    const descripcion = document.getElementById('tareaDescripcion')?.value.trim()
    const fechaLimite = document.getElementById('tareaFechaLimite')?.value || null
    const tiempoEstimado = parseInt(document.getElementById('tareaTiempoEstimado')?.value) || null
    
    // ✅ Generar título automático
    let titulo = ''
    let servicio = ''
    let tipo = ''
    if (servicioId && tipoTareaId) {
        const servicioObj = serviciosData.find(s => s.id === servicioId)
        const tipoObj = tiposTareaData.find(t => t.id === tipoTareaId)
        if (servicioObj && tipoObj) {
            servicio = servicioObj.nombre
            tipo = tipoObj.nombre
            titulo = `${servicio} - ${tipo}`
        }
    }
    
    if (!titulo) {
        titulo = 'Tarea de servicio'
    }
    
    if (!clienteId || !servicioId || !tipoTareaId) {
        mostrarMensaje('Completa los campos obligatorios (Servicio, Tipo y Cliente)', 'error')
        return
    }
    
    // ✅ Obtener cliente y activo para enriquecer
    const cliente = clientesData.find(c => c.id === clienteId)
    const activo = activosData.find(a => a.id === activoId)
    
    // ✅ Enriquecer descripción con DeepSeek
    mostrarModalCarga('📝 Generando descripción profesional...')
    
    let descripcionFinal = descripcion || 'Tarea de mantenimiento'
    try {
        const enriquecida = await enriquecerDescripcion(
            servicio,
            tipo,
            descripcion || 'Tarea de mantenimiento',
            cliente?.nombre || '',
            activo?.nombre || ''
        )
        if (enriquecida) {
            descripcionFinal = enriquecida
            console.log('✅ Descripción enriquecida correctamente')
        } else {
            console.warn('⚠️ No se pudo enriquecer la descripción, usando la original')
        }
    } catch (error) {
        console.warn('⚠️ Error en enriquecimiento:', error)
    }
    
    cerrarModalCarga()
    
    const { crearTarea } = tareasModule
    const nuevaTarea = await crearTarea({
        clienteId,
        activoId,
        tecnicoId,
        servicioId,
        tipoTareaId,
        plantillaId,
        titulo,
        descripcion: descripcionFinal,
        prioridad,
        fechaLimite,
        tiempoEstimado,
        notaInterna: null,
        notaCliente: null
    })
    
    if (nuevaTarea) {
        await cargarDatosIniciales()
        localStorage.setItem('gerente_tareas_subvista', 'lista')
        await renderizarPanel()
        mostrarMensaje('✅ Tarea creada con descripción profesional', 'exito')
    }
}

// ============================================================
// PERSONAL
// ============================================================

async function renderizarPersonal() {
    const subvista = localStorage.getItem('gerente_personal_subvista') || 'internos'
    
    if (!personalModule) {
        personalModule = await import('./modules/personal.js')
    }
    
    tecnicosInternosData = await personalModule.cargarTecnicosInternos(currentEmpresaId)
    tecnicosExternosData = await personalModule.cargarTecnicosExternos(currentEmpresaId)
    vacacionesData = await personalModule.cargarVacaciones(currentEmpresaId)
    ausenciasData = await personalModule.cargarAusencias(currentEmpresaId)
    
    const html = `<div class="container"><div class="card"><div class="card-header">👥 Personal</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
            <button class="btn-sm ${subvista === 'internos' ? 'btn-success' : 'btn-info'}" data-subtab="internos">👨‍🔧 Internos (${tecnicosInternosData.length})</button>
            <button class="btn-sm ${subvista === 'externos' ? 'btn-success' : 'btn-info'}" data-subtab="externos">🔌 Externos (${tecnicosExternosData.length})</button>
            <button class="btn-sm ${subvista === 'vacaciones' ? 'btn-warning' : 'btn-info'}" data-subtab="vacaciones">🌴 Vacaciones (${vacacionesData.filter(v=>v.estado==='pendiente').length})</button>
            <button class="btn-sm ${subvista === 'ausencias' ? 'btn-danger' : 'btn-info'}" data-subtab="ausencias">⚠️ Ausencias (${ausenciasData.length})</button>
        </div>
        <div id="personalSubcontenido">${await renderizarPersonalSubvista(subvista)}</div>
    </div></div>`
    
    return html
}

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
// CLIENTES
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
            <div class="form-group"><label>🔑 Código acceso</label><input type="text" value="${escapeHtml(cliente.codigo_acceso || '')}" readonly style="background:#f1f5f9;"></div>
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
            await renderizarPanel()
        }
    }
    document.getElementById('btnCancelarEdicionCliente').onclick = () => modal.remove()
}

async function regenerarCodigoCliente(id) {
    const nuevoCodigo = await clientesModule.regenerarCodigoAcceso(id)
    if (nuevoCodigo) {
        await cargarDatosIniciales()
        await renderizarPanel()
    }
}

async function toggleAccesoCliente(id, activo) {
    const exito = await clientesModule.toggleAccesoCliente(id, !activo)
    if (exito) {
        await cargarDatosIniciales()
        await renderizarPanel()
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
    document.querySelectorAll('.editar-activo').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalEditarActivo(btn.dataset.id, clienteId))
    })
    document.querySelectorAll('.eliminar-activo').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('¿Eliminar este activo?')) {
                await clientesModule.eliminarActivo(btn.dataset.id)
                mostrarActivosCliente(clienteId)
            }
        })
    })
    document.querySelectorAll('.ver-mapa').forEach(btn => {
        btn.addEventListener('click', () => {
            const lat = parseFloat(btn.dataset.lat)
            const lon = parseFloat(btn.dataset.lon)
            const nombre = btn.dataset.nombre || 'Ubicación'
            if (lat && lon) {
                window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')
                mostrarMensaje(`📍 Abriendo mapa de ${nombre}`, 'exito')
            } else {
                mostrarMensaje('❌ Sin coordenadas', 'error')
            }
        })
    })
}

function mostrarModalCrearActivo(clienteId) {
    const modal = document.getElementById('modalActivo')
    if (!modal) return
    
    document.getElementById('modalActivoTitulo').innerHTML = '🏗️ Nuevo Activo'
    document.getElementById('activoId').value = ''
    document.getElementById('activoNombre').value = ''
    document.getElementById('activoTipoAcceso').value = 'libre'
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
// FUNCIONES DE PERSONAL
// ============================================================

async function editarTecnico(id, tipo) {
    const tecnicos = tipo === 'interno' ? tecnicosInternosData : tecnicosExternosData
    const tecnico = tecnicos.find(t => t.id === id)
    if (!tecnico) return
    
    const { renderizarModalEditarTecnico } = personalModule
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
        
        const nuevoNick = document.getElementById('editTecNick').value.trim()
        if (nuevoNick && nuevoNick !== tecnico.nick) {
            const { data: existente } = await sb
                .from('perfiles')
                .select('id')
                .eq('nick', nuevoNick)
                .neq('user_id', tecnico.user_id)
                .maybeSingle()
            
            if (existente) {
                mostrarMensaje('❌ El nick ya está en uso', 'error')
                return
            }
            
            await sb.from('perfiles').update({ nick: nuevoNick }).eq('user_id', tecnico.user_id)
            await sb.from('tecnicos').update({ nick: nuevoNick }).eq('id', id)
            
            try {
                const { data: session } = await sb.auth.getSession()
                await fetch(`${SUPABASE_URL}/functions/v1/actualizar-metadata-tecnico`, {
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
            } catch (error) {
                console.error('Error actualizando metadata:', error)
            }
        }
        
        const nuevaPassword = document.getElementById('editTecPassword').value
        if (nuevaPassword && nuevaPassword.length >= 6) {
            try {
                const { data: session } = await sb.auth.getSession()
                await fetch(`${SUPABASE_URL}/functions/v1/actualizar-password-tecnico`, {
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
                mostrarMensaje('✅ Contraseña actualizada', 'exito')
            } catch (error) {
                console.error('Error actualizando password:', error)
            }
        }
        
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
            const subvista = localStorage.getItem('gerente_personal_subvista') || 'internos'
            localStorage.setItem('gerente_personal_subvista', subvista)
            await renderizarPanel()
            mostrarMensaje('✅ Cambios guardados', 'exito')
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
        await renderizarPanel()
    }
}

function mostrarModalAgregarTecnico(tipo = 'interno') {
    const { renderizarModalAgregarTecnico } = personalModule
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3>${tipo === 'interno' ? '➕ Alta de trabajador interno' : '➕ Alta de trabajador externo'}</h3>
            ${renderizarModalAgregarTecnico(tipo)}
        </div>
    `
    document.body.appendChild(modal)
    
    const tipoSelect = document.getElementById('tecTipo')
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
    
    if (tipoSelect) tipoSelect.onchange = actualizarPreview
    if (nombreInput) nombreInput.oninput = actualizarPreview
    if (apellidoInput) apellidoInput.oninput = actualizarPreview
    if (emailInput) emailInput.oninput = actualizarPreview
    
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
            await cargarDatosIniciales()
            const subvista = localStorage.getItem('gerente_personal_subvista') || 'internos'
            localStorage.setItem('gerente_personal_subvista', subvista)
            await renderizarPanel()
        }
    }
    
    document.getElementById('btnCancelarTecnico').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

// ============================================================
// COORDENADAS
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
        
        newBtn.innerHTML = '⏳ Buscando...'
        newBtn.disabled = true
        
        try {
            let queryParts = []
            if (direccion) queryParts.push(direccion)
            if (codigoPostal) queryParts.push(codigoPostal)
            if (localidad) queryParts.push(localidad)
            queryParts.push('España')
            
            const query = encodeURIComponent(queryParts.join(', '))
            const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=1&countrycodes=es&dedupe=1`
            
            const response = await fetch(url, {
                headers: { 'User-Agent': 'COMUTECH-App/1.0' }
            })
            const data = await response.json()
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat).toFixed(6)
                const lon = parseFloat(data[0].lon).toFixed(6)
                document.getElementById('activoLatitud').value = lat
                document.getElementById('activoLongitud').value = lon
                mostrarMensaje(`✅ Coordenadas: ${lat}, ${lon}`, 'exito')
            } else {
                mostrarMensaje('❌ No se encontró la ubicación', 'error')
            }
        } catch (error) {
            console.error(error)
            mostrarMensaje('Error al obtener coordenadas', 'error')
        } finally {
            newBtn.innerHTML = '📍 Obtener coordenadas'
            newBtn.disabled = false
        }
    }
}

// ============================================================
// MATERIALES, FACTURACIÓN E IMPUESTOS (placeholders)
// ============================================================

async function renderizarMateriales() {
    return `<div class="container">
        <div class="card">
            <div class="card-header">📦 Materiales</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
                <button id="btnStockMateriales" class="btn-info">📦 Stock (${stockData.length})</button>
                <button id="btnGastosMateriales" class="btn-info">💰 Gastos (${gastosData.length})</button>
            </div>
            <div id="materialesSubcontenido">
                <div class="text-center" style="padding:40px;">Selecciona una opción</div>
            </div>
        </div>
    </div>`
}

async function renderizarFacturacion() {
    return `<div class="container">
        <div class="card">
            <div class="card-header">💰 Facturación</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
                <button id="btnIngresos" class="btn-info">📈 Ingresos (${facturasData.length})</button>
                <button id="btnPagos" class="btn-info">💳 Pagos (${pagosData.length})</button>
            </div>
            <div id="facturacionSubcontenido">
                <div class="text-center" style="padding:40px;">Selecciona una opción</div>
            </div>
        </div>
    </div>`
}

async function renderizarImpuestos() {
    return `<div class="container">
        <div class="card">
            <div class="card-header">📊 Impuestos</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
                <button id="btnIRPF" class="btn-info">📋 IRPF</button>
                <button id="btnIVA" class="btn-info">📋 IVA</button>
            </div>
            <div id="impuestosSubcontenido">
                <div class="text-center" style="padding:40px;">Selecciona una opción</div>
            </div>
        </div>
    </div>`
}

async function mostrarStockMateriales() {
    if (stockData.length === 0) {
        document.getElementById('materialesSubcontenido').innerHTML = `<div class="text-center" style="padding:40px;"><p>📦 No hay materiales</p><button id="btnAgregarMaterial" class="btn-success">➕ Agregar</button></div>`
        document.getElementById('btnAgregarMaterial')?.addEventListener('click', () => alert('Próximamente: agregar material'))
        return
    }
    let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Material</th><th>Cantidad</th><th>Precio</th><th>Proveedor</th><th>Stock mínimo</th></tr></thead><tbody>`
    for (const m of stockData) {
        html += `<tr><td><strong>${escapeHtml(m.nombre)}</strong></td>
        <td>${m.cantidad} uds</td>
        <td>${formatMoney(m.precio_unitario || 0)}€</td>
        <td>${escapeHtml(m.proveedor || '-')}</td>
        <td>${m.stock_minimo || 0}</td></tr>`
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
        html += `<tr><td>${escapeHtml(g.proveedor)}</td><td>${escapeHtml(g.numero_factura || '-')}</td><td>${formatearFecha(g.fecha)}</td><td>${formatMoney(g.importe_total || 0)}€</td></tr>`
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
        html += `<tr><td><strong>${escapeHtml(f.numero_factura)}</strong></td><td>${escapeHtml(f.cliente_nombre || '-')}</td><td>${formatearFecha(f.fecha_expedicion)}</td><td>${formatMoney(f.importe_total)}€</td><td>${f.estado === 'pagada' ? '<span class="badge badge-activo">✅ Pagada</span>' : '<span class="badge badge-pendiente">⏳ Pendiente</span>'}</td></tr>`
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
// EVENTOS DE FILTROS DE TAREAS
// ============================================================

function asignarEventosFiltrosTareas() {
    const filtros = {
        busqueda: '',
        estado: 'todos',
        tecnico: 'todos',
        cliente: 'todos',
        prioridad: 'todos',
        fecha: 'todos'
    }
    
    function aplicarFiltrosYActualizar() {
        if (!tareasModule || typeof tareasModule.aplicarFiltrosTareas !== 'function') {
            setTimeout(aplicarFiltrosYActualizar, 500)
            return
        }
        
        const { aplicarFiltrosTareas } = tareasModule
        
        const buscarInput = document.getElementById('buscarTarea')
        const estadoSelect = document.getElementById('filtroEstadoTarea')
        const tecnicoSelect = document.getElementById('filtroTecnicoTarea')
        const clienteSelect = document.getElementById('filtroClienteTarea')
        const prioridadSelect = document.getElementById('filtroPrioridadTarea')
        const fechaSelect = document.getElementById('filtroFechaTarea')
        
        filtros.busqueda = buscarInput?.value || ''
        filtros.estado = estadoSelect?.value || 'todos'
        filtros.tecnico = tecnicoSelect?.value || 'todos'
        filtros.cliente = clienteSelect?.value || 'todos'
        filtros.prioridad = prioridadSelect?.value || 'todos'
        filtros.fecha = fechaSelect?.value || 'todos'
        
        const resultado = aplicarFiltrosTareas(tareasData, filtros)
        
        const contador = document.getElementById('contadorResultados')
        if (contador) contador.textContent = resultado.length
        
        const resultadosSpan = document.getElementById('resultadosBusqueda')
        if (resultadosSpan) {
            resultadosSpan.textContent = resultado.length > 0 ? `(${resultado.length})` : ''
        }
        
        const container = document.getElementById('tablaTareasContainer')
        if (container) {
            if (typeof tareasModule.renderizarTablaTareas === 'function') {
                container.innerHTML = tareasModule.renderizarTablaTareas(resultado)
            } else {
                let html = `<table class="data-table"><thead><tr>
                    <th>Nº Tarea</th><th>Título</th><th>Cliente / Activo</th>
                    <th>Técnico</th><th>Prioridad</th><th>Estado</th>
                    <th>Fecha límite</th><th>Acciones</th>
                </tr></thead><tbody>`
                
                for (const t of resultado) {
                    const tecnicoNombre = t.perfiles?.nombre_razon_social || 'Sin asignar'
                    const clienteNombre = t.cliente?.nombre || '-'
                    const puedeReasignar = !['terminada', 'cancelada'].includes(t.estado)
                    
                    html += `<tr>
                        <td><strong>${escapeHtml(t.numero_tarea)}</strong></td>
                        <td>${escapeHtml(t.titulo)}</td>
                        <td>${escapeHtml(clienteNombre)}${t.activos?.nombre ? `<br><small style="color:var(--ios-gray);">🏗️ ${escapeHtml(t.activos.nombre)}</small>` : ''}</td>
                        <td>${escapeHtml(tecnicoNombre)}</td>
                        <td>${getPrioridadBadge(t.prioridad)}</td>
                        <td>${getEstadoBadge(t.estado)}</td>
                        <td style="font-size:12px;">${formatearFecha(t.fecha_fin_prevista) || '-'}</td>
                        <td>
                            <button class="btn-sm ver-tarea" data-id="${t.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                            ${puedeReasignar ? `<button class="btn-sm asignar-tarea" data-id="${t.id}" style="background:#e67e22; color:white;">🔄</button>` : ''}
                        </td>
                    </tr>`
                }
                html += `</tbody></table>`
                container.innerHTML = html
            }
            
            document.querySelectorAll('.ver-tarea').forEach(btn => {
                btn.addEventListener('click', () => {
                    localStorage.setItem('gerente_tareas_subvista', 'detalle')
                    localStorage.setItem('gerente_tarea_detalle', btn.dataset.id)
                    renderizarPanel()
                })
            })
            
            document.querySelectorAll('.asignar-tarea').forEach(btn => {
                btn.addEventListener('click', () => {
                    handleReasignarTarea(btn.dataset.id)
                })
            })
        }
        
        actualizarFiltrosActivos(filtros)
    }
    
    function actualizarFiltrosActivos(filtros) {
        const container = document.getElementById('filtrosActivos')
        if (!container) return
        
        const tags = []
        
        if (filtros.estado && filtros.estado !== 'todos') {
            tags.push({ key: 'estado', label: `📌 ${getEstadoLabel(filtros.estado)}` })
        }
        
        if (filtros.tecnico && filtros.tecnico !== 'todos') {
            const tecnico = tecnicosInternosData.find(t => t.id === filtros.tecnico)
            if (tecnico) tags.push({ key: 'tecnico', label: `👨‍🔧 ${escapeHtml(tecnico.nombre_razon_social)}` })
        }
        
        if (filtros.cliente && filtros.cliente !== 'todos') {
            const cliente = clientesData.find(c => c.id === filtros.cliente)
            if (cliente) tags.push({ key: 'cliente', label: `🏢 ${escapeHtml(cliente.nombre_empresa || cliente.nombre)}` })
        }
        
        if (filtros.prioridad && filtros.prioridad !== 'todos') {
            const prioridades = { baja: '🟢 Baja', media: '🟡 Media', alta: '🔴 Alta', urgente: '🔥 Urgente' }
            tags.push({ key: 'prioridad', label: `⭐ ${prioridades[filtros.prioridad]}` })
        }
        
        if (filtros.fecha && filtros.fecha !== 'todos') {
            const fechas = { hoy: '📅 Hoy', semana: '📅 Esta semana', mes: '📅 Este mes', atrasadas: '⏰ Atrasadas' }
            tags.push({ key: 'fecha', label: fechas[filtros.fecha] })
        }
        
        if (filtros.busqueda && filtros.busqueda.trim()) {
            const corta = filtros.busqueda.length > 20 ? filtros.busqueda.substring(0, 20) + '...' : filtros.busqueda
            tags.push({ key: 'busqueda', label: `🔍 "${escapeHtml(corta)}"` })
        }
        
        if (tags.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:var(--ios-gray);">📋 Sin filtros activos</span>'
            return
        }
        
        container.innerHTML = tags.map(tag => `
            <span style="display:inline-flex; align-items:center; gap:4px; background:var(--ios-bg); padding:4px 12px; border-radius:20px; font-size:12px; border:1px solid var(--ios-border);">
                ${tag.label}
                <span class="eliminar-filtro" data-key="${tag.key}" style="cursor:pointer; color:var(--ios-gray); font-weight:bold; margin-left:4px;">✕</span>
            </span>
        `).join('')
        
        document.querySelectorAll('.eliminar-filtro').forEach(el => {
            el.addEventListener('click', function(e) {
                e.stopPropagation()
                const key = this.dataset.key
                
                if (key === 'busqueda') {
                    const input = document.getElementById('buscarTarea')
                    if (input) { input.value = ''; input.dispatchEvent(new Event('input')) }
                } else {
                    const selectMap = {
                        'estado': 'filtroEstadoTarea',
                        'tecnico': 'filtroTecnicoTarea',
                        'cliente': 'filtroClienteTarea',
                        'prioridad': 'filtroPrioridadTarea',
                        'fecha': 'filtroFechaTarea'
                    }
                    const selectId = selectMap[key]
                    if (selectId) {
                        const select = document.getElementById(selectId)
                        if (select) { select.value = 'todos'; select.dispatchEvent(new Event('change')) }
                    }
                }
            })
        })
    }
    
    const buscarInput = document.getElementById('buscarTarea')
    if (buscarInput) {
        let timeoutId = null
        buscarInput.addEventListener('input', function() {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(aplicarFiltrosYActualizar, 300)
        })
        buscarInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { clearTimeout(timeoutId); aplicarFiltrosYActualizar() }
        })
    }
    
    document.getElementById('filtroEstadoTarea')?.addEventListener('change', aplicarFiltrosYActualizar)
    document.getElementById('filtroTecnicoTarea')?.addEventListener('change', aplicarFiltrosYActualizar)
    document.getElementById('filtroClienteTarea')?.addEventListener('change', aplicarFiltrosYActualizar)
    document.getElementById('filtroPrioridadTarea')?.addEventListener('change', aplicarFiltrosYActualizar)
    document.getElementById('filtroFechaTarea')?.addEventListener('change', aplicarFiltrosYActualizar)
    
    document.getElementById('btnLimpiarFiltrosTareas')?.addEventListener('click', function() {
        document.getElementById('buscarTarea').value = ''
        document.getElementById('filtroEstadoTarea').value = 'todos'
        document.getElementById('filtroTecnicoTarea').value = 'todos'
        document.getElementById('filtroClienteTarea').value = 'todos'
        document.getElementById('filtroPrioridadTarea').value = 'todos'
        document.getElementById('filtroFechaTarea').value = 'todos'
        setTimeout(aplicarFiltrosYActualizar, 50)
    })
    
    setTimeout(aplicarFiltrosYActualizar, 300)
}

// ============================================================
// ASIGNAR EVENTOS DE SUBMÓDULOS - VERSIÓN COMPLETA CON FILTROS DINÁMICOS
// ============================================================

// ============================================================
// ASIGNAR EVENTOS DE SUBMÓDULOS - VERSIÓN COMPLETA CON EDITOR DE DESCRIPCIÓN
// ============================================================

function asignarEventosSubmodulos() {
    // ============================================================
    // TAREAS
    // ============================================================
    
    document.getElementById('btnCrearTareaLista')?.addEventListener('click', () => {
        localStorage.setItem('gerente_tareas_subvista', 'crear')
        renderizarPanel()
    })
    
    document.getElementById('btnVolverTareas')?.addEventListener('click', () => {
        localStorage.setItem('gerente_tareas_subvista', 'lista')
        renderizarPanel()
    })
    
    document.getElementById('btnGuardarTarea')?.addEventListener('click', guardarNuevaTarea)
    
    document.getElementById('btnCancelarTarea')?.addEventListener('click', () => {
        localStorage.setItem('gerente_tareas_subvista', 'lista')
        renderizarPanel()
    })
    
    // ✅ FILTROS DINÁMICOS: Servicio → Tipos → Plantillas
    setTimeout(() => {
        const servicioSelect = document.getElementById('tareaServicio')
        if (servicioSelect) {
            const newServicioSelect = servicioSelect.cloneNode(true)
            servicioSelect.parentNode?.replaceChild(newServicioSelect, servicioSelect)
            
            newServicioSelect.addEventListener('change', async function() {
                const servicioId = this.value
                const tipoSelect = document.getElementById('tareaTipo')
                const plantillaContainer = document.getElementById('plantillaContainer')
                const plantillaSelect = document.getElementById('tareaPlantilla')
                
                if (!servicioId) {
                    if (tipoSelect) tipoSelect.innerHTML = '<option value="">-- Seleccionar tipo --</option>'
                    if (plantillaContainer) plantillaContainer.style.display = 'none'
                    return
                }
                
                try {
                    const tipos = await tareasModule.cargarTiposTarea(servicioId)
                    
                    let options = '<option value="">-- Seleccionar tipo --</option>'
                    if (tipos && tipos.length > 0) {
                        tipos.forEach(t => {
                            options += `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`
                        })
                    } else {
                        options += '<option value="" disabled>📭 Sin tipos</option>'
                    }
                    if (tipoSelect) tipoSelect.innerHTML = options
                    
                    if (plantillaContainer) plantillaContainer.style.display = 'none'
                    if (plantillaSelect) plantillaSelect.innerHTML = '<option value="">-- Seleccionar plantilla --</option>'
                } catch (error) {
                    console.error('Error cargando tipos:', error)
                }
            })
        }
        
        const tipoSelect = document.getElementById('tareaTipo')
        if (tipoSelect) {
            const newTipoSelect = tipoSelect.cloneNode(true)
            tipoSelect.parentNode?.replaceChild(newTipoSelect, tipoSelect)
            
            newTipoSelect.addEventListener('change', async function() {
                const tipoId = this.value
                const plantillaContainer = document.getElementById('plantillaContainer')
                const plantillaSelect = document.getElementById('tareaPlantilla')
                
                if (!tipoId) {
                    if (plantillaContainer) plantillaContainer.style.display = 'none'
                    return
                }
                
                try {
                    const plantillas = await tareasModule.cargarPlantillasTarea(currentEmpresaId, tipoId)
                    
                    let options = '<option value="">-- Seleccionar plantilla --</option>'
                    if (plantillas && plantillas.length > 0) {
                        plantillas.forEach(p => {
                            options += `<option value="${p.id}">${escapeHtml(p.titulo)}</option>`
                        })
                        if (plantillaContainer) plantillaContainer.style.display = 'flex'
                    } else {
                        options += '<option value="" disabled>📭 Sin plantillas</option>'
                        if (plantillaContainer) plantillaContainer.style.display = 'none'
                    }
                    if (plantillaSelect) plantillaSelect.innerHTML = options
                } catch (error) {
                    console.error('Error cargando plantillas:', error)
                }
            })
        }
        
        const plantillaSelect = document.getElementById('tareaPlantilla')
        if (plantillaSelect) {
            const newPlantillaSelect = plantillaSelect.cloneNode(true)
            plantillaSelect.parentNode?.replaceChild(newPlantillaSelect, plantillaSelect)
            
            newPlantillaSelect.addEventListener('change', async function() {
                const plantillaId = this.value
                const tituloInput = document.getElementById('tareaTitulo')
                const descripcionTextarea = document.getElementById('tareaDescripcion')
                const tiempoEstimadoInput = document.getElementById('tareaTiempoEstimado')
                const prioridadSelect = document.getElementById('tareaPrioridad')
                const ordenTrabajoTextarea = document.getElementById('tareaOrdenTrabajo')
                
                if (!plantillaId) return
                
                try {
                    const { data: plantilla } = await sb
                        .from('plantillas_tarea')
                        .select('*')
                        .eq('id', plantillaId)
                        .single()
                    
                    if (plantilla) {
                        if (tituloInput) tituloInput.value = plantilla.titulo || ''
                        if (descripcionTextarea) descripcionTextarea.value = plantilla.descripcion || ''
                        if (tiempoEstimadoInput) tiempoEstimadoInput.value = plantilla.tiempo_estimado || ''
                        if (prioridadSelect && plantilla.prioridad) prioridadSelect.value = plantilla.prioridad
                        if (ordenTrabajoTextarea) ordenTrabajoTextarea.value = plantilla.orden_trabajo || ''
                    }
                } catch (error) {
                    console.error('Error cargando plantilla:', error)
                }
            })
        }
        
        const clienteSelect = document.getElementById('tareaCliente')
        if (clienteSelect) {
            const newClienteSelect = clienteSelect.cloneNode(true)
            clienteSelect.parentNode?.replaceChild(newClienteSelect, clienteSelect)
            
            newClienteSelect.addEventListener('change', async function() {
                const clienteId = this.value
                const activoSelect = document.getElementById('tareaActivo')
                
                if (!clienteId) {
                    if (activoSelect) activoSelect.innerHTML = '<option value="">-- Seleccionar activo --</option>'
                    return
                }
                
                try {
                    const activos = await tareasModule.cargarActivos(clienteId)
                    
                    let options = '<option value="">-- Seleccionar activo --</option>'
                    if (activos && activos.length > 0) {
                        activos.forEach(a => {
                            options += `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`
                        })
                    } else {
                        options += '<option value="" disabled>📭 Sin activos</option>'
                    }
                    if (activoSelect) activoSelect.innerHTML = options
                } catch (error) {
                    console.error('❌ Error cargando activos:', error)
                    if (activoSelect) activoSelect.innerHTML = '<option value="">-- Error al cargar --</option>'
                }
            })
        }
    }, 200)
    
    // Eventos para cambiar estado en detalle
    document.querySelectorAll('.btn-cambiar-estado').forEach(btn => {
        btn.addEventListener('click', () => {
            const tareaId = btn.dataset.tareaId
            const nuevoEstado = btn.dataset.estado
            handleCambiarEstado(tareaId, nuevoEstado)
        })
    })
    
    document.getElementById('btnReasignarTarea')?.addEventListener('click', () => {
        const tareaId = localStorage.getItem('gerente_tarea_detalle')
        if (tareaId) handleReasignarTarea(tareaId)
    })
    
    document.querySelectorAll('.ver-tarea').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem('gerente_tareas_subvista', 'detalle')
            localStorage.setItem('gerente_tarea_detalle', btn.dataset.id)
            renderizarPanel()
        })
    })
    
    document.querySelectorAll('.asignar-tarea').forEach(btn => {
        btn.addEventListener('click', () => {
            const tareaId = btn.dataset.id
            handleReasignarTarea(tareaId)
        })
    })
    
    // ✅ EDITOR DE DESCRIPCIÓN - Botón editar
    document.getElementById('btnEditarDescripcion')?.addEventListener('click', function() {
        const container = document.getElementById('descripcionContainer')
        const editor = document.getElementById('editorDescripcion')
        
        if (container && editor) {
            container.style.display = 'none'
            editor.style.display = 'block'
            
            // Cargar el texto actual en el editor
            const textarea = document.getElementById('textoDescripcion')
            if (textarea) {
                // Obtener el texto plano del container
                let textoPlano = container.textContent || container.innerText || ''
                // Limpiar saltos de línea extra
                textoPlano = textoPlano.trim()
                textarea.value = textoPlano
            }
        }
    })
    
    // ✅ EDITOR DE DESCRIPCIÓN - Guardar
    document.getElementById('btnGuardarDescripcion')?.addEventListener('click', async function() {
        const textarea = document.getElementById('textoDescripcion')
        const nuevoTexto = textarea?.value || ''
        
        const tareaId = localStorage.getItem('gerente_tarea_detalle')
        if (!tareaId) {
            mostrarMensaje('Error: Tarea no encontrada', 'error')
            return
        }
        
        mostrarModalCarga('Guardando descripción...')
        
        try {
            const { error } = await sb
                .from('tareas')
                .update({ 
                    descripcion: nuevoTexto, 
                    updated_at: new Date() 
                })
                .eq('id', tareaId)
            
            if (error) throw error
            
            cerrarModalCarga()
            mostrarMensaje('✅ Descripción actualizada', 'exito')
            
            // Recargar el detalle
            await cargarDatosIniciales()
            await renderizarPanel()
            
        } catch (error) {
            cerrarModalCarga()
            console.error('Error guardando descripción:', error)
            mostrarMensaje('Error al guardar la descripción', 'error')
        }
    })
    
    // ✅ EDITOR DE DESCRIPCIÓN - Cancelar
    document.getElementById('btnCancelarEdicionDescripcion')?.addEventListener('click', function() {
        const container = document.getElementById('descripcionContainer')
        const editor = document.getElementById('editorDescripcion')
        
        if (container && editor) {
            container.style.display = 'block'
            editor.style.display = 'none'
        }
    })
    
    // ✅ EDITOR DE DESCRIPCIÓN - Regenerar con IA
    document.getElementById('btnRegenerarDescripcion')?.addEventListener('click', async function() {
        const tareaId = localStorage.getItem('gerente_tarea_detalle')
        const tarea = tareasData.find(t => t.id === tareaId)
        if (!tarea) {
            mostrarMensaje('Error: Tarea no encontrada', 'error')
            return
        }
        
        mostrarModalCarga('🔄 Regenerando descripción con IA...')
        
        try {
            const enriquecida = await enriquecerDescripcion(
                tarea.servicio?.nombre || '',
                tarea.tipo_tarea?.nombre || '',
                tarea.descripcion || '',
                tarea.cliente?.nombre || '',
                tarea.activos?.nombre || ''
            )
            
            cerrarModalCarga()
            
            if (enriquecida) {
                const textarea = document.getElementById('textoDescripcion')
                if (textarea) {
                    textarea.value = enriquecida
                    mostrarMensaje('✅ Descripción regenerada correctamente', 'exito')
                }
            } else {
                mostrarMensaje('❌ No se pudo regenerar la descripción', 'error')
            }
        } catch (error) {
            cerrarModalCarga()
            console.error('Error regenerando descripción:', error)
            mostrarMensaje('Error al regenerar la descripción', 'error')
        }
    })
    
    // ============================================================
    // PERSONAL
    // ============================================================
    
    document.querySelectorAll('[data-subtab]').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem('gerente_personal_subvista', btn.dataset.subtab)
            renderizarPanel()
        })
    })
    
    // ============================================================
    // CLIENTES
    // ============================================================
    
    document.getElementById('btnAltaCliente')?.addEventListener('click', () => mostrarAltaCliente())
    
    document.getElementById('btnVolverClientes')?.addEventListener('click', () => {
        localStorage.setItem('gerente_clientes_subvista', 'lista')
        renderizarPanel()
    })
    
    document.getElementById('btnGuardarCliente')?.addEventListener('click', async () => {
        const nombre = document.getElementById('cliNombre')?.value.trim()
        const nifCif = document.getElementById('cliNif')?.value.trim()
        const email = document.getElementById('cliEmail')?.value.trim()
        const telefono = document.getElementById('cliTelefono')?.value.trim()
        const direccion = document.getElementById('cliDireccion')?.value.trim()
        const ciudad = document.getElementById('cliCiudad')?.value.trim()
        const provincia = document.getElementById('cliProvincia')?.value
        
        if (!nombre) {
            mostrarMensaje('El nombre del cliente es obligatorio', 'error')
            return
        }
        
        const datos = { nombre, nifCif, email, telefono, direccion, ciudad, provincia }
        const exito = await clientesModule.crearCliente(datos, currentEmpresaId)
        
        if (exito) {
            await cargarDatosIniciales()
            localStorage.setItem('gerente_clientes_subvista', 'lista')
            renderizarPanel()
        }
    })
    
    document.getElementById('btnCancelarCliente')?.addEventListener('click', () => {
        localStorage.setItem('gerente_clientes_subvista', 'lista')
        renderizarPanel()
    })
    
    // ============================================================
    // MATERIALES
    // ============================================================
    
    document.getElementById('btnStockMateriales')?.addEventListener('click', () => mostrarStockMateriales())
    document.getElementById('btnGastosMateriales')?.addEventListener('click', () => mostrarGastosMateriales())
    
    // ============================================================
    // FACTURACIÓN
    // ============================================================
    
    document.getElementById('btnIngresos')?.addEventListener('click', () => mostrarIngresos())
    document.getElementById('btnPagos')?.addEventListener('click', () => mostrarPagos())
    
    // ============================================================
    // IMPUESTOS
    // ============================================================
    
    document.getElementById('btnIRPF')?.addEventListener('click', () => mostrarIRPF())
    document.getElementById('btnIVA')?.addEventListener('click', () => mostrarIVA())
    
    // ============================================================
    // FILTROS DE TAREAS
    // ============================================================
    
    setTimeout(() => asignarEventosFiltrosTareas(), 400)
}

export default { init }