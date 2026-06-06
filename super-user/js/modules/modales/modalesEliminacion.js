// js/modules/modales/modalesEliminacion.js
import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'
import { getCurrentUser } from '../main.js'

let clientePendienteEliminar = null

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
    
    mensajeDiv.innerHTML = `¿Estás seguro de que quieres eliminar a <strong>"${nombreCliente}"</strong>?<br><small>Esta acción es irreversible.</small>`
    
    if (passwordInput) passwordInput.value = ''
    if (errorDiv) errorDiv.style.display = 'none'
    
    const btnConfirmar = document.getElementById('btnConfirmarEliminacion')
    if (btnConfirmar) {
        const nuevoBtnConfirmar = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar)
        nuevoBtnConfirmar.onclick = ejecutarEliminacionCliente
    }
    
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
        // 1. Verificar contraseña
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
        
        const { id: empresaId, nombre: nombreCliente } = clientePendienteEliminar
        
        // 2. Verificar si el cliente tiene facturas
        cerrarModalCarga()
        mostrarModalCarga('Verificando facturas...')
        
        const { data: facturas, error: facturasError, count } = await sb
            .from('facturas')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
        
        if (facturasError) {
            throw new Error('Error al verificar facturas')
        }
        
        const tieneFacturas = count > 0
        
        cerrarModalCarga()
        
        // 3. Si tiene facturas → NO se puede borrar
        if (tieneFacturas) {
            cerrarModal('modalConfirmarEliminacion')
            mostrarModalInformativo(
                '❌ No se puede eliminar el cliente',
                `El cliente "${nombreCliente}" tiene ${count} factura(s) asociadas.\n\n` +
                `Para cumplir con la normativa fiscal, no se puede eliminar un cliente con facturas.\n\n` +
                `Si deseas que no aparezca en listados, puedes marcar el cliente como "inactivo" desde el panel de edición.`,
                'error'
            )
            clientePendienteEliminar = null
            return
        }
        
        // 4. Si NO tiene facturas, preguntar antes de eliminar
        const confirmar = confirm(
            `⚠️ ¿Eliminar permanentemente a "${nombreCliente}"?\n\n` +
            `Este cliente NO tiene facturas asociadas.\n` +
            `La acción es irreversible.`
        )
        
        if (!confirmar) {
            cerrarModal('modalConfirmarEliminacion')
            clientePendienteEliminar = null
            return
        }
        
        mostrarModalCarga('Eliminando cliente...')
        
        // 5. Eliminar dependencias
        await sb.from('perfiles').delete().eq('empresa_id', empresaId)
        await sb.from('suscripciones_clientes').delete().eq('empresa_id', empresaId)
        
        // 6. Eliminar la empresa
        const { error: deleteError } = await sb
            .from('empresas')
            .delete()
            .eq('id', empresaId)
        
        if (deleteError) throw deleteError
        
        cerrarModalCarga()
        cerrarModal('modalConfirmarEliminacion')
        mostrarModalInformativo('✅ Cliente eliminado', `"${nombreCliente}" ha sido eliminado correctamente`, 'exito')
        
        clientePendienteEliminar = null
        
        // 7. Recargar listas
        try {
            const { cargarClientes } = await import('../clientes.js')
            if (typeof cargarClientes === 'function') await cargarClientes()
        } catch (e) {}
        
        try {
            const { cargarStats } = await import('../main.js')
            if (typeof cargarStats === 'function') await cargarStats()
        } catch (e) {}
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error:', error)
        mostrarModalInformativo('Error', error.message || 'No se pudo procesar la solicitud', 'error')
    }
}

export default {
    abrirModalEliminarCliente,
    ejecutarEliminacionCliente
}