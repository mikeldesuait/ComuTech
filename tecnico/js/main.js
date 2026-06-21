// tecnico/js/main.js
// PANEL TÉCNICO - VERSIÓN COMPLETA CON ORDEN DE TRABAJO EN PANTALLA COMPLETA

import { sb } from './config/supabase.js'
import { 
    hacerLogin, cerrarSesion, verificarSesion, 
    getCurrentUser, getCurrentPerfil, getIsExterno 
} from './modules/auth.js'
import {
    cargarTareas, getTareasPendientes, getTareasActivas, 
    getTareasCompletadas, getTodasTareas, getContadores, 
    getTareaById, actualizarEstadoTarea
} from './modules/tareas.js'
import {
    registrarEvento, suspenderTarea, finalizarTrabajo,
    getSeguimientoTarea, calcularTiemposTotales
} from './modules/seguimiento.js'
import {
    renderizarMediciones, obtenerMediciones, limpiarMediciones,
    validarMediciones, guardarMedicion, getMedicionesTarea,
    formatearMedicion
} from './modules/mediciones.js'
import {
    renderizarSelectMateriales, agregarMaterial, eliminarMaterial,
    getMaterialesTarea, calcularTotalMateriales, renderizarListaMateriales
} from './modules/materiales.js'
import { renderizarPerfil } from './modules/perfil.js'
import {
    renderizarTablaTareas, renderizarFiltrosTareas, renderizarSubPestanas,
    mostrarModalAceptarTarea, mostrarModalDetalleTarea,
    mostrarModalOrdenTrabajo, mostrarModalAlbaran
} from './modules/ui.js'
import { mostrarMensaje, formatearFecha, escapeHtml, getNowLocalISO, getEstadoBadge, getPrioridadBadge, getEstadoLabel } from './utils/utils.js'

let tabActiva = 'tareas'
let subTabActiva = 'todas'
let tareaActual = null
let pasoActual = 0
let medicionesTemp = []
let materialesTemp = []

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

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
// ABRIR ORDEN DE TRABAJO CON BOTONES ACEPTAR/RECHAZAR (PANTALLA COMPLETA)
// ============================================================

function abrirOrdenTrabajoConAccion(tarea) {
    document.getElementById('dashboardPanel').style.display = 'none'
    document.getElementById('trabajoScreen').style.display = 'none'
    
    let container = document.getElementById('ordenAceptarScreen')
    if (!container) {
        container = document.createElement('div')
        container.id = 'ordenAceptarScreen'
        container.style.display = 'block'
        container.style.position = 'fixed'
        container.style.top = '0'
        container.style.left = '0'
        container.style.right = '0'
        container.style.bottom = '0'
        container.style.background = 'var(--ios-bg)'
        container.style.zIndex = '200'
        container.style.overflowY = 'auto'
        document.body.appendChild(container)
    }
    container.style.display = 'block'
    
    let contenido = tarea.orden_trabajo || tarea.descripcion || 'Sin instrucciones'
    const esHtml = contenido.includes('<div') || contenido.includes('<h') || contenido.includes('<p') || contenido.includes('<ul')
    
    const fechaPropuesta = new Date()
    fechaPropuesta.setDate(fechaPropuesta.getDate() + 7)
    const fechaStr = fechaPropuesta.toISOString().split('T')[0]
    const horaStr = '10:00'
    
    const html = `
    <div style="max-width: 900px; margin: 0 auto; padding: 16px; padding-bottom: 100px;">
        <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <span style="font-size: 20px; font-weight: 700; color: #1e4663;">
                        📋 ${escapeHtml(tarea.numero_tarea || 'Sin número')} - ${escapeHtml(tarea.titulo || '')}
                    </span>
                </div>
                <button id="btnCerrarOrdenAceptar" class="btn-danger" style="padding: 8px 20px; border-radius: 30px; border: none; color: white; cursor: pointer; font-weight: 600;">✖ Cerrar</button>
            </div>
            
            <div style="background: var(--ios-bg); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div><strong>Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || tarea.cliente?.nombre || '-')}</div>
                    <div><strong>Servicio:</strong> ${escapeHtml(tarea.servicio?.nombre || '-')}</div>
                    <div><strong>Prioridad:</strong> ${getPrioridadBadge(tarea.prioridad)}</div>
                    <div><strong>Estado:</strong> ${getEstadoBadge(tarea.estado)}</div>
                    <div><strong>Fecha creación:</strong> ${formatearFecha(tarea.created_at)}</div>
                    ${tarea.fecha_aceptacion ? `<div><strong>Fecha aceptación:</strong> ${formatearFecha(tarea.fecha_aceptacion)}</div>` : ''}
                </div>
                ${tarea.fecha_desplazamiento ? `<div style="margin-top:8px;"><strong>Inicio desplazamiento:</strong> ${formatearFecha(tarea.fecha_desplazamiento)}</div>` : ''}
                ${tarea.fecha_llegada ? `<div><strong>Llegada al sitio:</strong> ${formatearFecha(tarea.fecha_llegada)}</div>` : ''}
                ${tarea.fecha_fin_trabajo ? `<div><strong>Finalización:</strong> ${formatearFecha(tarea.fecha_fin_trabajo)}</div>` : ''}
            </div>
            
            ${tarea.activos ? `
            <div style="background: #e0f2fe; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #0284c7;">
                <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #0369a1;">📍 Ubicación del activo</h4>
                <p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">
                    <strong>Activo:</strong> ${escapeHtml(tarea.activos.nombre || '-')}
                </p>
                <p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">
                    <strong>Dirección:</strong> ${escapeHtml((tarea.activos.direccion || '') + (tarea.activos.localidad ? `, ${tarea.activos.localidad}` : '')) || 'Sin dirección'}
                </p>
                ${tarea.activos.contacto ? `<p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;"><strong>Contacto:</strong> ${escapeHtml(tarea.activos.contacto)}</p>` : ''}
            </div>` : ''}
            
            <div style="margin-top: 12px;">
                <strong style="font-size: 16px;">📋 ORDEN DE TRABAJO</strong>
                <div style="margin-top: 8px; background: #f8fafc; border-radius: 12px; padding: 20px; font-size: 14px; line-height: 1.8; color: #1e293b;">
                    ${esHtml ? contenido : `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 14px; line-height: 1.8;">${escapeHtml(contenido)}</pre>`}
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--ios-border);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size:12px; font-weight:600; color:var(--ios-gray);">📅 Fecha propuesta</label>
                        <input type="date" id="ordenFechaPropuesta" value="${fechaStr}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--ios-border);">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:600; color:var(--ios-gray);">⏰ Hora propuesta</label>
                        <input type="time" id="ordenHoraPropuesta" value="${horaStr}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--ios-border);">
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 16px;">
                    <button id="btnAceptarTareaCompleta" class="btn-success" style="flex:1; padding:14px; border-radius:40px; border:none; color:white; font-weight:600; cursor:pointer;">✅ Aceptar tarea</button>
                    <button id="btnRechazarTareaCompleta" class="btn-danger" style="flex:1; padding:14px; border-radius:40px; border:none; color:white; font-weight:600; cursor:pointer;">❌ Rechazar</button>
                </div>
            </div>
        </div>
    </div>`
    
    container.innerHTML = html
    
    document.getElementById('btnCerrarOrdenAceptar').onclick = () => {
        container.style.display = 'none'
        document.getElementById('dashboardPanel').style.display = 'block'
    }
    
    document.getElementById('btnAceptarTareaCompleta').onclick = async () => {
        const fecha = document.getElementById('ordenFechaPropuesta').value
        const hora = document.getElementById('ordenHoraPropuesta').value
        if (!fecha || !hora) {
            mostrarMensaje('Completa fecha y hora propuesta', 'error')
            return
        }
        await actualizarEstadoTarea(tarea.id, 'aceptada', { 
            fecha_propuesta: fecha, 
            hora_propuesta: hora, 
            leida: true 
        })
        container.style.display = 'none'
        document.getElementById('dashboardPanel').style.display = 'block'
        await recargarTodo()
        mostrarMensaje('✅ Tarea aceptada', 'exito')
    }
    
    document.getElementById('btnRechazarTareaCompleta').onclick = async () => {
        const motivo = prompt('Motivo del rechazo:')
        if (motivo && motivo.trim() !== '') {
            await actualizarEstadoTarea(tarea.id, 'rechazada', { 
                motivo_rechazo: motivo, 
                leida: true 
            })
            container.style.display = 'none'
            document.getElementById('dashboardPanel').style.display = 'block'
            await recargarTodo()
            mostrarMensaje('❌ Tarea rechazada', 'exito')
        } else {
            mostrarMensaje('Debes indicar un motivo', 'error')
        }
    }
}

// ============================================================
// ABRIR ORDEN DE TRABAJO (SOLO LECTURA - PANTALLA COMPLETA)
// ============================================================

function abrirOrdenTrabajoCompleta(tarea) {
    document.getElementById('dashboardPanel').style.display = 'none'
    document.getElementById('trabajoScreen').style.display = 'none'
    
    let container = document.getElementById('ordenCompletaScreen')
    if (!container) {
        container = document.createElement('div')
        container.id = 'ordenCompletaScreen'
        container.style.display = 'block'
        container.style.position = 'fixed'
        container.style.top = '0'
        container.style.left = '0'
        container.style.right = '0'
        container.style.bottom = '0'
        container.style.background = 'var(--ios-bg)'
        container.style.zIndex = '200'
        container.style.overflowY = 'auto'
        document.body.appendChild(container)
    }
    container.style.display = 'block'
    
    let contenido = tarea.orden_trabajo || tarea.descripcion || 'Sin instrucciones'
    const esHtml = contenido.includes('<div') || contenido.includes('<h') || contenido.includes('<p') || contenido.includes('<ul')
    
    const html = `
    <div style="max-width: 900px; margin: 0 auto; padding: 16px; padding-bottom: 100px;">
        <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <span style="font-size: 20px; font-weight: 700; color: #1e4663;">
                        📋 ${escapeHtml(tarea.numero_tarea || 'Sin número')} - ${escapeHtml(tarea.titulo || '')}
                    </span>
                </div>
                <button id="btnCerrarOrdenCompleta" class="btn-danger" style="padding: 8px 20px; border-radius: 30px; border: none; color: white; cursor: pointer; font-weight: 600;">✖ Cerrar</button>
            </div>
            
            <div style="background: var(--ios-bg); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div><strong>Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || tarea.cliente?.nombre || '-')}</div>
                    <div><strong>Servicio:</strong> ${escapeHtml(tarea.servicio?.nombre || '-')}</div>
                    <div><strong>Prioridad:</strong> ${getPrioridadBadge(tarea.prioridad)}</div>
                    <div><strong>Estado:</strong> ${getEstadoBadge(tarea.estado)}</div>
                    <div><strong>Fecha creación:</strong> ${formatearFecha(tarea.created_at)}</div>
                    ${tarea.fecha_aceptacion ? `<div><strong>Fecha aceptación:</strong> ${formatearFecha(tarea.fecha_aceptacion)}</div>` : ''}
                </div>
                ${tarea.fecha_desplazamiento ? `<div style="margin-top:8px;"><strong>Inicio desplazamiento:</strong> ${formatearFecha(tarea.fecha_desplazamiento)}</div>` : ''}
                ${tarea.fecha_llegada ? `<div><strong>Llegada al sitio:</strong> ${formatearFecha(tarea.fecha_llegada)}</div>` : ''}
                ${tarea.fecha_fin_trabajo ? `<div><strong>Finalización:</strong> ${formatearFecha(tarea.fecha_fin_trabajo)}</div>` : ''}
            </div>
            
            ${tarea.activos ? `
            <div style="background: #e0f2fe; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #0284c7;">
                <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #0369a1;">📍 Ubicación del activo</h4>
                <p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">
                    <strong>Activo:</strong> ${escapeHtml(tarea.activos.nombre || '-')}
                </p>
                <p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">
                    <strong>Dirección:</strong> ${escapeHtml((tarea.activos.direccion || '') + (tarea.activos.localidad ? `, ${tarea.activos.localidad}` : '')) || 'Sin dirección'}
                </p>
                ${tarea.activos.contacto ? `<p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;"><strong>Contacto:</strong> ${escapeHtml(tarea.activos.contacto)}</p>` : ''}
            </div>` : ''}
            
            <div style="margin-top: 12px;">
                <strong style="font-size: 16px;">📋 ORDEN DE TRABAJO</strong>
                <div style="margin-top: 8px; background: #f8fafc; border-radius: 12px; padding: 20px; font-size: 14px; line-height: 1.8; color: #1e293b;">
                    ${esHtml ? contenido : `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 14px; line-height: 1.8;">${escapeHtml(contenido)}</pre>`}
                </div>
            </div>
        </div>
    </div>`
    
    container.innerHTML = html
    
    document.getElementById('btnCerrarOrdenCompleta').onclick = () => {
        container.style.display = 'none'
        document.getElementById('dashboardPanel').style.display = 'block'
    }
}

// ============================================================
// INICIALIZACIÓN - LOGIN
// ============================================================

export async function init() {
    console.log('🚀 Iniciando Panel Técnico')
    
    const btnLogin = document.getElementById('btnLogin')
    const identificador = document.getElementById('identificador')
    const password = document.getElementById('password')
    const errorMsg = document.getElementById('errorMsg')
    
    if (btnLogin) {
        const nuevoBtn = btnLogin.cloneNode(true)
        btnLogin.parentNode.replaceChild(nuevoBtn, btnLogin)
        
        nuevoBtn.addEventListener('click', async function(e) {
            e.preventDefault()
            const nick = identificador.value.trim()
            const pass = password.value
            
            if (!nick || !pass) {
                errorMsg.innerText = 'Introduce nick y contraseña'
                return
            }
            
            try {
                await hacerLogin(nick, pass)
                errorMsg.innerText = ''
                await mostrarDashboard()
            } catch (error) {
                errorMsg.innerText = error.message || 'Error al iniciar sesión'
            }
        })
    }
    
    if (password) {
        password.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault()
                const btn = document.getElementById('btnLogin')
                if (btn) btn.click()
            }
        })
    }
    
    const tieneSesion = await verificarSesion()
    if (tieneSesion) {
        await mostrarDashboard()
    } else {
        document.getElementById('loginPanel').style.display = 'flex'
        document.getElementById('dashboardPanel').style.display = 'none'
        document.getElementById('trabajoScreen').style.display = 'none'
    }
}

// ============================================================
// MOSTRAR DASHBOARD
// ============================================================

async function mostrarDashboard() {
    document.getElementById('loginPanel').style.display = 'none'
    document.getElementById('dashboardPanel').style.display = 'block'
    
    const perfil = getCurrentPerfil()
    document.getElementById('nombreTecnico').innerHTML = perfil?.nombre_razon_social || 'Técnico'
    document.getElementById('emailTecnico').innerHTML = getCurrentUser()?.email || ''
    document.getElementById('nombreEmpresaBanner').innerHTML = await getEmpresaNombre()
    
    document.getElementById('btnLogout').onclick = async () => { 
        await cerrarSesion(); 
        window.location.reload() 
    }
    
    document.getElementById('btnRefrescar').onclick = async () => { 
        mostrarMensaje('🔄 Refrescando...', 'exito')
        await recargarTodo() 
    }
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            tabActiva = btn.dataset.tab
            renderizarPanel()
        }
    })
    
    document.getElementById('btnBackTrabajo').onclick = volverAlPanel
    
    await recargarTodo()
}

async function getEmpresaNombre() {
    const empresaId = getCurrentPerfil()?.empresa_id
    if (!empresaId) return 'Sin empresa'
    try {
        const { data } = await sb.from('empresas').select('nombre_empresa').eq('id', empresaId).maybeSingle()
        return data?.nombre_empresa || 'Sin empresa'
    } catch { return 'Sin empresa' }
}

// ============================================================
// RECARGAR Y RENDERIZAR
// ============================================================

async function recargarTodo() {
    await cargarTareas()
    renderizarPanel()
}

function renderizarPanel() {
    const container = document.getElementById('contenidoPanel')
    if (!container) return
    
    if (tabActiva === 'tareas') {
        renderizarTareas()
    } else if (tabActiva === 'materiales') {
        container.innerHTML = renderizarListaMateriales()
    } else if (tabActiva === 'seguimiento') {
        renderizarSeguimiento()
    } else if (tabActiva === 'perfil') {
        const perfil = getCurrentPerfil()
        container.innerHTML = renderizarPerfil(
            perfil?.nombre_razon_social || 'Técnico', 
            getCurrentUser()?.email || '', 
            getIsExterno()
        )
        document.getElementById('btnCerrarSesionPerfil').onclick = async () => {
            await cerrarSesion()
            window.location.reload()
        }
    }
}

// ============================================================
// RENDERIZAR TAREAS
// ============================================================

function renderizarTareas() {
    const container = document.getElementById('contenidoPanel')
    let tareas = getTodasTareas()
    
    if (subTabActiva === 'pendientes') tareas = getTareasPendientes()
    else if (subTabActiva === 'activas') tareas = getTareasActivas()
    else if (subTabActiva === 'completadas') tareas = getTareasCompletadas()
    
    const html = `<div class="container">
        <div class="card">
            <div class="card-header">
                📋 Tareas <span style="font-size:14px; font-weight:400; color:var(--ios-gray);">${tareas.length} tareas</span>
                <button id="btnRefrescarTareas" class="btn-sm" style="background:#2c7a4d; color:white; border:none; padding:6px 14px; border-radius:30px; cursor:pointer;">🔄 Refrescar</button>
            </div>
            ${renderizarSubPestanas(subTabActiva)}
            ${renderizarFiltrosTareas()}
            <div id="tablaTareasContainer">
                ${renderizarTablaTareas(tareas, subTabActiva)}
            </div>
        </div>
    </div>`
    
    container.innerHTML = html
    
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.onclick = () => {
            subTabActiva = btn.dataset.subtab
            renderizarTareas()
        }
    })
    
    document.getElementById('btnRefrescarTareas').onclick = async () => {
        await recargarTodo()
    }
    
    document.querySelectorAll('.btn-accion-tarea').forEach(btn => {
        btn.onclick = () => manejarAccionTarea(btn.dataset.id, btn.dataset.accion)
    })
    
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
        document.getElementById('buscarTarea').value = ''
        document.getElementById('filtroEstado').value = 'todos'
        document.getElementById('filtroPrioridad').value = 'todos'
        aplicarFiltrosTareas()
    })
    
    document.querySelectorAll('#buscarTarea, #filtroEstado, #filtroPrioridad').forEach(el => {
        el.addEventListener('input', aplicarFiltrosTareas)
        el.addEventListener('change', aplicarFiltrosTareas)
    })
}

function aplicarFiltrosTareas() {
    const buscar = document.getElementById('buscarTarea')?.value.toLowerCase() || ''
    const estado = document.getElementById('filtroEstado')?.value || 'todos'
    const prioridad = document.getElementById('filtroPrioridad')?.value || 'todos'
    
    let tareas = []
    if (subTabActiva === 'pendientes') tareas = getTareasPendientes()
    else if (subTabActiva === 'activas') tareas = getTareasActivas()
    else if (subTabActiva === 'completadas') tareas = getTareasCompletadas()
    else tareas = getTodasTareas()
    
    tareas = tareas.filter(t => {
        if (buscar) {
            const texto = `${t.numero_tarea || ''} ${t.titulo || ''} ${t.empresas?.nombre_empresa || ''} ${t.activos?.nombre || ''} ${t.activos?.direccion || ''}`.toLowerCase()
            if (!texto.includes(buscar)) return false
        }
        if (estado !== 'todos' && t.estado !== estado) return false
        if (prioridad !== 'todos' && t.prioridad !== prioridad) return false
        return true
    })
    
    document.getElementById('tablaTareasContainer').innerHTML = renderizarTablaTareas(tareas, subTabActiva)
    
    document.querySelectorAll('.btn-accion-tarea').forEach(btn => {
        btn.onclick = () => manejarAccionTarea(btn.dataset.id, btn.dataset.accion)
    })
}

// ============================================================
// MANEJAR ACCIONES DE TAREAS
// ============================================================

async function manejarAccionTarea(id, accion) {
    const tarea = await getTareaById(id)
    if (!tarea) {
        mostrarMensaje('❌ Tarea no encontrada', 'error')
        return
    }
    tareaActual = tarea
    
    if (accion === 'leer' || accion === 'aceptar') {
        abrirOrdenTrabajoConAccion(tarea)
    } else if (accion === 'desplazamiento') {
        await registrarEvento(id, 'INICIO_DESPLAZAMIENTO')
        await recargarTodo()
    } else if (accion === 'llegada') {
        await registrarEvento(id, 'LLEGADA')
        await recargarTodo()
    } else if (accion === 'trabajar') {
        abrirPantallaTrabajo(id)
    } else if (accion === 'reactivar') {
        await actualizarEstadoTarea(id, 'aceptada')
        await recargarTodo()
    } else if (accion === 'detalle') {
        mostrarDetalleTarea(tarea)
    } else if (accion === 'ver_orden') {
        abrirOrdenTrabajoCompleta(tarea)
    } else {
        mostrarMensaje('❌ Acción no reconocida', 'error')
    }
}

// ============================================================
// PANTALLA DE TRABAJO
// ============================================================

function abrirPantallaTrabajo(id) {
    const tarea = tareaActual
    if (!tarea) return
    medicionesTemp = []
    materialesTemp = []
    pasoActual = 4
    
    document.getElementById('trabajoTitulo').innerHTML = tarea.activos?.nombre || tarea.titulo || 'Tarea'
    document.getElementById('trabajoScreen').style.display = 'block'
    document.getElementById('dashboardPanel').style.display = 'none'
    renderizarPantallaTrabajo()
}

function renderizarPantallaTrabajo() {
    const content = document.getElementById('trabajoContent')
    const tarea = tareaActual
    if (!tarea) return
    
    const servicioTipo = tarea.servicio_tipo || 'OTRO'
    
    let html = `<div class="stepper">
        <div class="step completed"><span class="step-icon">✅</span><span>Aceptada</span></div>
        <div class="step completed"><span class="step-icon">🚗</span><span>Desplazamiento</span></div>
        <div class="step completed"><span class="step-icon">📍</span><span>Llegada</span></div>
        <div class="step active"><span class="step-icon">⚙️</span><span>Trabajo</span></div>
        <div class="step"><span class="step-icon">🏁</span><span>Cierre</span></div>
    </div>
    <div class="form-group">
        <label>📋 ORDEN DE TRABAJO</label>
        <button class="btn-info" id="btnVerOrdenTrabajo" style="padding:10px 20px; border-radius:30px; border:none; color:white; cursor:pointer;">📄 Ver orden de trabajo</button>
    </div>`
    
    html += renderizarMediciones(servicioTipo)
    html += `<button class="btn-success" id="btnRegistrarMedicion" style="padding:10px 20px; border-radius:30px; border:none; color:white; cursor:pointer; margin:8px 0;">➕ Registrar medición</button>`
    
    if (medicionesTemp.length > 0) {
        html += `<div><label>📊 Mediciones registradas:</label>`
        medicionesTemp.forEach((med, idx) => {
            html += `<div style="display:flex; justify-content:space-between; padding:8px; background:var(--ios-bg); border-radius:8px; margin:4px 0;">
                <span>${formatearMedicion({ parametros: med.parametros, created_at: med.fecha })}</span>
                <button class="btn-eliminar-medicion-listado" data-idx="${idx}" style="background:#fee2e2; border:none; padding:4px 12px; border-radius:20px; color:var(--ios-red); cursor:pointer;">✖</button>
            </div>`
        })
        html += `</div>`
    }
    
    html += `<div class="form-group"><label>🧰 MATERIALES USADOS</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="selectMaterial" style="flex:2; min-width:150px; padding:10px; border-radius:12px; border:1px solid var(--ios-border);">${renderizarSelectMateriales(servicioTipo)}</select>
            <input type="number" id="materialCantidad" placeholder="Cantidad" step="0.01" value="1" style="width:100px; padding:10px; border-radius:12px; border:1px solid var(--ios-border);">
            <input type="number" id="materialPrecio" placeholder="Precio" step="0.01" readonly style="width:100px; padding:10px; border-radius:12px; border:1px solid var(--ios-border); background:var(--ios-bg);">
            <input type="text" id="materialUnidad" placeholder="Unidad" readonly style="width:100px; padding:10px; border-radius:12px; border:1px solid var(--ios-border); background:var(--ios-bg);">
            <button class="btn-add-material" id="btnAgregarMaterial" style="background:#2c7a4d; color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer;">➕ Añadir</button>
        </div>
        <div id="listadoMateriales"></div>
    </div>`
    
    html += `<div class="form-group"><label>📝 NOTA INTERNA</label>
        <textarea id="notaInterna" rows="2" placeholder="Notas internas...">${tarea.nota_interna || ''}</textarea>
        <button class="btn-info" id="btnGuardarNotaInterna" style="padding:8px 16px; border-radius:30px; border:none; color:white; cursor:pointer; margin-top:8px;">💾 Guardar</button>
    </div>`
    
    html += `<div class="form-group" style="border-left:3px solid var(--ios-red); padding-left:12px;">
        <label>📝 INFORME PARA EL CLIENTE</label>
        <textarea id="notaCliente" rows="3" placeholder="Describe el trabajo realizado...">${tarea.nota_cliente || ''}</textarea>
        <button class="btn-info" id="btnGuardarInforme" style="padding:8px 16px; border-radius:30px; border:none; color:white; cursor:pointer; margin-top:8px;">💾 Guardar</button>
        <small style="color:var(--ios-red);">⚠️ Completa este informe antes de finalizar</small>
    </div>`
    
    if (getIsExterno()) {
        html += `<button class="btn-warning" id="btnMostrarAlbaran" style="padding:14px; border-radius:50px; border:none; color:white; width:100%; margin:8px 0; cursor:pointer; font-weight:600;">💰 REGISTRAR ALBARÁN</button>`
    }
    
    html += `<button class="btn-danger" id="btnSuspenderTarea" style="padding:14px; border-radius:50px; border:none; color:white; width:100%; margin:8px 0; cursor:pointer; font-weight:600;">⏸️ SUSPENDER TAREA</button>`
    
    const disabled = !(document.getElementById('notaCliente')?.value || tarea.nota_cliente || '').trim()
    html += `<button class="btn-success" id="btnFinalizarTrabajo" ${disabled ? 'disabled style="opacity:0.5;"' : ''} style="padding:14px; border-radius:50px; border:none; color:white; width:100%; margin:8px 0; cursor:pointer; font-weight:600;">🏁 FINALIZAR TRABAJO</button>`
    
    content.innerHTML = html
    asignarEventosPantallaTrabajo(servicioTipo)
    cargarMaterialesListado()
}

function asignarEventosPantallaTrabajo(servicioTipo) {
    document.getElementById('btnVerOrdenTrabajo').onclick = () => 
        abrirOrdenTrabajoCompleta(tareaActual)
    
    document.getElementById('btnRegistrarMedicion').onclick = () => registrarMedicionTemp(servicioTipo)
    
    document.querySelectorAll('.btn-eliminar-medicion-listado').forEach(btn => {
        btn.onclick = () => {
            medicionesTemp.splice(parseInt(btn.dataset.idx), 1)
            renderizarPantallaTrabajo()
        }
    })
    
    document.getElementById('selectMaterial').onchange = function() {
        const selected = this.options[this.selectedIndex]
        document.getElementById('materialUnidad').value = selected?.dataset?.unidad || ''
        document.getElementById('materialPrecio').value = selected?.dataset?.precio || ''
    }
    
    document.getElementById('btnAgregarMaterial').onclick = agregarMaterialTarea
    document.getElementById('btnGuardarNotaInterna').onclick = async () => {
        const nota = document.getElementById('notaInterna').value
        await sb.from('tareas').update({ nota_interna: nota }).eq('id', tareaActual.id)
        mostrarMensaje('✅ Nota guardada', 'exito')
    }
    document.getElementById('btnGuardarInforme').onclick = async () => {
        const informe = document.getElementById('notaCliente').value
        await sb.from('tareas').update({ nota_cliente: informe }).eq('id', tareaActual.id)
        mostrarMensaje('✅ Informe guardado', 'exito')
        document.getElementById('btnFinalizarTrabajo').disabled = false
        document.getElementById('btnFinalizarTrabajo').style.opacity = '1'
    }
    document.getElementById('btnSuspenderTarea').onclick = async () => {
        await suspenderTarea(tareaActual.id)
        volverAlPanel()
    }
    document.getElementById('btnFinalizarTrabajo').onclick = async () => {
        const notaCliente = document.getElementById('notaCliente').value
        if (!notaCliente.trim()) {
            mostrarMensaje('❌ Completa el informe del cliente', 'error')
            return
        }
        await finalizarTrabajo(tareaActual.id)
        volverAlPanel()
    }
    document.getElementById('btnMostrarAlbaran')?.addEventListener('click', () => {
        const totalMateriales = calcularTotalMateriales(materialesTemp)
        mostrarModalAlbaran(totalMateriales, async (datos) => {
            await guardarAlbaran(datos)
        }, () => {})
    })
}

function registrarMedicionTemp(servicioTipo) {
    const medicion = obtenerMediciones(servicioTipo)
    if (!validarMediciones(medicion, servicioTipo)) {
        mostrarMensaje('❌ Introduce al menos un valor de medición', 'error')
        return
    }
    
    medicionesTemp.push({
        id: Date.now(),
        fecha: new Date().toISOString(),
        servicio_tipo: servicioTipo,
        parametros: { ...medicion },
        notas_tecnico: ''
    })
    
    limpiarMediciones(servicioTipo)
    renderizarPantallaTrabajo()
    guardarMedicion(tareaActual.id, {
        servicio_tipo: servicioTipo,
        parametros: medicion,
        notas_tecnico: '',
        fecha: new Date().toISOString()
    })
}

async function agregarMaterialTarea() {
    const select = document.getElementById('selectMaterial')
    const nombre = select?.value
    const cantidad = parseFloat(document.getElementById('materialCantidad')?.value) || 0
    const precioUnitario = parseFloat(document.getElementById('materialPrecio')?.value) || 0
    const unidad = document.getElementById('materialUnidad')?.value || 'unidad'
    
    if (!nombre || cantidad <= 0) {
        mostrarMensaje('Selecciona material y cantidad', 'error')
        return
    }
    
    const materialData = { nombre, cantidad, precioUnitario, unidad }
    const nuevoMaterial = await agregarMaterial(tareaActual.id, materialData)
    
    if (nuevoMaterial) {
        materialesTemp.push(nuevoMaterial)
        renderizarPantallaTrabajo()
        document.getElementById('selectMaterial').value = ''
        document.getElementById('materialCantidad').value = '1'
        document.getElementById('materialPrecio').value = ''
        document.getElementById('materialUnidad').value = ''
    }
}

function cargarMaterialesListado() {
    const container = document.getElementById('listadoMateriales')
    if (!container) return
    if (materialesTemp.length === 0) { container.innerHTML = ''; return }
    
    let html = ''
    materialesTemp.forEach((m, idx) => {
        const importe = typeof m.importe_total === 'number' ? m.importe_total.toFixed(2) : m.importe_total
        html += `<div style="display:flex; justify-content:space-between; padding:8px; background:var(--ios-bg); border-radius:8px; margin:4px 0;">
            <span>${m.descripcion} - ${importe}€</span>
            <button class="btn-eliminar-material-listado" data-idx="${idx}" style="background:#fee2e2; border:none; padding:4px 12px; border-radius:20px; color:var(--ios-red); cursor:pointer;">✖</button>
        </div>`
    })
    container.innerHTML = html
    
    document.querySelectorAll('.btn-eliminar-material-listado').forEach(btn => {
        btn.onclick = async () => {
            const idx = parseInt(btn.dataset.idx)
            const material = materialesTemp[idx]
            if (material.id) await eliminarMaterial(material.id)
            materialesTemp.splice(idx, 1)
            renderizarPantallaTrabajo()
        }
    })
}

async function guardarAlbaran(datos) {
    const { error } = await sb.from('facturas_externas').insert({
        tarea_id: tareaActual.id,
        tecnico_id: getCurrentPerfil()?.id,
        horas_trabajadas: datos.horas,
        precio_hora: datos.precioHora,
        total_materiales: calcularTotalMateriales(materialesTemp),
        total_dietas: datos.dietas,
        total_general: datos.total,
        pagada: false
    })
    if (error) {
        mostrarMensaje('❌ Error al guardar albarán', 'error')
    } else {
        mostrarMensaje('✅ Albarán guardado', 'exito')
    }
}

function volverAlPanel() {
    document.getElementById('trabajoScreen').style.display = 'none'
    document.getElementById('dashboardPanel').style.display = 'block'
    recargarTodo()
}

async function mostrarDetalleTarea(tarea) {
    const mediciones = await getMedicionesTarea(tarea.id)
    const materiales = await getMaterialesTarea(tarea.id)
    const seguimiento = await getSeguimientoTarea(tarea.id)
    const { tiempoDesplazamiento, tiempoTrabajo } = calcularTiemposTotales(seguimiento)
    
    let html = `<strong>📋 Nº:</strong> ${tarea.numero_tarea || tarea.id}<br>
        <strong>🏢 Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || '-')}<br>
        <strong>📅 Asignada:</strong> ${formatearFecha(tarea.fecha_asignacion)}<br>
        ${tarea.fecha_propuesta ? `<strong>📅 Propuesta:</strong> ${formatearFecha(tarea.fecha_propuesta)} a las ${tarea.hora_propuesta || '--:--'}<br>` : ''}
        ${tarea.completada_en ? `<strong>✅ Finalizada:</strong> ${new Date(tarea.completada_en).toLocaleString()}<br>` : ''}
        <hr><strong>⏱️ TIEMPOS:</strong><br>
        <div>🚗 Desplazamiento: ${formatearDuracion(tiempoDesplazamiento)}</div>
        <div>⚙️ Trabajo: ${formatearDuracion(tiempoTrabajo)}</div>`
    
    if (mediciones.length > 0) {
        html += `<hr><strong>📊 Mediciones:</strong><br>${mediciones.map(m => `<div>${formatearMedicion(m)}</div>`).join('')}`
    }
    if (materiales.length > 0) {
        html += `<hr><strong>🧰 Materiales:</strong><br>${materiales.map(m => `<div>${m.descripcion} - ${m.importe_total?.toFixed(2) || 0}€</div>`).join('')}`
    }
    mostrarModalDetalleTarea(html)
}

function formatearDuracion(minutos) {
    if (!minutos && minutos !== 0) return 'No registrado'
    if (minutos === 0) return '1 min'
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0 && mins > 0) return `${horas}h ${mins}min`
    if (horas > 0) return `${horas}h`
    return `${mins}min`
}

function renderizarSeguimiento() {
    const container = document.getElementById('contenidoPanel')
    container.innerHTML = `<div class="container"><div class="card">
        <div class="card-header">⏱️ Historial de trabajo</div>
        <div class="text-center" style="padding:40px; color:var(--ios-gray);">
            <p>📊 Resumen de tu actividad</p>
            <p style="font-size:13px; margin-top:8px;">Tareas completadas: ${getTareasCompletadas().length}</p>
            <p style="font-size:13px;">Tareas activas: ${getTareasActivas().length}</p>
        </div>
    </div></div>`
}

export default { init }