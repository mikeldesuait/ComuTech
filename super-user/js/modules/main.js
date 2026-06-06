// js/modules/main.js
import { sb } from './supabase.js'
import { mostrarMensaje } from './utils.js'

let currentUser = null
let moduloActual = null

export function getCurrentUser() {
    return currentUser
}

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

export async function cargarStats() {
    try {
        const { data: empresas, error } = await sb.from('empresas').select('*', { count: 'exact', head: false })
        
        if (error) throw error
        
        const total = empresas?.length || 0
        const activos = empresas?.filter(e => e.activo === true).length || 0
        const inactivos = total - activos
        
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

async function cargarModulo(modulo) {
    const container = document.getElementById('moduloContainer')
    if (!container) return
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="spinner"></div><p>Cargando...</p></div>'
        
        let templatePath = ''
        
        // Determinar la ruta del template según el módulo
        if (modulo === 'clientes') {
            templatePath = 'templates/clientes/clientes.html'
        } else if (modulo === 'facturacion') {
            templatePath = 'templates/facturacion/facturacion.html'
        } else if (modulo === 'suscripciones') {
            templatePath = 'templates/facturacion/suscripciones.html'
        } else if (modulo === 'productos') {
            templatePath = 'templates/facturacion/productos.html'
        } else {
            templatePath = `templates/${modulo}/${modulo}.html`
        }
        
        console.log('Cargando template:', templatePath)
        
        const response = await fetch(templatePath)
        
        if (!response.ok) {
            throw new Error(`No se encontró el template para ${modulo} en ruta: ${templatePath}`)
        }
        
        container.innerHTML = await response.text()
        
        // Inicializar el módulo correspondiente
        if (modulo === 'clientes') {
            const module = await import('./clientes.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'clientes'
        } else if (modulo === 'facturacion') {
            const module = await import('./facturacion.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'facturacion'
        } else if (modulo === 'suscripciones') {
            const module = await import('./suscripciones.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'suscripciones'
        } else if (modulo === 'productos') {
            const module = await import('./productos.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'productos'
        }
        
    } catch (error) {
        console.error(`Error cargando módulo ${modulo}:`, error)
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#c2410c;">
            ❌ Error al cargar el módulo ${modulo}<br>
            <small>${error.message}</small>
        </div>`
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn')
    
    tabs.forEach(tab => {
        tab.onclick = async () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            const modulo = tab.dataset.tab
            await cargarModulo(modulo)
        }
    })
}

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
        } else if (moduloActual === 'facturacion') {
            const module = await import('./facturacion.js')
            if (module.iniciar) {
                await module.iniciar()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        } else if (moduloActual === 'suscripciones') {
            const module = await import('./suscripciones.js')
            if (module.iniciar) {
                await module.iniciar()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        } else if (moduloActual === 'productos') {
            const module = await import('./productos.js')
            if (module.iniciar) {
                await module.iniciar()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        }
        await cargarStats()
    }
}

function setupMiPerfil() {
    const btnMiPerfil = document.getElementById('btnMiPerfil')
    if (btnMiPerfil) {
        btnMiPerfil.onclick = async () => {
            const module = await import('./miPerfil.js')
            module.abrirModalMiPerfil()
        }
    }
}

function setupMiEmpresa() {
    const btnMiEmpresa = document.getElementById('btnMiEmpresa')
    if (btnMiEmpresa) {
        btnMiEmpresa.onclick = async () => {
            const module = await import('./miEmpresa.js')
            module.abrirModalMiEmpresa()
        }
    }
}

export function init() {
    console.log('🚀 Iniciando Panel SuperUser')
    
    const btnLogin = document.getElementById('btnLogin')
    if (btnLogin) {
        btnLogin.onclick = async () => {
            const success = await hacerLogin()
            if (success) {
                document.getElementById('loginPanel').style.display = 'none'
                document.getElementById('dashboardPanel').style.display = 'block'
                
                await cargarStats()
                await cargarModulo('clientes')
                
                setupTabs()
                setupLogout()
                setupRefresh()
                setupMiPerfil()
                setupMiEmpresa()
            }
        }
    }
}

export default {
    init,
    getCurrentUser,
    cargarStats
}