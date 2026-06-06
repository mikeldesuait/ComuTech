// js/modules/main.js
import { sb } from './supabase.js'
import { mostrarMensaje, cerrarModal } from './utils.js'
import { initAyuda } from './ayuda.js'

let currentUser = null
let moduloActual = null

export function getCurrentUser() {
    return currentUser
}

// ============================================================
// FUNCIÓN PARA RESTABLECER CONTRASEÑA
// ============================================================

function abrirModalResetPassword() {
    const modal = document.getElementById('modalResetPasswordRequest');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('resetEmailInput').value = '';
        document.getElementById('resetMessage').innerHTML = '';
    }
}

function setupForgotPassword() {
    console.log('🔧 setupForgotPassword ejecutado');
    
    const btnForgot = document.getElementById('btnForgotPassword');
    if (btnForgot) {
        // Eliminar listener anterior si existe
        if (btnForgot._listener) btnForgot.removeEventListener('click', btnForgot._listener);
        btnForgot._listener = (e) => {
            e.preventDefault();
            abrirModalResetPassword();
        };
        btnForgot.addEventListener('click', btnForgot._listener);
    }
    
    const btnSendReset = document.getElementById('btnSendReset');
    if (btnSendReset) {
        // Eliminar listener anterior si existe
        if (btnSendReset._listener) btnSendReset.removeEventListener('click', btnSendReset._listener);
        
        btnSendReset._listener = async (e) => {
            // Evitar cualquier acción por defecto
            if (e) e.preventDefault();
            
            // Prevenir múltiples envíos
            if (btnSendReset.disabled) return;
            
            const email = document.getElementById('resetEmailInput').value.trim();
            const messageDiv = document.getElementById('resetMessage');
            
            if (!email) {
                messageDiv.innerHTML = '<span style="color:#c2410c;">❌ Introduce tu email</span>';
                return;
            }
            
            // Deshabilitar botón inmediatamente
            btnSendReset.disabled = true;
            messageDiv.innerHTML = '<span style="color:#2563eb;">🔄 Procesando...</span>';
            
            try {
                await sb.auth.resetPasswordForEmail(email, {
                    redirectTo: 'https://comutech.es/reset-password.html'
                });
                messageDiv.innerHTML = '<span style="color:#166534;">✅ Revisa tu email. Hemos enviado el enlace.</span>';
            } catch (error) {
                console.error('Error al enviar:', error);
                messageDiv.innerHTML = '<span style="color:#166534;">✅ Si el email existe, recibirás un enlace.</span>';
            }
            
            setTimeout(() => {
                cerrarModal('modalResetPasswordRequest');
                document.getElementById('resetEmailInput').value = '';
                messageDiv.innerHTML = '';
                btnSendReset.disabled = false;
            }, 4000);
        };
        
        btnSendReset.addEventListener('click', btnSendReset._listener);
    }
    
    const btnCancelReset = document.getElementById('btnCancelReset');
    if (btnCancelReset) {
        if (btnCancelReset._listener) btnCancelReset.removeEventListener('click', btnCancelReset._listener);
        btnCancelReset._listener = () => {
            cerrarModal('modalResetPasswordRequest');
            document.getElementById('resetEmailInput').value = '';
            document.getElementById('resetMessage').innerHTML = '';
            // Re-habilitar el botón de enviar por si acaso
            const sendBtn = document.getElementById('btnSendReset');
            if (sendBtn) sendBtn.disabled = false;
        };
        btnCancelReset.addEventListener('click', btnCancelReset._listener);
    }
}

// ============================================================
// LOGIN
// ============================================================

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

// ============================================================
// ESTADÍSTICAS
// ============================================================

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

// ============================================================
// CARGAR MÓDULOS
// ============================================================

async function cargarModulo(modulo) {
    const container = document.getElementById('moduloContainer')
    if (!container) return
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="spinner"></div><p>Cargando...</p></div>'
        
        let templatePath = ''
        
        if (modulo === 'clientes') {
            templatePath = 'templates/clientes/clientes.html'
        } else if (modulo === 'facturacion') {
            templatePath = 'templates/facturacion/facturacion.html'
        } else if (modulo === 'suscripciones') {
            templatePath = 'templates/facturacion/suscripciones.html'
        } else if (modulo === 'productos') {
            templatePath = 'templates/facturacion/productos.html'
        } else if (modulo === 'gastos') {
            templatePath = 'templates/gastos/gastos.html'
        } else if (modulo === 'impuestos') {
            templatePath = 'templates/impuestos/impuestos.html'
        } else {
            templatePath = `templates/${modulo}/${modulo}.html`
        }
        
        console.log('Cargando template:', templatePath)
        
        const response = await fetch(templatePath)
        
        if (!response.ok) {
            throw new Error(`No se encontró el template para ${modulo} en ruta: ${templatePath}`)
        }
        
        container.innerHTML = await response.text()
        
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
        } else if (modulo === 'gastos') {
            const module = await import('./gastos.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'gastos'
        } else if (modulo === 'impuestos') {
            const module = await import('./impuestos.js')
            if (module.iniciar) {
                await module.iniciar()
            }
            moduloActual = 'impuestos'
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
// TABS
// ============================================================

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

// ============================================================
// LOGOUT
// ============================================================

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
// REFRESH
// ============================================================

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
        } else if (moduloActual === 'gastos') {
            const module = await import('./gastos.js')
            if (module.iniciar) {
                await module.iniciar()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        } else if (moduloActual === 'impuestos') {
            const module = await import('./impuestos.js')
            if (module.iniciar) {
                await module.iniciar()
                mostrarMensaje('✅ Datos actualizados', 'exito')
            }
        }
        await cargarStats()
    }
}

// ============================================================
// MI PERFIL
// ============================================================

function setupMiPerfil() {
    const btnMiPerfil = document.getElementById('btnMiPerfil')
    if (btnMiPerfil) {
        btnMiPerfil.onclick = async () => {
            const module = await import('./miPerfil.js')
            module.abrirModalMiPerfil()
        }
    }
}

// ============================================================
// MI EMPRESA
// ============================================================

function setupMiEmpresa() {
    const btnMiEmpresa = document.getElementById('btnMiEmpresa')
    if (btnMiEmpresa) {
        btnMiEmpresa.onclick = async () => {
            const module = await import('./miEmpresa.js')
            module.abrirModalMiEmpresa()
        }
    }
}

// ============================================================
// INIT
// ============================================================

export function init() {
    console.log('🚀 Iniciando Panel SuperUser')
    
    // Configurar restablecimiento de contraseña
    setupForgotPassword()
    
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
                initAyuda()
            }
        }
    }
}

export default {
    init,
    getCurrentUser,
    cargarStats
}