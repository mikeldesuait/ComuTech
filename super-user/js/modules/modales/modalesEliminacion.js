// js/modules/modales/modalesEliminacion.js
// 🗑️ LÓGICA DE ELIMINACIÓN DE CLIENTES (con Edge Function)

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'
import { getCurrentUser } from '../main.js'

let clientePendienteEliminar = null

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

/**
 * Abre el modal de confirmación de eliminación
 */
export function abrirModalEliminarCliente(clienteId, nombreCliente) {
    clientePendienteEliminar = { id: clienteId, nombre: nombreCliente }
    
    const modalEliminar = document.getElementById('modalConfirmarEliminacion')
    const mensajeDiv = document.getElementById('mensajeEliminacionCliente')
    const passwordInput = document.getElementById('passwordConfirmacion')
    const errorDiv = document.getElementById('errorPasswordConfirmacion')
    
    if (!modalEliminar || !mensajeDiv) {
        console.error('Modal de eliminación no encontrado')
        return
    }
    
    mensajeDiv.innerHTML = `¿Estás seguro de que quieres eliminar a <strong>"${nombreCliente}"</strong> y todos sus datos?<br><small>Esta acción es irreversible.</small>`
    
    if (passwordInput) passwordInput.value = ''
    if (errorDiv) errorDiv.style.display = 'none'
    
    // Configurar botón confirmar
    const btnConfirmar = document.getElementById('btnConfirmarEliminacion')
    if (btnConfirmar) {
        const nuevoBtnConfirmar = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar)
        nuevoBtnConfirmar.onclick = ejecutarEliminacionCliente
    }
    
    // Configurar botón cancelar
    const btnCancelar = document.getElementById('btnCancelarEliminacion')
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => {
            cerrarModal('modalConfirmarEliminacion')
            clientePendienteEliminar = null
            const pwdInput = document.getElementById('passwordConfirmacion')
            const errDiv = document.getElementById('errorPasswordConfirmacion')
            if (pwdInput) pwdInput.value = ''
            if (errDiv) errDiv.style.display = 'none'
        }
    }
    
    abrirModal('modalConfirmarEliminacion')
}

/**
 * Ejecuta la eliminación usando Edge Function
 */
export async function ejecutarEliminacionCliente() {
    const currentUser = getCurrentUser()
    
    if (!clientePendienteEliminar) {
        mostrarModalInformativo('Error', 'No hay cliente seleccionado', 'error')
        cerrarModal('modalConfirmarEliminacion')
        return
    }
    
    const passwordConfirm = document.getElementById('passwordConfirmacion')?.value || ''
    const errorDiv = document.getElementById('errorPasswordConfirmacion')
    
    if (!passwordConfirm) {
        if (errorDiv) {
            errorDiv.innerText = '❌ Introduce tu contraseña para confirmar'
            errorDiv.style.display = 'block'
        }
        return
    }
    
    if (errorDiv) errorDiv.style.display = 'none'
    
    mostrarModalCarga('Verificando credenciales...')
    
    try {
        // 1. Verificar contraseña del super admin
        const { error: authError } = await sb.auth.signInWithPassword({
            email: currentUser.email,
            password: passwordConfirm
        })
        
        if (authError) {
            cerrarModalCarga()
            if (errorDiv) {
                errorDiv.innerText = '❌ Contraseña incorrecta'
                errorDiv.style.display = 'block'
            }
            return
        }
        
        cerrarModalCarga()
        mostrarModalCarga('Eliminando cliente...')
        
        const { id: empresaId, nombre: nombreCliente } = clientePendienteEliminar
        
        // 2. Obtener el token de sesión actual
        const { data: { session } } = await sb.auth.getSession()
        const accessToken = session?.access_token
        
        if (!accessToken) {
            throw new Error('No se pudo obtener el token de sesión')
        }
        
        // 3. Llamar a la Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/eliminar-cliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ clienteId: empresaId })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar el cliente')
        }
        
        cerrarModalCarga()
        cerrarModal('modalConfirmarEliminacion')
        
        mostrarModalInformativo('✅ Cliente eliminado', `"${nombreCliente}" ha sido eliminado correctamente`, 'exito')
        
        // 4. Recargar lista de clientes
        try {
            const { cargarClientes } = await import('../clientes.js')
            if (typeof cargarClientes === 'function') {
                await cargarClientes()
            }
        } catch (e) {
            console.log('Función cargarClientes no disponible')
        }
        
        // 5. Recargar estadísticas
        try {
            const { cargarStats } = await import('../main.js')
            if (typeof cargarStats === 'function') {
                await cargarStats()
            }
        } catch (e) {
            console.log('Función cargarStats no disponible')
        }
        
        clientePendienteEliminar = null
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error en ejecutarEliminacionCliente:', error)
        mostrarModalInformativo('Error', error.message || 'No se pudo eliminar el cliente', 'error')
    }
}

// ============================================================
// EXPORTAR
// ============================================================

export default {
    abrirModalEliminarCliente,
    ejecutarEliminacionCliente
}