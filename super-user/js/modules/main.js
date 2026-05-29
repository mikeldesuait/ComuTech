import { sb } from './supabase.js'
import { mostrarMensaje } from './utils.js'

let currentUser = null

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
    
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
        document.getElementById('errorMsg').innerText = error.message
        return false
    }
    
    const { data: perfil } = await sb.from('perfiles')
        .select('rol, nombre_razon_social')
        .eq('user_id', data.user.id)
        .maybeSingle()
    
    if (!perfil || perfil.rol !== 'super_admin') {
        await sb.auth.signOut()
        document.getElementById('errorMsg').innerText = "Acceso no autorizado"
        return false
    }
    
    currentUser = data.user
    document.getElementById('nombreAdmin').innerHTML = perfil.nombre_razon_social || 'Super Admin'
    document.getElementById('emailAdmin').innerHTML = currentUser.email
    return true
}

async function cargarStats() {
    const { data: empresas } = await sb.from('empresas').select('*', { count: 'exact', head: false })
    const total = empresas?.length || 0
    const activos = empresas?.filter(e => e.activo).length || 0
    
    document.getElementById('statsPanel').innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${total}</div>
            <div class="stat-label">Total Clientes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${activos}</div>
            <div class="stat-label">Activos</div>
        </div>
    `
}

async function cargarModulo(modulo) {
    try {
        const response = await fetch(`modules/${modulo}.html`)
        if (!response.ok) throw new Error(`Error cargando ${modulo}.html`)
        const html = await response.text()
        document.getElementById('moduloContainer').innerHTML = html
        
        if (modulo === 'clientes') {
            const module = await import('./clientes.js')
            if (module.iniciar) module.iniciar()
        }
    } catch (error) {
        console.error('Error cargando módulo:', error)
        mostrarMensaje('Error al cargar el módulo', 'error')
    }
}

// Eventos
export function init() {
    document.getElementById('btnLogin').onclick = async () => {
        if (await hacerLogin()) {
            document.getElementById('loginPanel').style.display = 'none'
            document.getElementById('dashboardPanel').style.display = 'block'
            await cargarStats()
            await cargarModulo('clientes')
        }
    }

    document.getElementById('btnLogoutHeader').onclick = async () => {
        await sb.auth.signOut()
        location.reload()
    }

    document.getElementById('btnLogoutFooter').onclick = async () => {
        await sb.auth.signOut()
        location.reload()
    }

    document.getElementById('btnRefrescar').onclick = async () => {
        const module = await import('./clientes.js')
        if (module.refrescar) await module.refrescar()
        await cargarStats()
        mostrarMensaje('✅ Datos actualizados')
    }
}
