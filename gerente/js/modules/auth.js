// gerente/js/modules/auth.js
// Autenticación para gerentes (login con email)

import { sb } from '../config/supabase.js'

let currentUser = null
let currentPerfil = null
let currentEmpresaId = null

// ============================================================
// OBTENER DATOS DEL USUARIO ACTUAL
// ============================================================

export function getCurrentUser() {
    return currentUser
}

export function getCurrentPerfil() {
    return currentPerfil
}

export function getCurrentEmpresaId() {
    return currentEmpresaId
}

// ============================================================
// LOGIN CON EMAIL
// ============================================================

export async function hacerLogin(email, password) {
    if (!email || !password) {
        throw new Error('Introduce email y contraseña')
    }
    
    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
    })
    
    if (error) {
        throw new Error(error.message)
    }
    
    const { data: perfil, error: perfilError } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle()
    
    if (perfilError || !perfil) {
        await sb.auth.signOut()
        throw new Error('Perfil no encontrado')
    }
    
    if (perfil.rol !== 'gerente') {
        await sb.auth.signOut()
        throw new Error('Acceso solo para gerentes')
    }
    
    currentUser = data.user
    currentPerfil = perfil
    currentEmpresaId = perfil.empresa_id
    
    return {
        user: currentUser,
        perfil: currentPerfil,
        empresaId: currentEmpresaId
    }
}

// ============================================================
// LOGOUT
// ============================================================

export async function cerrarSesion() {
    await sb.auth.signOut()
    currentUser = null
    currentPerfil = null
    currentEmpresaId = null
    window.location.reload()
}

// ============================================================
// VERIFICAR SESIÓN ACTIVA
// ============================================================

export async function verificarSesion() {
    const { data: { session } } = await sb.auth.getSession()
    
    if (!session) {
        return false
    }
    
    const { data: perfil, error } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
    
    if (error || !perfil || perfil.rol !== 'gerente') {
        await sb.auth.signOut()
        return false
    }
    
    currentUser = session.user
    currentPerfil = perfil
    currentEmpresaId = perfil.empresa_id
    
    return true
}