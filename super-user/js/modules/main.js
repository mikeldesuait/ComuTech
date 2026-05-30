// js/modules/main.js
// 🎮 CONTROLADOR PRINCIPAL DEL PANEL SUPERUSER

import { sb } from './supabase.js'
import { mostrarMensaje } from './utils.js'

// ============================================================
// VARIABLES GLOBALES DEL MÓDULO
// ============================================================

let currentUser = null
let moduloActual = null

// ============================================================
// FUNCIONES DE LOGIN
// ============================================================

/**
 * Obtiene el usuario actual
 * @returns {Object|null} Usuario actual o null
 */
export function getCurrentUser() {
    return currentUser
}

/**
 * Realiza el login del super admin
 * @returns {Promise<boolean>} true si el login fue exitoso
 */
async function hacerLogin() {
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    
    if (!email || !password) {
        document.getElementById('errorMsg').innerText = "Introduce email y contraseña"
        return false
    }
    
    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password })
        
        if (error) {
            document.getElementById('errorMsg').innerText = error.message
            return false
        }
        
        // Verificar que el usuario sea super_admin
        const { data: perfil, error: perfilError } = await sb.from('perfiles')
            .select('rol, nombre_razon_social')
            .eq('user_id', data.user.id)
            .maybeSingle()
        
        if (perfilError || !perfil || perfil.rol !== 'super_admin') {
            await sb.auth.signOut()
            document.getElementById('errorMsg').innerText = "Acceso no autorizado. Se requieren permisos de Super Admin."
            return false
        }
        
        currentUser = data.user
        document.getElementById('nombreAdmin').innerHTML = perfil.nombre_razon_social || 'Super Admin'
        document.getElementById('emailAdmin').innerHTML = currentUser.email
        
        return true
        
    } catch (error) {
        console.error('Error en login:', error)
        document.getElementById('errorMsg').innerText = "Error al conectar con el servidor"
        return false
    }
}

// ============================================================
// ESTADÍSTICAS DEL DASHBOARD
// ============================================================

/**
 * Carga y muestra las estadísticas en el dashboard
 */
async function cargarStats() {
    try {
        const { data: empresas, error } = await sb.from('empresas').select('*')
        
        if (error) throw error
        
        const total = empresas?.length || 0
        const activos = empresas?.filter(e => e.activo === true).length || 0
        const inactivos = total - activos
        
        // Actualizar estadísticas integradas
        const statTotal = document.getElementById('statTotal')
        const statActivos = document.getElementById('statActivos')
        const statInactivos = document.getElementById('statInactivos')
        
        if (statTotal) statTotal.textContent = total
        if (statActivos) statActivos.textContent = activos
        if (statInactivos) statInactivos.textContent = inactivos
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error)
    }
}

// ============================================================
// NAVEGACIÓN ENTRE MÓDULOS (HABITACIONES)
// ============================================================

/**
 * Carga un módulo específico (habitación)
 * @param {string} modulo - Nombre del módulo ('clientes', 'facturacion', 'normativa')
 */
async function cargarModulo(modulo) {
    const container = document.getElementById('moduloContainer')
    if (!container) return
    
    try {
        // Mostrar loading
        container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="spinner"></div><p>Cargando...</p></div>'
        
        // Cargar el template HTML del módulo
        const response = await fetch(`templates/${modulo}/${modulo}.html`)
        
        if (!response.ok) {
            // Intentar con estructura alternativa
            const altResponse = await fetch(`templates/${modulo}.html`)
            if (!altResponse.ok) throw new Error(`No se encontró el template para ${modulo}`)
            container.innerHTML = await altResponse.text()
        } else {
            container.innerHTML = await response.text()
        }
        
        // Cargar el módulo JavaScript correspondiente
        if (modulo === 'clientes') {
            const module = await import('./clientes.js')
            if (module.iniciar) await module.iniciar()
            moduloActual = 'clientes'
        } else if (modulo === 'facturacion') {
            const module = await import('./facturacion.js')
            if (module.iniciar) await module.iniciar()
            moduloActual = 'facturacion'
        } else if (modulo === 'normativa') {
            const module = await import('./normativa.js')
            if (module.iniciar) await module.iniciar()
            moduloActual = 'normativa'
        }
        
    } catch (error) {
        console.error(`Error cargando módulo ${modulo}:`, error)
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#c2410c;">
            ❌ Error al cargar el módulo ${modulo}<br>
            <small>${error.message}</small>
        </div>`
    }
}

// ============================================================
// CONFIGURAR PESTAÑAS
// ============================================================

/**
 * Configura los eventos de las pestañas de navegación
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.browser-tab')
    
    tabs.forEach(tab => {
        tab.onclick = async () => {
            // Actualizar clase activa de las pestañas
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            
            // Cargar el módulo correspondiente
            const modulo = tab.dataset.tab
            await cargarModulo(modulo)
        }
    })
}

// ============================================================
// CONFIGURAR LOGOUT
// ============================================================

/**
 * Configura los botones de logout
 */
function setupLogout() {
    const logoutButtons = ['btnLogoutHeader', 'btnLogoutFooter']
    
    logoutButtons.forEach(btnId => {
        const btn = document.getElementById(btnId)
        if (btn) {
            btn.onclick = async () => {
                await sb.auth.signOut()
                location.reload()
            }
        }
    })
}

// ============================================================
// REFRESCAR DATOS
// ============================================================

/**
 * Configura el botón de refrescar
 */
function setupRefresh() {
    const btnRefresh = document.getElementById('btnRefrescar')
    if (!btnRefresh) return
    
    btnRefresh.onclick = async () => {
        if (moduloActual === 'clientes') {
            const module = await import('./clientes.js')
            if (module.cargarClientes) {
                await module.cargarClientes()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        }
        await cargarStats()
    }
}

// ============================================================
// INICIALIZACIÓN PRINCIPAL
// ============================================================

/**
 * Inicializa la aplicación
 */
export function init() {
    console.log('🚀 Iniciando Panel SuperUser')
    
    // Configurar evento de login
    const btnLogin = document.getElementById('btnLogin')
    if (btnLogin) {
        btnLogin.onclick = async () => {
            const success = await hacerLogin()
            if (success) {
                // Mostrar dashboard
                document.getElementById('loginPanel').style.display = 'none'
                document.getElementById('dashboardPanel').style.display = 'block'
                
                // Cargar estadísticas y módulo por defecto
                await cargarStats()
                await cargarModulo('clientes')
                
                // Configurar eventos
                setupTabs()
                setupLogout()
                setupRefresh()
            }
        }
    }
}

// ============================================================
// EXPORTAR FUNCIONES PÚBLICAS
// ============================================================

export default {
    init,
    getCurrentUser
}