// js/modules/modales/modalesPassword.js
// 🔐 MODAL PARA GENERAR Y MOSTRAR CONTRASEÑA

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

function generarPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)]
    }
    return password
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

export async function crearClienteCompleto(datosCliente) {
    console.log('🟢 crearClienteCompleto llamado con:', datosCliente)
    
    mostrarModalCarga('Creando cliente...')
    
    try {
        const password = generarPassword()
        
        const result = await llamarEdgeFunctionCrearCliente(datosCliente, password)
        
        cerrarModalCarga()
        
        mostrarModalInformativo(
            '✅ Cliente creado correctamente',
            `<strong>Email:</strong> ${datosCliente.email}<br>
             <strong>Contraseña:</strong> <code style="background:#f1f5f9; padding:4px 8px; border-radius:6px;">${password}</code><br><br>
             ⚠️ Guarda esta contraseña.`,
            'exito'
        )
        
        cerrarModal('modalAltaCliente')
        
        try {
            const { cargarClientes } = await import('../clientes.js')
            if (typeof cargarClientes === 'function') {
                await cargarClientes()
            }
        } catch (e) {}
        
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