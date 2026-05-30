// js/modules/modales/modalesPassword.js
// 🔐 MODAL PARA GENERAR Y MOSTRAR CONTRASEÑA (con Edge Function)

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

/**
 * Genera una contraseña aleatoria segura
 * @returns {string} Contraseña de 12 caracteres
 */
function generarPassword() {
    const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const minusculas = 'abcdefghijkmnopqrstuvwxyz'
    const numeros = '23456789'
    const simbolos = '!@#$%'
    
    const randomChar = (str) => str[Math.floor(Math.random() * str.length)]
    
    let password = ''
    password += randomChar(mayusculas)
    password += randomChar(minusculas)
    password += randomChar(numeros)
    password += randomChar(simbolos)
    
    const todos = mayusculas + minusculas + numeros + simbolos
    for (let i = password.length; i < 12; i++) {
        password += randomChar(todos)
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Llama a la Edge Function para crear el cliente
 * @param {Object} datos - Datos del cliente
 * @param {string} password - Contraseña elegida
 */
async function llamarEdgeFunctionCrearCliente(datos, password) {
    const { data: { session } } = await sb.auth.getSession()
    const accessToken = session?.access_token
    
    if (!accessToken) {
        throw new Error('No se pudo obtener el token de sesión. ¿Estás logueado?')
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/crear-cliente`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ datos, password })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
        throw new Error(result.error || 'Error al crear el cliente')
    }
    
    return result
}

/**
 * Muestra el modal de contraseña y espera confirmación
 * @param {Object} datosCliente - Datos del cliente
 * @param {string} passwordGenerada - Contraseña generada
 * @returns {Promise<{confirmado: boolean, password: string}>}
 */
function mostrarModalPasswordEspera(datosCliente, passwordGenerada) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalGenerarPassword')
        const passwordSpan = document.getElementById('passwordGenerada')
        const passwordInput = document.getElementById('passwordManual')
        const passwordContainer = document.getElementById('passwordAleatorioContainer')
        const manualContainer = document.getElementById('passwordManualContainer')
        const btnAceptar = document.getElementById('btnAceptarPassword')
        const btnCrearManual = document.getElementById('btnCrearManual')
        const btnAceptarManual = document.getElementById('btnAceptarPasswordManual')
        const btnVolver = document.getElementById('btnVolverAleatorio')
        
        // Mostrar contraseña generada
        passwordSpan.textContent = passwordGenerada
        passwordContainer.style.display = 'block'
        manualContainer.style.display = 'none'
        passwordInput.value = ''
        
        // Variable para saber si ya se resolvió
        let resolved = false
        
        const resolver = (confirmado, password) => {
            if (!resolved) {
                resolved = true
                cerrarModal('modalGenerarPassword')
                resolve({ confirmado, password })
            }
        }
        
        // Configurar botón Aceptar (usa contraseña generada)
        const nuevoBtnAceptar = btnAceptar.cloneNode(true)
        btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar)
        nuevoBtnAceptar.onclick = () => {
            resolver(true, passwordGenerada)
        }
        
        // Configurar botón Crear manualmente
        const nuevoBtnCrearManual = btnCrearManual.cloneNode(true)
        btnCrearManual.parentNode.replaceChild(nuevoBtnCrearManual, btnCrearManual)
        nuevoBtnCrearManual.onclick = () => {
            passwordContainer.style.display = 'none'
            manualContainer.style.display = 'block'
            passwordInput.focus()
        }
        
        // Configurar botón Aceptar contraseña manual
        const nuevoBtnAceptarManual = btnAceptarManual.cloneNode(true)
        btnAceptarManual.parentNode.replaceChild(nuevoBtnAceptarManual, btnAceptarManual)
        nuevoBtnAceptarManual.onclick = () => {
            const passwordManual = passwordInput.value.trim()
            if (!passwordManual || passwordManual.length < 6) {
                mostrarModalInformativo('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres', 'error')
                return
            }
            resolver(true, passwordManual)
        }
        
        // Configurar botón Volver
        const nuevoBtnVolver = btnVolver.cloneNode(true)
        btnVolver.parentNode.replaceChild(nuevoBtnVolver, btnVolver)
        nuevoBtnVolver.onclick = () => {
            manualContainer.style.display = 'none'
            passwordContainer.style.display = 'block'
        }
        
        // También permitir cerrar con ESC o clic fuera? No, debe ser obligatorio aceptar
        // Por eso eliminamos el cierre con ESC temporalmente
        const cerrarConEsc = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                // No cerramos el modal, solo ignoramos ESC
                return false
            }
        }
        document.addEventListener('keydown', cerrarConEsc)
        
        // Cuando se resuelva, remover el listener
        const cleanup = () => {
            document.removeEventListener('keydown', cerrarConEsc)
        }
        
        // Guardar cleanup para después
        const originalCleanup = window._passwordModalCleanup
        if (originalCleanup) originalCleanup()
        window._passwordModalCleanup = cleanup
        
        abrirModal('modalGenerarPassword')
        
        // Cuando el modal se cierre por otro motivo, hacer cleanup
        const observer = new MutationObserver(() => {
            if (modal.style.display !== 'flex') {
                cleanup()
                observer.disconnect()
                if (!resolved) {
                    resolver(false, null)
                }
            }
        })
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] })
    })
}

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

/**
 * Crea un cliente completo usando la Edge Function
 * @param {Object} datosCliente - Datos del cliente
 */
export async function crearClienteCompleto(datosCliente) {
    const passwordGenerada = generarPassword()
    
    // Mostrar modal de contraseña y esperar confirmación
    const { confirmado, password } = await mostrarModalPasswordEspera(datosCliente, passwordGenerada)
    
    if (!confirmado) {
        mostrarModalInformativo('Cancelado', 'La creación del cliente ha sido cancelada', 'error')
        return
    }
    
    mostrarModalCarga('Creando cliente...')
    
    try {
        const result = await llamarEdgeFunctionCrearCliente(datosCliente, password)
        
        cerrarModalCarga()
        
        mostrarModalInformativo(
            '✅ Cliente creado correctamente',
            `<strong>Email:</strong> ${datosCliente.email}<br>
             <strong>Contraseña:</strong> <code style="background:#f1f5f9; padding:4px 8px; border-radius:6px;">${password}</code><br><br>
             ⚠️ Guarda esta contraseña. El cliente recibirá un email con sus credenciales.`,
            'exito'
        )
        
        cerrarModal('modalAltaCliente')
        
        // Recargar lista de clientes
        try {
            const { cargarClientes } = await import('../clientes.js')
            if (typeof cargarClientes === 'function') {
                await cargarClientes()
            }
        } catch (e) {
            console.log('Función cargarClientes no disponible')
        }
        
        // Recargar estadísticas
        try {
            const { cargarStats } = await import('../main.js')
            if (typeof cargarStats === 'function') {
                await cargarStats()
            }
        } catch (e) {
            console.log('Función cargarStats no disponible')
        }
        
        return result
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error en crearClienteCompleto:', error)
        mostrarModalInformativo('Error', error.message, 'error')
        throw error
    }
}

/**
 * Muestra el modal de contraseña (versión simple para otros usos)
 * @param {string} email - Email del usuario
 * @param {Function} onConfirm - Función a ejecutar al confirmar
 */
export async function mostrarModalPasswordPersonalizado(email, onConfirm) {
    const passwordGenerada = generarPassword()
    
    const { confirmado, password } = await mostrarModalPasswordEspera({ email }, passwordGenerada)
    
    if (confirmado && onConfirm) {
        onConfirm(password)
    }
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    crearClienteCompleto,
    mostrarModalPasswordPersonalizado,
    generarPassword
}