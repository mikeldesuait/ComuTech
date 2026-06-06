// js/modules/modales/modalesPassword.js
// 🔐 MODAL PARA GENERAR Y MOSTRAR CONTRASEÑA (con opción de cambiarla)

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'
import { mostrarMensaje } from '../utils.js'

let passwordGeneradaActual = null
let emailClienteActual = null

function generarPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)]
    }
    return password
}

function generarPasswordLegible() {
    // Opción: contraseña más legible (sin caracteres confusos)
    const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const minusculas = 'abcdefghijkmnopqrstuvwxyz'
    const numeros = '23456789'
    
    const palabra1 = 'Casa Perro Sol Luna Mar Rio Flor Sol Luz Azul'.split(' ')
    const palabra2 = 'Azul Verde Rojo Alto Bajo Rápido Lento'.split(' ')
    const numero = Math.floor(Math.random() * 900 + 100)
    
    return `${palabra1[Math.floor(Math.random() * palabra1.length)]}${palabra2[Math.floor(Math.random() * palabra2.length)]}${numero}`
}

async function llamarEdgeFunctionCrearCliente(datos, password) {
    const { data: { session } } = await sb.auth.getSession()
    const accessToken = session?.access_token
    
    if (!accessToken) {
        throw new Error('No se pudo obtener el token de sesión')
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

async function actualizarPasswordCliente(email, nuevaPassword) {
    // Esta función actualiza la contraseña después de creado el cliente
    const { data: { session } } = await sb.auth.getSession()
    const accessToken = session?.access_token
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/resetear-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ email, nuevaPassword })
    })
    
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    return result
}

function mostrarModalPasswordPersonalizable(email, passwordInicial, onPasswordConfirmada) {
    // Crear un modal personalizado (no usar el informativo normal)
    const modalDiv = document.createElement('div')
    modalDiv.className = 'modal'
    modalDiv.style.display = 'flex'
    modalDiv.style.zIndex = '100001'
    
    modalDiv.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">🎉 Cliente creado correctamente</div>
            <div style="padding: 8px 0;">
                <p><strong>📧 Email:</strong> ${email}</p>
                <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">🔐 Contraseña:</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="passwordInputModal" value="${passwordInicial}" style="flex: 1; font-family: monospace; font-size: 14px; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        <button id="btnRegenerarPasswordModal" class="btn-sm" style="background: #e67e22; color: white; padding: 8px 12px;">🔄 Regenerar</button>
                    </div>
                </div>
                <div class="alert-info" style="background: #fef3c7; border-left-color: #f59e0b;">
                    <p style="font-size: 12px;">⚠️ Guarda esta contraseña. Si la olvida, podrás resetearla desde edición.</p>
                </div>
                <div class="btn-group" style="margin-top: 16px;">
                    <button id="btnConfirmarPasswordModal" class="btn-success">✅ Guardar y continuar</button>
                    <button id="btnCopiarPasswordModal" class="btn-info">📋 Copiar</button>
                </div>
            </div>
        </div>
    `
    
    document.body.appendChild(modalDiv)
    
    let passwordActual = passwordInicial
    const passwordInput = modalDiv.querySelector('#passwordInputModal')
    const btnRegenerar = modalDiv.querySelector('#btnRegenerarPasswordModal')
    const btnConfirmar = modalDiv.querySelector('#btnConfirmarPasswordModal')
    const btnCopiar = modalDiv.querySelector('#btnCopiarPasswordModal')
    
    // Regenerar contraseña
    btnRegenerar.onclick = () => {
        const nuevaPassword = generarPassword()
        passwordActual = nuevaPassword
        passwordInput.value = nuevaPassword
        mostrarMensaje('🔄 Contraseña regenerada', 'exito')
    }
    
    // Copiar al portapapeles
    btnCopiar.onclick = async () => {
        try {
            await navigator.clipboard.writeText(passwordActual)
            mostrarMensaje('📋 Contraseña copiada', 'exito')
            btnCopiar.textContent = '✅ Copiado!'
            setTimeout(() => {
                btnCopiar.textContent = '📋 Copiar'
            }, 2000)
        } catch (e) {
            mostrarMensaje('❌ No se pudo copiar', 'error')
        }
    }
    
    // Confirmar y guardar
    btnConfirmar.onclick = async () => {
        const passwordFinal = passwordInput.value.trim()
        if (!passwordFinal || passwordFinal.length < 6) {
            mostrarMensaje('❌ La contraseña debe tener al menos 6 caracteres', 'error')
            return
        }
        
        mostrarModalCarga('Guardando contraseña...')
        
        try {
            // Si la contraseña cambió, actualizarla
            if (passwordFinal !== passwordInicial) {
                await actualizarPasswordCliente(email, passwordFinal)
                mostrarMensaje('✅ Contraseña actualizada', 'exito')
            }
            
            cerrarModalCarga()
            modalDiv.remove()
            
            if (onPasswordConfirmada) {
                onPasswordConfirmada(passwordFinal)
            }
            
            // Recargar lista de clientes
            try {
                const { cargarClientes } = await import('../clientes.js')
                if (typeof cargarClientes === 'function') {
                    await cargarClientes()
                }
            } catch (e) {}
            
        } catch (error) {
            cerrarModalCarga()
            mostrarModalInformativo('Error', error.message, 'error')
        }
    }
    
    // Cerrar si click fuera
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) {
            if (confirm('¿Cancelar? La contraseña se perderá y deberás resetearla manualmente.')) {
                modalDiv.remove()
            }
        }
    }
}

export async function crearClienteCompleto(datosCliente) {
    console.log('🟢 crearClienteCompleto llamado con:', datosCliente)
    
    mostrarModalCarga('Creando cliente...')
    
    try {
        const password = generarPassword()
        emailClienteActual = datosCliente.email
        
        const result = await llamarEdgeFunctionCrearCliente(datosCliente, password)
        
        cerrarModalCarga()
        cerrarModal('modalAltaCliente')
        
        // Mostrar modal personalizado con opción de cambiar contraseña
        mostrarModalPasswordPersonalizable(datosCliente.email, password, async (passwordFinal) => {
            mostrarModalInformativo(
                '✅ Cliente creado',
                `El cliente <strong>${datosCliente.nombre_empresa}</strong> ha sido creado correctamente.<br><br>Se ha enviado el email de invitación.`,
                'exito'
            )
        })
        
        return result
        
    } catch (error) {
        cerrarModalCarga()
        console.error('❌ Error en crearClienteCompleto:', error)
        mostrarModalInformativo('Error', error.message, 'error')
        throw error
    }
}

export default {
    crearClienteCompleto
}