// js/modules/miPerfil.js
// 👤 PERFIL DEL SUPER ADMIN (solo datos personales)

import { sb } from './supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modales/modalesGenerales.js'

const TEMPLATE_URL = 'templates/mi-perfil.html'
const CONTAINER_ID = 'miPerfilContainer'

let perfilActual = null

async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        return true
    } catch (error) {
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario', 'error')
        return false
    }
}

async function cargarDatosActuales() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    
    const { data: perfil } = await sb
        .from('perfiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
    
    perfilActual = { perfil, user }
    return perfilActual
}

function cargarDatosEnFormulario() {
    if (!perfilActual) return
    
    const { perfil, user } = perfilActual
    
    const nombreInput = document.getElementById('perfilNombre')
    if (nombreInput) nombreInput.value = perfil?.nombre_razon_social || ''
    
    const emailInput = document.getElementById('perfilEmail')
    if (emailInput) emailInput.value = user?.email || ''
    
    const telefonoInput = document.getElementById('perfilTelefono')
    if (telefonoInput) telefonoInput.value = perfil?.telefono || ''
}

function recogerDatosFormulario() {
    return {
        nombre: document.getElementById('perfilNombre')?.value.trim() || '',
        telefono: document.getElementById('perfilTelefono')?.value.trim() || ''
    }
}

async function guardarCambios(datos) {
    mostrarModalCarga('Guardando cambios...')
    
    try {
        const { perfil } = perfilActual
        
        if (perfil?.id) {
            await sb.from('perfiles').update({
                nombre_razon_social: datos.nombre,
                telefono: datos.telefono
            }).eq('id', perfil.id)
        }
        
        cerrarModalCarga()
        cerrarModal('modalMiPerfil')
        mostrarModalInformativo('✅ Perfil actualizado', 'Tus datos se han guardado correctamente', 'exito')
        
        const nombreAdmin = document.getElementById('nombreAdmin')
        if (nombreAdmin) nombreAdmin.innerHTML = datos.nombre
        
    } catch (error) {
        cerrarModalCarga()
        console.error(error)
        mostrarModalInformativo('Error', error.message, 'error')
    }
}

async function cambiarMiPassword() {
    const nuevaPassword = prompt('🔐 Introduce tu nueva contraseña (mínimo 6 caracteres):', '')
    
    if (!nuevaPassword || nuevaPassword.length < 6) {
        mostrarModalInformativo('Contraseña inválida', 'Mínimo 6 caracteres', 'error')
        return
    }
    
    mostrarModalCarga('Actualizando contraseña...')
    
    try {
        const { error } = await sb.auth.updateUser({ password: nuevaPassword })
        if (error) throw error
        
        cerrarModalCarga()
        mostrarModalInformativo('✅ Contraseña actualizada', 'Tu contraseña ha sido cambiada correctamente', 'exito')
        
    } catch (error) {
        cerrarModalCarga()
        mostrarModalInformativo('Error', error.message, 'error')
    }
}

export async function abrirModalMiPerfil() {
    await cargarDatosActuales()
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    cargarDatosEnFormulario()
    
    const btnGuardar = document.getElementById('btnGuardarPerfil')
    const btnCancelar = document.getElementById('btnCancelarPerfil')
    const btnCambiarPassword = document.getElementById('btnCambiarPassword')
    
    if (btnGuardar) {
        const nuevoBtn = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtn, btnGuardar)
        nuevoBtn.onclick = async () => {
            const datos = recogerDatosFormulario()
            await guardarCambios(datos)
        }
    }
    
    if (btnCancelar) {
        const nuevoBtn = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtn, btnCancelar)
        nuevoBtn.onclick = () => cerrarModal('modalMiPerfil')
    }
    
    if (btnCambiarPassword) {
        const nuevoBtn = btnCambiarPassword.cloneNode(true)
        btnCambiarPassword.parentNode.replaceChild(nuevoBtn, btnCambiarPassword)
        nuevoBtn.onclick = cambiarMiPassword
    }
    
    abrirModal('modalMiPerfil')
}

export default {
    abrirModalMiPerfil
}