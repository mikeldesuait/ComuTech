// tecnico/js/modules/auth.js
import { sb } from '../config/supabase.js'

let currentUser = null
let currentTecnicoId = null
let currentEmpresaId = null
let isExterno = false
let currentPerfil = null

export function getCurrentUser() { return currentUser }
export function getCurrentTecnicoId() { return currentTecnicoId }
export function getCurrentEmpresaId() { return currentEmpresaId }
export function getIsExterno() { return isExterno }
export function getCurrentPerfil() { return currentPerfil }

export async function hacerLogin(identificador, password) {
    if (!identificador || !password) throw new Error('Introduce nick/email y contraseña')
    let email = identificador
    if (!identificador.includes('@')) {
        const { data: perfil, error } = await sb.from('perfiles').select('email').eq('nick', identificador).maybeSingle()
        if (error || !perfil) throw new Error('Usuario no encontrado')
        email = perfil.email
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const { data: perfil, error: perfilError } = await sb.from('perfiles').select('*').eq('user_id', data.user.id).maybeSingle()
    if (perfilError || !perfil) { await sb.auth.signOut(); throw new Error('Perfil no encontrado') }
    if (perfil.rol !== 'tecnico') { await sb.auth.signOut(); throw new Error('Acceso solo para técnicos') }
    currentUser = data.user; currentPerfil = perfil; currentTecnicoId = perfil.id; currentEmpresaId = perfil.empresa_id; isExterno = perfil.tipo_externo === true
    return { user: currentUser, perfil, tecnicoId: currentTecnicoId, empresaId: currentEmpresaId, isExterno }
}

export async function cerrarSesion() {
    await sb.auth.signOut()
    currentUser = null; currentTecnicoId = null; currentEmpresaId = null; isExterno = false; currentPerfil = null
    window.location.reload()
}

export async function verificarSesion() {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return false
    const { data: perfil, error } = await sb.from('perfiles').select('*').eq('user_id', session.user.id).maybeSingle()
    if (error || !perfil || perfil.rol !== 'tecnico') { await sb.auth.signOut(); return false }
    currentUser = session.user; currentPerfil = perfil; currentTecnicoId = perfil.id; currentEmpresaId = perfil.empresa_id; isExterno = perfil.tipo_externo === true
    return true
}