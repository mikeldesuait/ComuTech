// gerente/js/main.js
// Punto de entrada principal del panel gerente

import { sb } from './config/supabase.js'
import { mostrarMensaje, formatearFechaHora, escapeHtml } from './modules/utils.js'

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let currentUser = null
let currentPerfil = null
let currentEmpresaId = null
let tabActiva = 'tareas'

// Variables para módulos dinámicos
let tareasModule = null
let tareasData = []
let tecnicosData = []
let clientesData = []

// ============================================================
// INICIALIZACIÓN
// ============================================================

export async function init() {
    console.log('🚀 Iniciando Panel Gerente')
    
    setupLoginListener()
    
    // Verificar sesión activa
    const tieneSesion = await verificarSesion()
    if (tieneSesion) {
        await mostrarDashboard()
    } else {
        mostrarLoginPanel()
    }
}

// ============================================================
// VERIFICAR SESIÓN
// ============================================================

async function verificarSesion() {
    const { data: { session } } = await sb.auth.getSession()
    
    if (!session) {
        return false
    }
    
    const { data: perfil, error } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
    
    if (error || !perfil || perfil.rol !== 'gerente') {
        await sb.auth.signOut()
        return false
    }
    
    currentUser = session.user
    currentPerfil = perfil
    currentEmpresaId = perfil.empresa_id
    
    return true
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
                await hacerLogin(email, password)
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

async function hacerLogin(email, password) {
    if (!email || !password) {
        throw new Error('Introduce email y contraseña')
    }
    
    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
    })
    
    if (error) {
        throw new Error(error.message)
    }
    
    const { data: perfil, error: perfilError } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle()
    
    if (perfilError || !perfil) {
        await sb.auth.signOut()
        throw new Error('Perfil no encontrado')
    }
    
    if (perfil.rol !== 'gerente') {
        await sb.auth.signOut()
        throw new Error('Acceso solo para gerentes')
    }
    
    currentUser = data.user
    currentPerfil = perfil
    currentEmpresaId = perfil.empresa_id
}

// ============================================================
// MOSTRAR DASHBOARD
// ============================================================

async function mostrarDashboard() {
    const loginPanel = document.getElementById('loginPanel')
    const dashboardPanel = document.getElementById('dashboardPanel')
    
    if (loginPanel) loginPanel.style.display = 'none'
    if (dashboardPanel) dashboardPanel.style.display = 'block'
    
    // Configurar datos del header
    const nombreGerente = document.getElementById('nombreGerente')
    const emailGerente = document.getElementById('emailGerente')
    const nombreEmpresaBanner = document.getElementById('nombreEmpresaBanner')
    
    if (nombreGerente) nombreGerente.innerHTML = currentPerfil?.nombre_razon_social || 'Gerente'
    if (emailGerente) emailGerente.innerHTML = currentUser?.email || ''
    
    // Obtener nombre de la empresa
    const empresaInfo = await getEmpresaInfo()
    if (nombreEmpresaBanner) nombreEmpresaBanner.innerHTML = empresaInfo?.nombre_empresa || 'Mi Empresa'
    
    // Configurar listeners del dashboard
    setupDashboardListeners()
    
    // Renderizar pestaña activa
    await renderizarPanel()
}

async function getEmpresaInfo() {
    if (!currentEmpresaId) return { nombre_empresa: 'Sin empresa' }
    
    try {
        const { data, error } = await sb
            .from('empresas')
            .select('nombre_empresa')
            .eq('id', currentEmpresaId)
            .maybeSingle()
        
        if (error || !data) return { nombre_empresa: 'Empresa no encontrada' }
        return data
    } catch (error) {
        console.error('Error en getEmpresaInfo:', error)
        return { nombre_empresa: 'Error' }
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
// DASHBOARD LISTENERS
// ============================================================

function setupDashboardListeners() {
    // Logout
    const btnLogout = document.getElementById('btnLogout')
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true)
        btnLogout.parentNode.replaceChild(newBtn, btnLogout)
        newBtn.onclick = async () => {
            await sb.auth.signOut()
            window.location.reload()
        }
    }
    
    // Refrescar
    const btnRefrescar = document.getElementById('btnRefrescar')
    if (btnRefrescar) {
        const newBtn = btnRefrescar.cloneNode(true)
        btnRefrescar.parentNode.replaceChild(newBtn, btnRefrescar)
        newBtn.onclick = async () => {
            mostrarMensaje('🔄 Refrescando...', 'exito')
            await cargarDatosTareas()
            await renderizarPanel()
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
// RENDERIZAR PANEL (según pestaña activa)
// ============================================================

async function renderizarPanel() {
    const container = document.getElementById('contenidoPanel')
    if (!container) return
    
    // Cargar datos comunes para tareas
    if (tabActiva === 'tareas') {
        await cargarDatosTareas()
    }
    
    let contenido = ''
    
    if (tabActiva === 'tareas') {
        contenido = await renderizarTareas()
    } else if (tabActiva === 'personal') {
        contenido = renderizarPersonal()
    } else if (tabActiva === 'clientes') {
        contenido = renderizarClientes()
    } else if (tabActiva === 'materiales') {
        contenido = renderizarMateriales()
    } else if (tabActiva === 'facturacion') {
        contenido = renderizarFacturacion()
    } else if (tabActiva === 'impuestos') {
        contenido = renderizarImpuestos()
    }
    
    container.innerHTML = contenido
    asignarEventosSubmodulos()
}

// ============================================================
// CARGAR DATOS PARA TAREAS
// ============================================================

async function cargarDatosTareas() {
    if (!tareasModule) {
        tareasModule = await import('./modules/tareas.js')
    }
    
    const { cargarTareas, cargarTecnicos, cargarClientes } = tareasModule
    
    // Cargar tareas de la empresa
    tareasData = await cargarTareas(currentEmpresaId)
    
    // Cargar técnicos de la empresa
    tecnicosData = await cargarTecnicos(currentEmpresaId)
    
    // Cargar clientes (la propia empresa como cliente)
    clientesData = await cargarClientes(currentEmpresaId)
}

// ============================================================
// RENDERIZADO DE TAREAS
// ============================================================

async function renderizarTareas() {
    if (!tareasModule) {
        tareasModule = await import('./modules/tareas.js')
    }
    
    const { renderizarListaTareas, renderizarFormularioCrear } = tareasModule
    
    // Ver qué subvista mostrar (lista o crear)
    const subvista = localStorage.getItem('gerente_tareas_subvista') || 'lista'
    
    if (subvista === 'crear') {
        return renderizarFormularioCrear(clientesData, tecnicosData, null, null)
    }
    
    return renderizarListaTareas(tareasData, verDetalleTarea, abrirModalAsignar)
}

// ============================================================
// RENDERIZADO DE PERSONAL (placeholder)
// ============================================================

function renderizarPersonal() {
    return `
        <div class="container">
            <div class="card">
                <div class="card-header">👥 Gestión de Personal</div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                    <button class="btn-success" data-subtab="internos">👨‍🔧 Técnicos internos</button>
                    <button class="btn-info" data-subtab="externos">🔌 Técnicos externos</button>
                    <button class="btn-warning" data-subtab="vacaciones">🌴 Vacaciones</button>
                    <button class="btn-primary" data-subtab="nominas">💰 Nóminas</button>
                    <button class="btn-danger" data-subtab="ausencias">⚠️ Ausencias</button>
                    <button class="btn-info" data-subtab="horario">⏱️ Registro horario</button>
                </div>
                <div id="personalContainer">
                    <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                        Selecciona una opción
                    </div>
                </div>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE CLIENTES (placeholder)
// ============================================================

function renderizarClientes() {
    return `
        <div class="container">
            <div class="card">
                <div class="card-header">🏢 Gestión de Clientes</div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                    <button class="btn-success" data-subtab="lista">📋 Lista de clientes</button>
                    <button class="btn-primary" data-subtab="alta">➕ Alta cliente</button>
                    <button class="btn-danger" data-subtab="baja">➖ Baja cliente</button>
                    <button class="btn-info" data-subtab="activos">🏗️ Activos</button>
                    <button class="btn-warning" data-subtab="mensajes">💬 Mensajes</button>
                </div>
                <div id="clientesContainer">
                    <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                        Selecciona una opción
                    </div>
                </div>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE MATERIALES (placeholder)
// ============================================================

function renderizarMateriales() {
    return `
        <div class="container">
            <div class="card">
                <div class="card-header">📦 Gestión de Materiales</div>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <button class="btn-success" data-subtab="stock">📊 Stock actual</button>
                    <button class="btn-info" data-subtab="gastos">💰 Gastos en materiales</button>
                </div>
                <div id="materialesContainer">
                    <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                        Selecciona una opción
                    </div>
                </div>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE FACTURACIÓN (placeholder)
// ============================================================

function renderizarFacturacion() {
    return `
        <div class="container">
            <div class="card">
                <div class="card-header">💰 Facturación</div>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <button class="btn-success" data-subtab="ingresos">📈 Ingresos</button>
                    <button class="btn-danger" data-subtab="pagos">💳 Pagos</button>
                </div>
                <div id="facturacionContainer">
                    <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                        Selecciona una opción
                    </div>
                </div>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE IMPUESTOS (placeholder)
// ============================================================

function renderizarImpuestos() {
    return `
        <div class="container">
            <div class="card">
                <div class="card-header">📊 Impuestos</div>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <button class="btn-info" data-subtab="irpf">📋 IRPF</button>
                    <button class="btn-primary" data-subtab="iva">📋 IVA</button>
                </div>
                <div id="impuestosContainer">
                    <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                        Selecciona una opción
                    </div>
                </div>
            </div>
        </div>
    `
}

// ============================================================
// ASIGNAR EVENTOS DE SUBMÓDULOS
// ============================================================

function asignarEventosSubmodulos() {
    // Botones de crear tarea
    const btnCrear = document.getElementById('btnCrearTareaLista')
    if (btnCrear) {
        btnCrear.onclick = () => {
            localStorage.setItem('gerente_tareas_subvista', 'crear')
            renderizarPanel()
        }
    }
    
    // Botones de ver tarea
    document.querySelectorAll('.ver-tarea').forEach(btn => {
        btn.onclick = () => verDetalleTarea(btn.dataset.id)
    })
    
    // Botones de asignar tarea
    document.querySelectorAll('.asignar-tarea').forEach(btn => {
        btn.onclick = () => abrirModalAsignar(btn.dataset.id)
    })
    
    // Botones del formulario crear
    const btnGuardar = document.getElementById('btnGuardarTarea')
    if (btnGuardar) {
        btnGuardar.onclick = () => guardarNuevaTarea()
    }
    
    const btnCancelar = document.getElementById('btnCancelarTarea')
    if (btnCancelar) {
        btnCancelar.onclick = () => {
            localStorage.setItem('gerente_tareas_subvista', 'lista')
            renderizarPanel()
        }
    }
    
    // Cargar activos al seleccionar cliente
    const selectCliente = document.getElementById('tareaCliente')
    if (selectCliente) {
        selectCliente.onchange = async () => {
            const clienteId = selectCliente.value
            if (!tareasModule) {
                tareasModule = await import('./modules/tareas.js')
            }
            const activos = await tareasModule.cargarActivos(clienteId)
            const selectActivo = document.getElementById('tareaActivo')
            if (selectActivo) {
                let options = '<option value="">-- Sin activo --</option>'
                activos.forEach(a => {
                    options += `<option value="${a.id}">${escapeHtml(a.nombre)} - ${escapeHtml(a.direccion || '')}</option>`
                })
                selectActivo.innerHTML = options
            }
        }
    }
}

// ============================================================
// GUARDAR NUEVA TAREA
// ============================================================

async function guardarNuevaTarea() {
    const clienteId = document.getElementById('tareaCliente')?.value
    const activoId = document.getElementById('tareaActivo')?.value || null
    const tecnicoId = document.getElementById('tareaTecnico')?.value || null
    const prioridad = document.getElementById('tareaPrioridad')?.value
    const titulo = document.getElementById('tareaTitulo')?.value.trim()
    const descripcion = document.getElementById('tareaDescripcion')?.value.trim()
    const fechaLimite = document.getElementById('tareaFechaLimite')?.value
    const ordenTrabajo = document.getElementById('tareaOrdenTrabajo')?.value.trim()
    
    if (!clienteId) {
        mostrarMensaje('Selecciona un cliente', 'error')
        return
    }
    
    if (!titulo) {
        mostrarMensaje('El título es obligatorio', 'error')
        return
    }
    
    if (!tareasModule) {
        tareasModule = await import('./modules/tareas.js')
    }
    
    const { crearTarea } = tareasModule
    
    const nuevaTarea = await crearTarea({
        clienteId, activoId, tecnicoId, titulo, descripcion,
        prioridad, fechaLimite, ordenTrabajo
    })
    
    if (nuevaTarea) {
        localStorage.setItem('gerente_tareas_subvista', 'lista')
        await cargarDatosTareas()
        renderizarPanel()
    }
}

// ============================================================
// VER DETALLE DE TAREA
// ============================================================

async function verDetalleTarea(tareaId) {
    const tarea = tareasData.find(t => t.id === tareaId)
    if (!tarea) return
    
    if (!tareasModule) {
        tareasModule = await import('./modules/tareas.js')
    }
    
    const { getHistorialAsignaciones } = tareasModule
    const historial = await getHistorialAsignaciones(tareaId)
    
    let historialHtml = ''
    if (historial.length > 0) {
        historialHtml = `
            <div class="card" style="margin-top: 16px;">
                <div class="card-header">📜 Historial de asignaciones</div>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${historial.map(h => `
                        <div style="padding: 8px; border-bottom: 1px solid var(--ios-border);">
                            <small>
                                ${h.tipo === 'asignacion' ? '📌 Asignada' : '🔄 Reasignada'} 
                                a ${escapeHtml(h.perfiles?.nombre_razon_social || '?')}
                                el ${formatearFechaHora(h.fecha_asignacion)}
                                ${h.motivo ? `<br>Motivo: ${escapeHtml(h.motivo)}` : ''}
                            </small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `
    }
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3>📋 ${escapeHtml(tarea.numero_tarea)} - ${escapeHtml(tarea.titulo)}</h3>
            
            <div class="detalle-info" style="background: var(--ios-bg); padding: 16px; border-radius: 12px; margin: 16px 0;">
                <p><strong>Cliente:</strong> ${escapeHtml(tarea.empresas?.nombre_empresa || '-')}</p>
                <p><strong>Técnico:</strong> ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}</p>
                <p><strong>Prioridad:</strong> ${tarea.prioridad || 'media'}</p>
                <p><strong>Estado:</strong> ${tarea.estado || 'pendiente'}</p>
                <p><strong>Descripción:</strong> ${escapeHtml(tarea.descripcion || '-')}</p>
                ${tarea.orden_trabajo ? `<p><strong>Orden de trabajo:</strong><br>${escapeHtml(tarea.orden_trabajo)}</p>` : ''}
                ${tarea.motivo_rechazo ? `<p><strong>Motivo de rechazo:</strong> ${escapeHtml(tarea.motivo_rechazo)}</p>` : ''}
            </div>
            
            ${historialHtml}
            
            <div class="modal-buttons">
                <button id="btnCerrarDetalle" class="btn-cancelar">✖ Cerrar</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnCerrarDetalle').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

// ============================================================
// ABRIR MODAL ASIGNAR TAREA
// ============================================================

async function abrirModalAsignar(tareaId) {
    const tarea = tareasData.find(t => t.id === tareaId)
    if (!tarea) return
    
    if (!tareasModule) {
        tareasModule = await import('./modules/tareas.js')
    }
    
    const { renderizarModalAsignar, asignarTarea } = tareasModule
    
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <h3>🔄 Reasignar tarea</h3>
            ${renderizarModalAsignar(tarea, tecnicosData, null)}
            <div class="modal-buttons" style="margin-top: 20px;">
                <button id="btnConfirmarAsignar" class="btn-aceptar">✅ Asignar</button>
                <button id="btnCancelarAsignar" class="btn-cancelar">❌ Cancelar</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btnConfirmarAsignar').onclick = async () => {
        const nuevoTecnicoId = document.getElementById('asignarTecnico').value
        const motivo = document.getElementById('asignarMotivo').value.trim()
        
        if (!nuevoTecnicoId) {
            mostrarMensaje('Selecciona un técnico', 'error')
            return
        }
        
        const exito = await asignarTarea(tareaId, nuevoTecnicoId, motivo)
        if (exito) {
            modal.remove()
            await cargarDatosTareas()
            renderizarPanel()
        }
    }
    
    document.getElementById('btnCancelarAsignar').onclick = () => modal.remove()
    modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}

// ============================================================
// EXPORTAR
// ============================================================

export default { init }