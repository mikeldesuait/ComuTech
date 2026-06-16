// cliente/js/main.js
// Punto de entrada principal del panel cliente

import { sb } from './config/supabase.js'
import { 
    hacerLogin, cerrarSesion, verificarSesion, guardarSesion, limpiarSesion,
    getCurrentCliente, getCurrentClienteId, getCurrentEmpresaId, getCurrentCodigo
} from './modules/auth.js'
import { mostrarMensaje, formatearFecha, escapeHtml, mostrarModalCarga, cerrarModalCarga } from './modules/utils.js'

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let currentCliente = null
let currentClienteId = null
let currentEmpresaId = null
let tabActiva = 'tablon'

// Módulos dinámicos
let tablonModule = null
let informacionModule = null
let incidenciasModule = null
let historicoModule = null

// Datos
let activosData = []
let tareasRecientes = []
let incidenciasData = []
let historicoTareas = []

// ============================================================
// INICIALIZACIÓN
// ============================================================

export async function init() {
    console.log('🚀 Iniciando Panel Cliente')
    
    setupLoginListener()
    
    if (verificarSesion()) {
        currentCliente = getCurrentCliente()
        currentClienteId = getCurrentClienteId()
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
            const codigo = document.getElementById('codigoAcceso').value.trim()
            
            try {
                const result = await hacerLogin(codigo)
                currentCliente = result.cliente
                currentClienteId = result.clienteId
                currentEmpresaId = result.empresaId
                guardarSesion()
                await mostrarDashboard()
            } catch (error) {
                const errorMsg = document.getElementById('errorMsg')
                if (errorMsg) errorMsg.innerText = error.message
            }
        }
    }
    
    const codigoInput = document.getElementById('codigoAcceso')
    if (codigoInput) {
        codigoInput.onkeypress = (e) => {
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
    
    const codigoInput = document.getElementById('codigoAcceso')
    if (codigoInput) codigoInput.value = ''
}

// ============================================================
// MOSTRAR DASHBOARD
// ============================================================

async function mostrarDashboard() {
    const loginPanel = document.getElementById('loginPanel')
    const dashboardPanel = document.getElementById('dashboardPanel')
    
    if (loginPanel) loginPanel.style.display = 'none'
    if (dashboardPanel) dashboardPanel.style.display = 'block'
    
    // Configurar header
    const nombreEmpresaBanner = document.getElementById('nombreEmpresaBanner')
    const codigoEmpresa = document.getElementById('codigoEmpresa')
    
    if (nombreEmpresaBanner) nombreEmpresaBanner.innerHTML = currentCliente?.nombre || 'Mi Comunidad'
    if (codigoEmpresa) codigoEmpresa.innerHTML = getCurrentCodigo() || '-'
    
    // Configurar listeners
    setupDashboardListeners()
    
    // Cargar datos
    await cargarDatosIniciales()
    
    // Renderizar pestaña activa
    await renderizarPanel()
}

function setupDashboardListeners() {
    // Logout
    const btnLogout = document.getElementById('btnLogout')
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true)
        btnLogout.parentNode.replaceChild(newBtn, btnLogout)
        newBtn.onclick = () => {
            limpiarSesion()
            cerrarSesion()
        }
    }
    
    // Tabs
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
    // Cargar módulos
    tablonModule = await import('./modules/tablon.js')
    informacionModule = await import('./modules/informacion.js')
    incidenciasModule = await import('./modules/incidencias.js')
    historicoModule = await import('./modules/historico.js')
    
    // Cargar activos del cliente (usando cliente_id)
    const { cargarActivos } = informacionModule
    activosData = await cargarActivos(currentClienteId)
    
    // Cargar tareas recientes para el tablón (usando empresa_id del gerente)
    const { cargarTareasRecientes } = tablonModule
    tareasRecientes = await cargarTareasRecientes(currentEmpresaId)
    
    // Cargar incidencias (usando cliente_id)
    const { cargarIncidencias } = incidenciasModule
    incidenciasData = await cargarIncidencias(currentClienteId)
    
    // Cargar histórico (usando empresa_id del gerente)
    const { cargarHistorico } = historicoModule
    historicoTareas = await cargarHistorico(currentEmpresaId)
}

// ============================================================
// RENDERIZAR PANEL
// ============================================================

async function renderizarPanel() {
    const container = document.getElementById('contenidoPanel')
    if (!container) return
    
    let contenido = ''
    
    if (tabActiva === 'tablon') {
        contenido = await renderizarTablon()
    } else if (tabActiva === 'informacion') {
        contenido = await renderizarInformacion()
    } else if (tabActiva === 'incidencias') {
        contenido = await renderizarIncidencias()
    } else if (tabActiva === 'historico') {
        contenido = await renderizarHistorico()
    }
    
    container.innerHTML = contenido
    asignarEventosSubmodulos()
}

// ============================================================
// RENDERIZAR TABLÓN
// ============================================================

async function renderizarTablon() {
    const { renderizarListaTablón } = tablonModule
    
    if (tareasRecientes.length === 0) {
        return `<div class="container"><div class="card"><div class="card-header">📋 Tablón</div><div class="text-center" style="padding:40px;">📭 No hay tareas recientes</div></div></div>`
    }
    
    return renderizarListaTablón(tareasRecientes)
}

// ============================================================
// RENDERIZAR INFORMACIÓN
// ============================================================

async function renderizarInformacion() {
    const { renderizarInformacionCliente, renderizarListaActivos } = informacionModule
    
    let html = `<div class="container">`
    html += renderizarInformacionCliente(currentCliente)
    html += `<div class="card" style="margin-top:16px;"><div class="card-header">🏗️ Activos</div>`
    
    if (activosData.length === 0) {
        html += `<div class="text-center" style="padding:20px;">No hay activos registrados</div>`
    } else {
        html += renderizarListaActivos(activosData)
    }
    html += `</div></div>`
    
    return html
}

// ============================================================
// RENDERIZAR INCIDENCIAS
// ============================================================

async function renderizarIncidencias() {
    const { renderizarListaIncidencias } = incidenciasModule
    
    let html = `<div class="container"><div class="card"><div class="card-header">⚠️ Incidencias<button id="btnNuevaIncidencia" class="btn-success btn-sm">➕ Nueva</button></div>`
    
    if (incidenciasData.length === 0) {
        html += `<div class="text-center" style="padding:40px;">📭 No hay incidencias reportadas</div>`
    } else {
        html += renderizarListaIncidencias(incidenciasData)
    }
    html += `</div></div>`
    
    return html
}

// ============================================================
// RENDERIZAR HISTÓRICO
// ============================================================

async function renderizarHistorico() {
    const { renderizarListaHistorico } = historicoModule
    
    if (historicoTareas.length === 0) {
        return `<div class="container"><div class="card"><div class="card-header">📜 Histórico</div><div class="text-center" style="padding:40px;">📭 No hay tareas en el histórico</div></div></div>`
    }
    
    return renderizarListaHistorico(historicoTareas)
}

// ============================================================
// ASIGNAR EVENTOS DE SUBMÓDULOS
// ============================================================

function asignarEventosSubmodulos() {
    // Botón nueva incidencia
    const btnNueva = document.getElementById('btnNuevaIncidencia')
    if (btnNueva) {
        btnNueva.onclick = () => mostrarModalCrearIncidencia()
    }
}

// ============================================================
// MODAL CREAR INCIDENCIA
// ============================================================

function mostrarModalCrearIncidencia() {
    const activosOptions = activosData.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`).join('')
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content">
            <h3>⚠️ Reportar incidencia</h3>
            <div class="form-group"><label>📝 Título *</label><input type="text" id="incidenciaTitulo" placeholder="Ej: Bomba no funciona"></div>
            <div class="form-group"><label>🏗️ Activo</label><select id="incidenciaActivo"><option value="">-- Seleccionar --</option>${activosOptions}</select></div>
            <div class="form-group"><label>📄 Descripción *</label><textarea id="incidenciaDescripcion" rows="4"></textarea></div>
            <div class="modal-buttons"><button id="btnGuardarIncidencia" class="btn-aceptar">✅ Reportar</button><button id="btnCancelarIncidencia" class="btn-cancelar">Cancelar</button></div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnGuardarIncidencia').onclick = async () => {
        const titulo = document.getElementById('incidenciaTitulo').value.trim()
        const activoId = document.getElementById('incidenciaActivo').value || null
        const descripcion = document.getElementById('incidenciaDescripcion').value.trim()
        
        if (!titulo || !descripcion) {
            mostrarMensaje('Completa título y descripción', 'error')
            return
        }
        
        const exito = await incidenciasModule.crearIncidencia({
            clienteId: currentClienteId,
            activoId,
            titulo,
            descripcion
        })
        
        if (exito) {
            modal.remove()
            await cargarDatosIniciales()
            renderizarPanel()
        }
    }
    
    document.getElementById('btnCancelarIncidencia').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

export default { init }