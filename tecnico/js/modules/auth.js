// tecnico/js/modules/auth.js
// Autenticación para técnicos (login con nick o email)

import { sb } from '../config/supabase.js'
import { mostrarMensaje } from './utils.js'

let currentUser = null
let currentTecnicoId = null
let currentEmpresaId = null
let isExterno = false
let currentPerfil = null

// ============================================================
// OBTENER DATOS DEL USUARIO ACTUAL
// ============================================================

export function getCurrentUser() {
    return currentUser
}

export function getCurrentTecnicoId() {
    return currentTecnicoId
}

export function getCurrentEmpresaId() {
    return currentEmpresaId
}

export function getIsExterno() {
    return isExterno
}

export function getCurrentPerfil() {
    return currentPerfil
}

// ============================================================
// LOGIN CON NICK O EMAIL
// ============================================================

export async function hacerLogin(identificador, password) {
    if (!identificador || !password) {
        throw new Error('Introduce nick/email y contraseña')
    }
    
    let email = identificador
    
    // Si no contiene @, buscar el email por nick
    if (!identificador.includes('@')) {
        const { data: perfil, error } = await sb
            .from('perfiles')
            .select('email')
            .eq('nick', identificador)
            .maybeSingle()
        
        if (error || !perfil) {
            throw new Error('Usuario no encontrado')
        }
        email = perfil.email
    }
    
    // Login con Supabase
    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
    })
    
    if (error) {
        throw new Error(error.message)
    }
    
    // Obtener perfil del técnico usando user_id (CORREGIDO)
    const { data: perfil, error: perfilError } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle()
    
    if (perfilError || !perfil) {
        await sb.auth.signOut()
        throw new Error('Perfil no encontrado')
    }
    
    if (perfil.rol !== 'tecnico') {
        await sb.auth.signOut()
        throw new Error('Acceso solo para técnicos')
    }
    
    // Guardar datos de sesión
    currentUser = data.user
    currentPerfil = perfil
    currentTecnicoId = perfil.id
    currentEmpresaId = perfil.empresa_id
    isExterno = perfil.tipo_externo === true
    
    return {
        user: currentUser,
        perfil: perfil,
        tecnicoId: currentTecnicoId,
        empresaId: currentEmpresaId,
        isExterno: isExterno
    }
}

// ============================================================
// LOGOUT
// ============================================================

export async function cerrarSesion() {
    await sb.auth.signOut()
    currentUser = null
    currentTecnicoId = null
    currentEmpresaId = null
    isExterno = false
    currentPerfil = null
    window.location.reload()
}

// ============================================================
// OBTENER DATOS DE LA EMPRESA DEL TÉCNICO
// ============================================================

export async function getEmpresaInfo() {
    if (!currentEmpresaId) return null
    
    const { data, error } = await sb
        .from('empresas')
        .select('nombre_empresa, nif_cif')
        .eq('id', currentEmpresaId)
        .single()
    
    if (error) {
        console.error('Error obteniendo empresa:', error)
        return null
    }
    
    return data
}

// ============================================================
// ACTUALIZAR PERFIL DEL TÉCNICO
// ============================================================

export async function actualizarPerfil(datos) {
    if (!currentTecnicoId) throw new Error('No hay sesión activa')
    
    const { error } = await sb
        .from('perfiles')
        .update({
            nombre_razon_social: datos.nombre,
            telefono: datos.telefono
        })
        .eq('id', currentTecnicoId)
    
    if (error) throw error
    
    if (currentPerfil) {
        currentPerfil.nombre_razon_social = datos.nombre
        currentPerfil.telefono = datos.telefono
    }
    
    return true
}

// ============================================================
// VERIFICAR SESIÓN ACTIVA
// ============================================================

export async function verificarSesion() {
    const { data: { session } } = await sb.auth.getSession()
    
    if (!session) {
        return false
    }
    
    const { data: perfil } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
    
    if (!perfil || perfil.rol !== 'tecnico') {
        await sb.auth.signOut()
        return false
    }
    
    currentUser = session.user
    currentPerfil = perfil
    currentTecnicoId = perfil.id
    currentEmpresaId = perfil.empresa_id
    isExterno = perfil.tipo_externo === true
    
    return true
}