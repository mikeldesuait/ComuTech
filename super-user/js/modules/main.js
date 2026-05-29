// js/modules/main.js
import { sb } from './supabase.js'
import { mostrarMensaje, formatDate } from './utils.js'

// Variables privadas del módulo (no globales)
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
    const { data: empresas } = await sb.from('empresas').select('*')
    const total = empresas?.length || 0
    const activos = empresas?.filter(e => e.activo).length || 0
    document.getElementById('statsPanel').innerHTML = `
        <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Total Clientes</div></div>
        <div class="stat-card"><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div>
    `
}

async function cargarModulo(modulo) {
    const htmlResponse = await fetch(`modules/${modulo}.html`)
    document.getElementById('moduloContainer').innerHTML = await htmlResponse.text()
    
    // Import dinámico según el módulo
    if (modulo === 'clientes') {
        const module = await import('./clientes.js')
        module.iniciarModuloClientes()
    } else if (modulo === 'facturacion') {
        const module = await import('./facturacion.js')
        module.iniciarModuloFacturacion()
    } else if (modulo === 'cumplimiento') {
        const module = await import('./cumplimiento.js')
        module.iniciarModuloCumplimiento()
    }
}

// Inicialización cuando el DOM está listo
export function init() {
    document.getElementById('btnLogin').onclick = async() => {
        if (await hacerLogin()) {
            document.getElementById('loginPanel').style.display = 'none'
            document.getElementById('dashboardPanel').style.display = 'block'
            await cargarStats()
            cargarModulo('clientes')
        }
    }

    document.querySelectorAll('.browser-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.browser-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            cargarModulo(tab.dataset.tab)
        }
    })

    document.getElementById('btnLogoutHeader').onclick = async() => { 
        await sb.auth.signOut()
        location.reload()
    }

    document.getElementById('btnLogoutFooter').onclick = async() => { 
        await sb.auth.signOut()
        location.reload()
    }

    document.getElementById('btnRefrescar').onclick = async () => {
        const { cargarClientes } = await import('./clientes.js')
        if (typeof cargarClientes === 'function') cargarClientes()
        const { cargarCumplimiento } = await import('./cumplimiento.js')
        if (typeof cargarCumplimiento === 'function') cargarCumplimiento()
        cargarStats()
    }
}
