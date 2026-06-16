// cliente/js/modules/auth.js
// Autenticación para clientes (acceso con código único)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearCodigoAcceso } from './utils.js'

let currentCliente = null
let currentClienteId = null
let currentEmpresaId = null
let currentCodigo = null

// ============================================================
// OBTENER DATOS DEL CLIENTE ACTUAL
// ============================================================

export function getCurrentCliente() {
    return currentCliente
}

export function getCurrentClienteId() {
    return currentClienteId
}

export function getCurrentEmpresaId() {
    return currentEmpresaId
}

export function getCurrentCodigo() {
    return currentCodigo
}

// ============================================================
// LOGIN CON CÓDIGO DE ACCESO
// ============================================================

export async function hacerLogin(codigo) {
    if (!codigo || codigo.trim() === '') {
        throw new Error('Introduce el código de acceso')
    }
    
    const codigoLimpio = formatearCodigoAcceso(codigo)
    
    // Buscar cliente por código de acceso
    const { data: cliente, error } = await sb
        .from('clientes')
        .select('*, empresas(id, nombre_empresa)')
        .eq('codigo_acceso', codigoLimpio)
        .maybeSingle()
    
    if (error || !cliente) {
        throw new Error('Código de acceso no válido')
    }
    
    if (!cliente.acceso_activo) {
        throw new Error('Este código de acceso está desactivado')
    }
    
    currentCliente = cliente
    currentClienteId = cliente.id
    currentEmpresaId = cliente.empresa_id
    currentCodigo = codigoLimpio
    
    return {
        cliente: currentCliente,
        clienteId: currentClienteId,
        empresaId: currentEmpresaId,
        codigo: currentCodigo
    }
}

// ============================================================
// LOGOUT
// ============================================================

export function cerrarSesion() {
    currentCliente = null
    currentClienteId = null
    currentEmpresaId = null
    currentCodigo = null
    window.location.reload()
}

// ============================================================
// VERIFICAR SESIÓN
// ============================================================

export function verificarSesion() {
    const storedCodigo = localStorage.getItem('cliente_codigo_acceso')
    const storedCliente = localStorage.getItem('cliente_datos')
    
    if (storedCodigo && storedCliente) {
        try {
            currentCodigo = storedCodigo
            currentCliente = JSON.parse(storedCliente)
            currentClienteId = currentCliente.id
            currentEmpresaId = currentCliente.empresa_id
            return true
        } catch (e) {
            return false
        }
    }
    return false
}

// ============================================================
// GUARDAR SESIÓN
// ============================================================

export function guardarSesion() {
    if (currentCliente && currentCodigo) {
        localStorage.setItem('cliente_codigo_acceso', currentCodigo)
        localStorage.setItem('cliente_datos', JSON.stringify(currentCliente))
    }
}

// ============================================================
// LIMPIAR SESIÓN
// ============================================================

export function limpiarSesion() {
    localStorage.removeItem('cliente_codigo_acceso')
    localStorage.removeItem('cliente_datos')
    currentCliente = null
    currentClienteId = null
    currentEmpresaId = null
    currentCodigo = null
}