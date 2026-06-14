// tecnico/js/main.js
// Punto de entrada principal del panel técnico

import { sb } from './config/supabase.js'
import { 
    hacerLogin, cerrarSesion, verificarSesion, 
    getCurrentUser, getCurrentPerfil, getIsExterno 
} from './modules/auth.js'
import {
    cargarTareas, getTareasNuevas, getTareasActivas, 
    getTareasCompletadas, getContadores, getTareaById,
    aceptarTarea, cancelarTarea, guardarNotaInterna, 
    guardarInformeCliente, marcarComoLeida
} from './modules/tareas.js'
import {
    registrarEvento,
    suspenderTarea, 
    finalizarTrabajo,
    getSeguimientoTarea, 
    calcularTiemposTotales
} from './modules/seguimiento.js'
import {
    renderizarMediciones, obtenerMediciones, limpiarMediciones,
    validarMediciones, guardarMedicion, getMedicionesTarea,
    formatearMedicion
} from './modules/mediciones.js'
import {
    materialesPorServicio, renderizarSelectMateriales,
    agregarMaterial, eliminarMaterial, getMaterialesTarea,
    calcularTotalMateriales
} from './modules/materiales.js'
import {
    renderizarListaTareas, renderizarListaCompletadas,
    renderizarPerfil, renderizarFiltrosCompletadas,
    actualizarContadores, mostrarModalAceptarTarea,
    mostrarModalInforme, mostrarModalAlbaran,
    mostrarModalDetalleTarea, mostrarModalOrdenTrabajo,
    cerrarTodosModales
} from './modules/ui.js'
import { mostrarMensaje, formatearFecha, escapeHtml, getNowLocalISO } from './modules/utils.js'

// ============================================================
// VARIABLES GLOBALES DEL MÓDULO
// ============================================================

let tabActiva = 'nuevas'
let tareasFiltradas = []
let tareaActual = null
let pasoActual = 0
let medicionesTemp = []
let materialesTemp = []
let autoSaveInterval = null
let pendingActions = []  // Cola de acciones pendientes sin internet

// ============================================================
// AUTO-GUARDADO DE PROGRESO LOCAL
// ============================================================

function guardarProgresoLocal() {
    if (!tareaActual) return
    
    const progreso = {
        tareaId: tareaActual.id,
        pasoActual: pasoActual,
        notaInterna: document.getElementById('notaInterna')?.value || '',
        notaCliente: document.getElementById('notaCliente')?.value || '',
        medicionesTemp: medicionesTemp,
        materialesTemp: materialesTemp,
        timestamp: Date.now()
    }
    
    localStorage.setItem(`progreso_tarea_${tareaActual.id}`, JSON.stringify(progreso))
    
    const indicator = document.getElementById('btnAutoSaveIndicator')
    if (indicator) {
        indicator.innerHTML = '💾 Guardado automático'
        setTimeout(() => {
            if (indicator) indicator.innerHTML = '💾 Guardado'
        }, 2000)
    }
    
    console.log('📦 Progreso guardado localmente')
}

function cargarProgresoLocal(tareaId) {
    const stored = localStorage.getItem(`progreso_tarea_${tareaId}`)
    if (!stored) return false
    
    try {
        const progreso = JSON.parse(stored)
        
        const tareaEstaActiva = tareaActual.estado !== 'completada' && 
                                tareaActual.estado !== 'cancelada' &&
                                tareaActual.estado !== 'facturada'
        
        if (progreso.tareaId === tareaId && tareaEstaActiva) {
            pasoActual = progreso.pasoActual
            medicionesTemp = progreso.medicionesTemp || []
            materialesTemp = progreso.materialesTemp || []
            
            setTimeout(() => {
                const notaInterna = document.getElementById('notaInterna')
                const notaCliente = document.getElementById('notaCliente')
                if (notaInterna) notaInterna.value = progreso.notaInterna || ''
                if (notaCliente) notaCliente.value = progreso.notaCliente || ''
            }, 100)
            
            mostrarMensaje('📦 Progreso recuperado automáticamente', 'exito')
            console.log('📦 Progreso restaurado:', progreso)
            return true
        } else {
            localStorage.removeItem(`progreso_tarea_${tareaId}`)
        }
    } catch(e) { 
        console.error('Error cargando progreso:', e)
    }
    return false
}

function limpiarProgresoLocal(tareaId) {
    localStorage.removeItem(`progreso_tarea_${tareaId}`)
    console.log('🗑️ Progreso local limpiado para tarea:', tareaId)
}

// ============================================================
// SISTEMA OFFLINE-FIRST (cola de acciones pendientes)
// ============================================================

function queueAction(actionType, data) {
    const action = {
        id: Date.now(),
        type: actionType,
        data: data,
        timestamp: Date.now(),
        synced: false
    }
    
    pendingActions.push(action)
    localStorage.setItem('pending_actions', JSON.stringify(pendingActions))
    console.log('📦 Acción encolada (sin internet):', action)
}

async function syncPendingActions() {
    if (!navigator.onLine) {
        console.log('📡 Sin conexión, acciones pendientes:', pendingActions.length)
        return
    }
    
    if (pendingActions.length === 0) return
    
    console.log('🔄 Sincronizando', pendingActions.length, 'acciones...')
    
    for (const action of pendingActions) {
        if (action.synced) continue
        
        try {
            if (action.type === 'REGISTRAR_EVENTO') {
                await registrarEvento(action.data.tareaId, action.data.evento, action.data.motivo)
            } else if (action.type === 'GUARDAR_MEDICION') {
                await guardarMedicion(action.data.tareaId, action.data.medicion)
            } else if (action.type === 'AGREGAR_MATERIAL') {
                await agregarMaterial(action.data.tareaId, action.data.material)
            } else if (action.type === 'GUARDAR_NOTA_INTERNA') {
                await guardarNotaInterna(action.data.tareaId, action.data.texto)
            } else if (action.type === 'GUARDAR_INFORME') {
                await guardarInformeCliente(action.data.tareaId, action.data.texto)
            }
            
            action.synced = true
            console.log('✅ Acción sincronizada:', action.type)
            
        } catch (error) {
            console.error('❌ Error sincronizando:', action.type, error)
        }
    }
    
    pendingActions = pendingActions.filter(a => !a.synced)
    localStorage.setItem('pending_actions', JSON.stringify(pendingActions))
    
    console.log('✅ Sincronización completada. Pendientes:', pendingActions.length)
}

// Función offline-first para registrar evento
async function registrarEventoOffline(tareaId, evento, motivo = null) {
    if (!navigator.onLine) {
        queueAction('REGISTRAR_EVENTO', { tareaId, evento, motivo })
        mostrarMensaje('📦 Sin conexión. Se guardará al recuperar internet', 'info')
        
        // Actualizar UI localmente
        if (evento === 'INICIO_DESPLAZAMIENTO') {
            pasoActual = 2
            renderizarPantallaTrabajo()
        } else if (evento === 'LLEGADA') {
            pasoActual = 4
            renderizarPantallaTrabajo()
        } else if (evento === 'INICIO_TRABAJO') {
            pasoActual = 4
            renderizarPantallaTrabajo()
        }
        guardarProgresoLocal()
        return true
    }
    
    return await registrarEvento(tareaId, evento, motivo)
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

export async function init() {
    console.log('🚀 Iniciando Panel Técnico')
    
    // Cargar acciones pendientes guardadas
    const stored = localStorage.getItem('pending_actions')
    if (stored) {
        pendingActions = JSON.parse(stored)
        console.log('📦 Acciones pendientes cargadas:', pendingActions.length)
        if (navigator.onLine && pendingActions.length > 0) {
            syncPendingActions()
        }
    }
    
    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
        console.log('🌐 Conexión recuperada, sincronizando...')
        syncPendingActions()
    })
    
    window.addEventListener('offline', () => {
        console.log('⚠️ Sin conexión, los datos se guardarán localmente')
    })
    
    // Sincronizar cada 30 segundos
    setInterval(() => {
        if (navigator.onLine && pendingActions.length > 0) {
            syncPendingActions()
        }
    }, 30000)
    
    setupLoginListener()
    
    const tieneSesion = await verificarSesion()
    if (tieneSesion) {
        await mostrarDashboard()
    } else {
        mostrarLoginPanel()
    }
}

function setupLoginListener() {
    const btnLogin = document.getElementById('btnLogin')
    if (btnLogin) {
        const newBtn = btnLogin.cloneNode(true)
        btnLogin.parentNode.replaceChild(newBtn, btnLogin)
        
        newBtn.onclick = async () => {
            const identificador = document.getElementById('identificador').value.trim()
            const password = document.getElementById('password').value
            
            try {
                await hacerLogin(identificador, password)
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
    const trabajoScreen = document.getElementById('trabajoScreen')
    
    if (loginPanel) loginPanel.style.display = 'flex'
    if (dashboardPanel) dashboardPanel.style.display = 'none'
    if (trabajoScreen) trabajoScreen.style.display = 'none'
    
    const errorMsg = document.getElementById('errorMsg')
    if (errorMsg) errorMsg.innerText = ''
    
    const identificador = document.getElementById('identificador')
    const password = document.getElementById('password')
    if (identificador) identificador.value = ''
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
    
    setupDashboardListeners()
    
    const perfil = getCurrentPerfil()
    const empresaInfo = await getEmpresaInfo()
    
    const nombreTecnico = document.getElementById('nombreTecnico')
    const emailTecnico = document.getElementById('emailTecnico')
    const nombreEmpresaBanner = document.getElementById('nombreEmpresaBanner')
    
    if (nombreTecnico) nombreTecnico.innerHTML = perfil?.nombre_razon_social || 'Técnico'
    if (emailTecnico) emailTecnico.innerHTML = getCurrentUser()?.email || ''
    if (nombreEmpresaBanner) nombreEmpresaBanner.innerHTML = empresaInfo?.nombre_empresa || 'Mi Empresa'
    
    await recargarTodo()
}

function setupDashboardListeners() {
    const btnLogout = document.getElementById('btnLogout')
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true)
        btnLogout.parentNode.replaceChild(newBtn, btnLogout)
        newBtn.onclick = async () => {
            await cerrarSesion()
            mostrarLoginPanel()
        }
    }
    
    const btnRefrescar = document.getElementById('btnRefrescar')
    if (btnRefrescar) {
        const newBtn = btnRefrescar.cloneNode(true)
        btnRefrescar.parentNode.replaceChild(newBtn, btnRefrescar)
        newBtn.onclick = async () => {
            mostrarMensaje('🔄 Refrescando...', 'exito')
            await recargarTodo()
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
    
    const btnBack = document.getElementById('btnBackTrabajo')
    if (btnBack) {
        const newBtn = btnBack.cloneNode(true)
        btnBack.parentNode.replaceChild(newBtn, btnBack)
        newBtn.onclick = volverAlPanel
    }
}

async function getEmpresaInfo() {
    const empresaId = getCurrentPerfil()?.empresa_id
    if (!empresaId) return { nombre_empresa: 'Sin empresa' }
    
    try {
        const { data, error } = await sb
            .from('empresas')
            .select('nombre_empresa')
            .eq('id', empresaId)
            .maybeSingle()
        
        if (error || !data) return { nombre_empresa: 'Empresa no encontrada' }
        return data
    } catch (error) {
        console.error('Error en getEmpresaInfo:', error)
        return { nombre_empresa: 'Error' }
    }
}

// ============================================================
// RECARGAR TODO
// ============================================================

async function recargarTodo() {
    await cargarTareas()
    actualizarContadores(
        getTareasNuevas().length,
        getTareasActivas().length,
        getTareasCompletadas().length
    )
    renderizarPanel()
}

// ============================================================
// RENDERIZAR PANEL PRINCIPAL
// ============================================================

function renderizarPanel() {
    const container = document.getElementById('contenidoPanel')
    if (!container) return
    
    let contenido = ''
    
    if (tabActiva === 'nuevas') {
        contenido = renderizarListaTareas(getTareasNuevas(), 'nuevas')
    } else if (tabActiva === 'activas') {
        contenido = renderizarListaTareas(getTareasActivas(), 'activas')
    } else if (tabActiva === 'completadas') {
        tareasFiltradas = [...getTareasCompletadas()]
        contenido = renderizarFiltrosCompletadas() + renderizarListaCompletadas(tareasFiltradas)
    } else if (tabActiva === 'perfil') {
        const perfil = getCurrentPerfil()
        contenido = renderizarPerfil(
            perfil?.nombre_razon_social || 'Técnico',
            getCurrentUser()?.email || '',
            getIsExterno()
        )
    }
    
    container.innerHTML = contenido
    
    if (tabActiva === 'nuevas' || tabActiva === 'activas') {
        document.querySelectorAll('.btn-leer').forEach(btn => {
            btn.onclick = () => abrirTarea(btn.dataset.id, btn.dataset.tipo)
        })
    } else if (tabActiva === 'completadas') {
        document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
            btn.onclick = () => verDetalleCompletada(btn.dataset.id)
        })
        
        const btnFiltrar = document.getElementById('btnFiltrar')
        const btnLimpiar = document.getElementById('btnLimpiarFiltros')
        const filtroBuscar = document.getElementById('filtroBuscar')
        const filtroTipo = document.getElementById('filtroTipo')
        const filtroFechaDesde = document.getElementById('filtroFechaDesde')
        const filtroFechaHasta = document.getElementById('filtroFechaHasta')
        
        if (btnFiltrar) btnFiltrar.onclick = aplicarFiltrosCompletadas
        if (btnLimpiar) btnLimpiar.onclick = limpiarFiltrosCompletadas
        if (filtroBuscar) filtroBuscar.oninput = aplicarFiltrosCompletadas
        if (filtroTipo) filtroTipo.onchange = aplicarFiltrosCompletadas
        if (filtroFechaDesde) filtroFechaDesde.onchange = aplicarFiltrosCompletadas
        if (filtroFechaHasta) filtroFechaHasta.onchange = aplicarFiltrosCompletadas
    } else if (tabActiva === 'perfil') {
        const btnCerrarSesion = document.getElementById('btnCerrarSesionPerfil')
        if (btnCerrarSesion) {
            btnCerrarSesion.onclick = async () => {
                await cerrarSesion()
                mostrarLoginPanel()
            }
        }
    }
}

// ============================================================
// FILTROS PARA COMPLETADAS
// ============================================================

function aplicarFiltrosCompletadas() {
    const todas = getTareasCompletadas()
    const buscar = document.getElementById('filtroBuscar')?.value.toLowerCase() || ''
    const tipo = document.getElementById('filtroTipo')?.value || ''
    const desde = document.getElementById('filtroFechaDesde')?.value
    const hasta = document.getElementById('filtroFechaHasta')?.value
    
    tareasFiltradas = todas.filter(t => {
        if (buscar) {
            const texto = `${t.empresas?.nombre_empresa} ${t.activos?.nombre}`.toLowerCase()
            if (!texto.includes(buscar)) return false
        }
        if (tipo && t.prioridad !== tipo) return false
        if (desde && t.completada_en?.split('T')[0] < desde) return false
        if (hasta && t.completada_en?.split('T')[0] > hasta) return false
        return true
    })
    
    const container = document.getElementById('contenidoPanel')
    if (container) {
        container.innerHTML = renderizarFiltrosCompletadas() + renderizarListaCompletadas(tareasFiltradas)
        document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
            btn.onclick = () => verDetalleCompletada(btn.dataset.id)
        })
        const btnFiltrar = document.getElementById('btnFiltrar')
        const btnLimpiar = document.getElementById('btnLimpiarFiltros')
        if (btnFiltrar) btnFiltrar.onclick = aplicarFiltrosCompletadas
        if (btnLimpiar) btnLimpiar.onclick = limpiarFiltrosCompletadas
    }
}

function limpiarFiltrosCompletadas() {
    const inputs = ['filtroBuscar', 'filtroFechaDesde', 'filtroFechaHasta']
    inputs.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.value = ''
    })
    const select = document.getElementById('filtroTipo')
    if (select) select.value = ''
    aplicarFiltrosCompletadas()
}

// ============================================================
// VER DETALLE DE TAREA COMPLETADA
// ============================================================

async function verDetalleCompletada(id) {
    const tarea = await getTareaById(id)
    if (!tarea) return
    
    const mediciones = await getMedicionesTarea(id)
    const materiales = await getMaterialesTarea(id)
    const seguimiento = await getSeguimientoTarea(id)
    const { tiempoDesplazamiento, tiempoTrabajo } = calcularTiemposTotales(seguimiento)
    
    const eventosPorDia = new Map()
    seguimiento.forEach(ev => {
        const fechaStr = ev.inicio ? ev.inicio.split('T')[0] : 'Sin fecha'
        if (!eventosPorDia.has(fechaStr)) eventosPorDia.set(fechaStr, [])
        eventosPorDia.get(fechaStr).push(ev)
    })
    
    let html = `
        <strong>📋 ID:</strong> ${tarea.numero_tarea || tarea.id}<br>
        <strong>🏢 Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || '-')}<br>
        <strong>📅 Fecha asignación:</strong> ${formatearFecha(tarea.fecha_asignacion)}<br>
        ${tarea.fecha_propuesta ? `<strong>📅 Fecha propuesta:</strong> ${formatearFecha(tarea.fecha_propuesta)} a las ${tarea.hora_propuesta || '--:--'}<br>` : ''}
        ${tarea.completada_en ? `<strong>✅ Fecha finalización:</strong> ${new Date(tarea.completada_en).toLocaleString()}<br>` : ''}
        <hr>
        <strong>⏱️ TIEMPOS TOTALES:</strong><br>
        <div class="tiempo-linea"><span class="tiempo-titulo">🚗 Tiempo de desplazamiento:</span><span>${formatearDuracion(tiempoDesplazamiento)}</span></div>
        <div class="tiempo-linea"><span class="tiempo-titulo">⚙️ Tiempo de trabajo efectivo:</span><span>${formatearDuracion(tiempoTrabajo)}</span></div>
    `
    
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

// ============================================================
// ABRIR TAREA (PANTALLA DE TRABAJO)
// ============================================================

async function abrirTarea(id, tipo) {
    const tarea = await getTareaById(id)
    if (!tarea) return
    
    tareaActual = tarea
    
    if (tarea.estado === 'pendiente' && !tarea.leida) {
        mostrarModalAceptarTarea(
            tarea.orden_trabajo,
            async (fecha, hora) => {
                await aceptarTarea(id, fecha, hora)
                await recargarTodo()
                abrirTarea(id, 'activa')
            },
            async (motivo) => {
                await cancelarTarea(id, motivo)
                await recargarTodo()
                volverAlPanel()
            },
            () => {
                console.log('Usuario volvió sin aceptar ni rechazar')
                volverAlPanel()
            }
        )
        return
    }
    
    // Recuperar progreso guardado si existe
    let progresoRecuperado = false
    if (tarea.estado !== 'completada' && tarea.estado !== 'cancelada' && tarea.estado !== 'facturada') {
        progresoRecuperado = cargarProgresoLocal(id)
    }
    
    // Solo determinar paso según estado si NO hay progreso recuperado
    if (!progresoRecuperado) {
        if (tarea.estado === 'en_progreso') pasoActual = 1
        else if (tarea.estado === 'desplazamiento') pasoActual = 2
        else if (tarea.estado === 'suspendida') pasoActual = 1
        else pasoActual = 1
    }
    
    materialesTemp = await getMaterialesTarea(id)
    
    // Si no hay mediciones temporales recuperadas, inicializar vacío
    if (!medicionesTemp || medicionesTemp.length === 0) {
        medicionesTemp = []
    }
    
    const trabajoTitulo = document.getElementById('trabajoTitulo')
    if (trabajoTitulo) trabajoTitulo.innerHTML = tarea.activos?.nombre || tarea.titulo || 'Tarea'
    
    const trabajoScreen = document.getElementById('trabajoScreen')
    const dashboardPanel = document.getElementById('dashboardPanel')
    if (trabajoScreen) trabajoScreen.style.display = 'block'
    if (dashboardPanel) dashboardPanel.style.display = 'none'
    
    renderizarPantallaTrabajo()
    
    if (autoSaveInterval) clearInterval(autoSaveInterval)
    autoSaveInterval = setInterval(() => guardarProgresoLocal(), 30000)
}

// ============================================================
// RENDERIZAR PANTALLA DE TRABAJO
// ============================================================

function renderizarPantallaTrabajo() {
    const content = document.getElementById('trabajoContent')
    if (!content) return
    
    const servicioTipo = tareaActual.servicio_tipo || 'OTRO'
    
    let html = `
        <div class="stepper">
            <div class="step ${pasoActual >= 1 ? 'completed' : ''} ${pasoActual === 1 ? 'active' : ''}">
                <span class="step-icon">🚗</span><span>Desplazamiento</span>
            </div>
            <div class="step ${pasoActual >= 2 ? 'completed' : ''} ${pasoActual === 2 ? 'active' : ''}">
                <span class="step-icon">📍</span><span>Llegada</span>
            </div>
            <div class="step ${pasoActual >= 4 ? 'completed' : ''} ${pasoActual === 4 ? 'active' : ''}">
                <span class="step-icon">⚙️</span><span>Trabajo</span>
            </div>
            <div class="step ${pasoActual >= 5 ? 'completed' : ''} ${pasoActual === 5 ? 'active' : ''}">
                <span class="step-icon">🏁</span><span>Cierre</span>
            </div>
        </div>
        
        <div class="form-group">
            <label>📋 ORDEN DE TRABAJO</label>
            <button class="btn-orden-trabajo" id="btnVerOrdenTrabajo">📄 Ver orden de trabajo</button>
        </div>
    `
    
    if (pasoActual === 1) {
        html += `
            <div class="card-tarea" style="text-align: center; margin-top: 20px;">
                <h3>🚗 Fase de Desplazamiento</h3>
                <p>Registra el inicio de tu desplazamiento hacia el lugar de trabajo.</p>
                <button class="action-btn" id="btnIniciarDesplazamiento">🚗 INICIAR DESPLAZAMIENTO</button>
                <button class="action-btn action-btn-danger" id="btnCancelarTarea">❌ CANCELAR TAREA</button>
            </div>
        `
    } else if (pasoActual === 2) {
        html += `
            <div class="card-tarea" style="text-align: center; margin-top: 20px;">
                <h3>📍 ¿Has llegado al lugar?</h3>
                <p>Registra tu llegada. Esto finalizará el tiempo de desplazamiento.</p>
                <button class="action-btn" id="btnRegistrarLlegada">📍 REGISTRAR LLEGADA</button>
                <button class="action-btn action-btn-danger" id="btnCancelarTarea">❌ CANCELAR TAREA</button>
            </div>
        `
    } else if (pasoActual === 4) {
        html += `
            <div class="card-tarea">
                <h3>⚙️ Registro de trabajo</h3>
                <p>Registra las mediciones, materiales y observaciones.</p>
            </div>
        `
        html += renderizarMediciones(servicioTipo)
        html += `<div class="button-group-right"><button class="btn-add-material" id="btnRegistrarMedicion">➕ Registrar medición</button></div>`
        
        if (medicionesTemp.length > 0) {
            html += `<div class="mediciones-list"><label>📊 Mediciones registradas:</label>`
            medicionesTemp.forEach((med, idx) => {
                const texto = formatearMedicion({ parametros: med.parametros, created_at: med.fecha })
                html += `<div class="medicion-listado-item">
                    <span class="medicion-listado-info">${texto}</span>
                    <button class="btn-eliminar-medicion-listado" data-idx="${idx}">✖</button>
                </div>`
            })
            html += `</div>`
        }
        
        html += `
            <div class="form-group">
                <label>🧰 MATERIALES USADOS</label>
                <div class="material-row">
                    <select id="selectMaterial" class="material-select">
                        ${renderizarSelectMateriales(servicioTipo)}
                    </select>
                    <input type="number" id="materialCantidad" class="material-cantidad" placeholder="Cantidad" step="0.01" value="1">
                    <input type="number" id="materialPrecio" class="material-precio" placeholder="Precio unitario (€)" step="0.01" readonly>
                    <input type="text" id="materialUnidad" class="material-unidad" placeholder="Unidad" readonly>
                    <button class="btn-add-material" id="btnAgregarMaterial">➕ Añadir</button>
                </div>
                <div id="listadoMateriales"></div>
            </div>
            
            <div class="form-group">
                <label>📝 NOTA INTERNA (solo para ti)</label>
                <textarea id="notaInterna" rows="2" placeholder="Escribe aquí tus notas...">${tareaActual.nota_interna || ''}</textarea>
                <div class="button-group-right">
                    <button class="btn-ia" id="btnGuardarNotaInterna">💾 Guardar</button>
                </div>
            </div>
            
            <div class="form-group nota-obligatoria">
                <label>📝 INFORME PARA EL CLIENTE</label>
                <textarea id="notaCliente" rows="3" placeholder="Describe el trabajo realizado...">${tareaActual.nota_cliente || ''}</textarea>
                <div class="button-group-right">
                    <button class="btn-ia" id="btnGuardarInforme">💾 Guardar</button>
                </div>
                <small>⚠️ Completa este informe antes de finalizar la tarea</small>
            </div>
            
            <div class="form-group">
                <label>📎 ADJUNTAR FOTOS / JUSTIFICANTES</label>
                <div class="upload-area" id="uploadArea">📸 Haz clic o arrastra para subir foto</div>
                <input type="file" id="fileInput" accept="image/*,application/pdf" style="display:none;" multiple>
                <div id="adjuntosContainer" class="adjuntos-list"></div>
            </div>
        `
        
        if (getIsExterno()) {
            html += `<button class="action-btn" id="btnMostrarAlbaran" style="background:#6b21a5;">💰 REGISTRAR ALBARÁN</button>`
        }
        
        html += `<button class="action-btn action-btn-secondary" id="btnSuspenderTarea">⏸️ SUSPENDER TAREA</button>`
        
        const notaClienteActual = document.getElementById('notaCliente')?.value || tareaActual.nota_cliente || ''
        const disabled = !notaClienteActual.trim() ? 'disabled' : ''
        html += `<button class="action-btn" id="btnFinalizarTrabajo" ${disabled}>🏁 FINALIZAR TRABAJO</button>`
    }
    
    content.innerHTML = html
    asignarEventosPantallaTrabajo(servicioTipo)
    cargarMaterialesListado()
    cargarAdjuntos()
}

// ============================================================
// ASIGNAR EVENTOS DE LA PANTALLA DE TRABAJO
// ============================================================

function asignarEventosPantallaTrabajo(servicioTipo) {
    const btnOrden = document.getElementById('btnVerOrdenTrabajo')
    if (btnOrden) btnOrden.onclick = () => mostrarModalOrdenTrabajo(tareaActual.orden_trabajo)
    
    const btnDesplazamiento = document.getElementById('btnIniciarDesplazamiento')
    if (btnDesplazamiento) {
        btnDesplazamiento.onclick = async () => {
            await registrarEventoOffline(tareaActual.id, 'INICIO_DESPLAZAMIENTO')
            pasoActual = 2
            renderizarPantallaTrabajo()
            guardarProgresoLocal()
        }
    }
    
    const btnLlegada = document.getElementById('btnRegistrarLlegada')
    if (btnLlegada) {
        btnLlegada.onclick = async () => {
            await registrarEventoOffline(tareaActual.id, 'LLEGADA')
            pasoActual = 4
            renderizarPantallaTrabajo()
            guardarProgresoLocal()
        }
    }
    
    const btnInicioTrabajo = document.getElementById('btnIniciarTrabajo')
    if (btnInicioTrabajo) {
        btnInicioTrabajo.onclick = async () => {
            await registrarEventoOffline(tareaActual.id, 'INICIO_TRABAJO')
            pasoActual = 4
            renderizarPantallaTrabajo()
            guardarProgresoLocal()
        }
    }
    
    const btnCancelar = document.getElementById('btnCancelarTarea')
    if (btnCancelar) {
        btnCancelar.onclick = async () => {
            const motivo = prompt('Motivo de cancelación:')
            if (motivo) {
                await cancelarTarea(tareaActual.id, motivo)
                limpiarProgresoLocal(tareaActual.id)
                volverAlPanel()
            }
        }
    }
    
    const btnSuspender = document.getElementById('btnSuspenderTarea')
    if (btnSuspender) {
        btnSuspender.onclick = async () => {
            await suspenderTarea(tareaActual.id)
            guardarProgresoLocal()
            volverAlPanel()
        }
    }
    
    const btnFinalizar = document.getElementById('btnFinalizarTrabajo')
    if (btnFinalizar) {
        btnFinalizar.onclick = async () => {
            const notaCliente = document.getElementById('notaCliente')?.value || ''
            if (!notaCliente.trim()) {
                mostrarMensaje('❌ Completa el informe del cliente antes de finalizar', 'error')
                return
            }
            await finalizarTrabajoCompleto()
        }
    }
    
    const btnRegMedicion = document.getElementById('btnRegistrarMedicion')
    if (btnRegMedicion) {
        btnRegMedicion.onclick = () => registrarMedicionTemp(servicioTipo)
    }
    
    document.querySelectorAll('.btn-eliminar-medicion-listado').forEach(btn => {
        btn.onclick = () => eliminarMedicionTemp(parseInt(btn.dataset.idx))
    })
    
    const selectMaterial = document.getElementById('selectMaterial')
    if (selectMaterial) {
        selectMaterial.onchange = function() {
            const selected = this.options[this.selectedIndex]
            const unidad = selected?.dataset?.unidad || ''
            const precio = selected?.dataset?.precio || ''
            const unidadInput = document.getElementById('materialUnidad')
            const precioInput = document.getElementById('materialPrecio')
            if (unidadInput) unidadInput.value = unidad
            if (precioInput) precioInput.value = precio
        }
    }
    
    const btnAgregarMaterial = document.getElementById('btnAgregarMaterial')
    if (btnAgregarMaterial) {
        btnAgregarMaterial.onclick = () => agregarMaterialTarea()
    }
    
    const btnGuardarNota = document.getElementById('btnGuardarNotaInterna')
    if (btnGuardarNota) {
        btnGuardarNota.onclick = () => {
            const nota = document.getElementById('notaInterna')?.value || ''
            guardarNotaInterna(tareaActual.id, nota)
            guardarProgresoLocal()
        }
    }
    
    const btnGuardarInforme = document.getElementById('btnGuardarInforme')
    if (btnGuardarInforme) {
        btnGuardarInforme.onclick = () => {
            const informe = document.getElementById('notaCliente')?.value || ''
            guardarInformeCliente(tareaActual.id, informe)
            guardarProgresoLocal()
            const btnFinalizarTmp = document.getElementById('btnFinalizarTrabajo')
            if (btnFinalizarTmp && informe.trim()) {
                btnFinalizarTmp.disabled = false
            }
        }
    }
    
    const btnAlbaran = document.getElementById('btnMostrarAlbaran')
    if (btnAlbaran) {
        btnAlbaran.onclick = () => {
            const totalMateriales = calcularTotalMateriales(materialesTemp)
            mostrarModalAlbaran(totalMateriales, async (datos) => {
                await guardarAlbaran(datos)
            }, () => {})
        }
    }
    
    configurarSubidaAdjuntos()
}

// ============================================================
// MEDICIONES
// ============================================================

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
    guardarProgresoLocal()
    
    // Si hay internet, guardar inmediatamente
    if (navigator.onLine) {
        guardarMedicion(tareaActual.id, {
            servicio_tipo: servicioTipo,
            parametros: medicion,
            notas_tecnico: '',
            fecha: new Date().toISOString()
        })
    } else {
        queueAction('GUARDAR_MEDICION', {
            tareaId: tareaActual.id,
            medicion: {
                servicio_tipo: servicioTipo,
                parametros: medicion,
                notas_tecnico: '',
                fecha: new Date().toISOString()
            }
        })
        mostrarMensaje('📦 Sin conexión. Medición guardada localmente', 'info')
    }
}

function eliminarMedicionTemp(idx) {
    medicionesTemp.splice(idx, 1)
    renderizarPantallaTrabajo()
    guardarProgresoLocal()
}

// ============================================================
// MATERIALES
// ============================================================

async function agregarMaterialTarea() {
    const select = document.getElementById('selectMaterial')
    const nombre = select?.value
    const cantidad = parseFloat(document.getElementById('materialCantidad')?.value) || 0
    const precioUnitario = parseFloat(document.getElementById('materialPrecio')?.value) || 0
    const unidad = document.getElementById('materialUnidad')?.value || 'unidad'
    
    if (!nombre || cantidad <= 0) {
        mostrarMensaje('Selecciona un material y cantidad válida', 'error')
        return
    }
    
    const materialData = { nombre, cantidad, precioUnitario, unidad }
    
    if (!navigator.onLine) {
        // Sin internet: guardar en cola y en local temporal
        const materialTemp = {
            id: Date.now(),
            descripcion: `${nombre}: ${cantidad} ${unidad} (${precioUnitario.toFixed(2)}€/${unidad})`,
            importe_total: cantidad * precioUnitario
        }
        materialesTemp.push(materialTemp)
        queueAction('AGREGAR_MATERIAL', { tareaId: tareaActual.id, material: materialData })
        mostrarMensaje('📦 Sin conexión. Material guardado localmente', 'info')
        renderizarPantallaTrabajo()
        guardarProgresoLocal()
        return
    }
    
    const nuevoMaterial = await agregarMaterial(tareaActual.id, materialData)
    if (nuevoMaterial) {
        materialesTemp.push(nuevoMaterial)
        renderizarPantallaTrabajo()
        guardarProgresoLocal()
        
        select.value = ''
        document.getElementById('materialCantidad').value = '1'
        document.getElementById('materialPrecio').value = ''
        document.getElementById('materialUnidad').value = ''
    }
}

function cargarMaterialesListado() {
    const container = document.getElementById('listadoMateriales')
    if (!container) return
    
    if (materialesTemp.length === 0) {
        container.innerHTML = ''
        return
    }
    
    let html = ''
    materialesTemp.forEach((m, idx) => {
        const importe = typeof m.importe_total === 'number' ? m.importe_total.toFixed(2) : m.importe_total
        html += `
            <div class="material-listado-item">
                <span class="material-listado-info">${m.descripcion} - ${importe}€</span>
                <button class="btn-eliminar-material-listado" data-idx="${idx}">✖</button>
            </div>
        `
    })
    container.innerHTML = html
    
    document.querySelectorAll('.btn-eliminar-material-listado').forEach(btn => {
        btn.onclick = async () => {
            const idx = parseInt(btn.dataset.idx)
            const material = materialesTemp[idx]
            if (material.id && navigator.onLine) {
                await eliminarMaterial(material.id)
            }
            materialesTemp.splice(idx, 1)
            renderizarPantallaTrabajo()
            guardarProgresoLocal()
        }
    })
}

// ============================================================
// ADJUNTOS
// ============================================================

async function configurarSubidaAdjuntos() {
    const uploadArea = document.getElementById('uploadArea')
    const fileInput = document.getElementById('fileInput')
    
    if (!uploadArea || !fileInput) return
    
    uploadArea.onclick = () => fileInput.click()
    
    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files)
        for (const file of files) {
            await subirAdjunto(file)
        }
        fileInput.value = ''
        cargarAdjuntos()
    }
    
    uploadArea.ondragover = (e) => e.preventDefault()
    uploadArea.ondrop = async (e) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files)
        for (const file of files) {
            await subirAdjunto(file)
        }
        cargarAdjuntos()
    }
}

async function subirAdjunto(file) {
    if (!navigator.onLine) {
        mostrarMensaje('📦 Sin conexión. No se pueden subir archivos', 'error')
        return null
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${getCurrentPerfil()?.id}/${tareaActual.id}/${fileName}`
    
    const { error } = await sb.storage.from('tarea-adjuntos').upload(filePath, file)
    if (error) {
        mostrarMensaje('Error al subir archivo: ' + error.message, 'error')
        return null
    }
    
    const { data: urlData } = sb.storage.from('tarea-adjuntos').getPublicUrl(filePath)
    
    await sb.from('adjuntos_tarea').insert({
        tarea_id: tareaActual.id,
        tecnico_id: getCurrentPerfil()?.id,
        nombre_archivo: file.name,
        tipo_archivo: file.type,
        url: urlData.publicUrl,
        tamano_bytes: file.size,
        subido_en: new Date().toISOString(),
        es_justificante: true
    })
    
    mostrarMensaje(`✅ ${file.name} subido`, 'exito')
    return true
}

async function cargarAdjuntos() {
    const { data } = await sb
        .from('adjuntos_tarea')
        .select('*')
        .eq('tarea_id', tareaActual.id)
    
    const container = document.getElementById('adjuntosContainer')
    if (!container) return
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="adjunto-item">No hay adjuntos</div>'
        return
    }
    
    container.innerHTML = data.map(a => `
        <div class="adjunto-item">
            <a href="${a.url}" target="_blank">📎 ${a.nombre_archivo}</a>
            <small>${(a.tamano_bytes / 1024).toFixed(1)}KB</small>
        </div>
    `).join('')
}

// ============================================================
// FINALIZAR TRABAJO
// ============================================================

async function finalizarTrabajoCompleto() {
    const notaCliente = document.getElementById('notaCliente')?.value || ''
    if (!notaCliente.trim()) {
        mostrarMensaje('❌ Debes generar y guardar el informe del cliente antes de finalizar', 'error')
        return
    }
    
    const guardarMedicionesFn = async (tareaId, medicion) => {
        await guardarMedicion(tareaId, {
            servicio_tipo: medicion.servicio_tipo,
            parametros: medicion.parametros,
            notas_tecnico: document.getElementById('notaInterna')?.value || '',
            fecha: medicion.fecha
        })
    }
    
    const exito = await finalizarTrabajo(tareaActual.id, medicionesTemp, guardarMedicionesFn)
    if (exito) {
        limpiarProgresoLocal(tareaActual.id)
        volverAlPanel()
    }
}

// ============================================================
// ALBARÁN
// ============================================================

async function guardarAlbaran(datos) {
    if (!navigator.onLine) {
        mostrarMensaje('📦 Sin conexión. No se puede guardar albarán', 'error')
        return
    }
    
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

// ============================================================
// VOLVER AL PANEL PRINCIPAL
// ============================================================

function volverAlPanel() {
    if (autoSaveInterval) clearInterval(autoSaveInterval)
    guardarProgresoLocal()
    document.getElementById('trabajoScreen').style.display = 'none'
    document.getElementById('dashboardPanel').style.display = 'block'
    recargarTodo()
}

export default { init }