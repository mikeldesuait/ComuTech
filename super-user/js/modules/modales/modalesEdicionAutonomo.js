// js/modules/modales/modalesEdicionAutonomo.js
// 👤 LÓGICA DE EDICIÓN DE AUTÓNOMOS

import { sb } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

const TEMPLATE_URL = 'templates/clientes/editar-autonomo.html'
const CONTAINER_ID = 'editarClienteContainer'

async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template: ${TEMPLATE_URL}`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        console.log('✅ Template de autónomo cargado')
        return true
    } catch (error) {
        console.error(error)
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario de edición', 'error')
        return false
    }
}

function cargarDatosEnFormulario(cliente) {
    console.log('📝 Cargando datos del autónomo:', cliente.nombre_empresa)
    
    const nombreCompleto = cliente.nombre_empresa || ''
    const partes = nombreCompleto.split(' ')
    const nombre = partes[0] || ''
    const apellido1 = partes[1] || ''
    const apellido2 = partes.slice(2).join(' ') || ''
    
    const elementos = {
        editNombreFisica: nombre,
        editPrimerApellido: apellido1,
        editSegundoApellido: apellido2,
        editEmailFisica: cliente.contacto_email || cliente.email || '',
        editNifFisica: cliente.nif_cif || '',
        editTelefonoFisica: cliente.telefono || '',
        editWhatsappFisica: cliente.whatsapp_contacto || '',
        editOficioSelect: cliente.oficio || '',
        editFechaInicioActividad: cliente.fecha_inicio_actividad || '',
        editCalle: cliente.calle || '',
        editNumero: cliente.numero || '',
        editPiso: cliente.piso || '',
        editCodigoPostal: cliente.codigo_postal || '',
        editMunicipio: cliente.ciudad || cliente.municipio || '',
        editProvincia: cliente.provincia || '',
        editIban: cliente.iban || '',
        editBanco: cliente.banco || '',
        editSwift: cliente.swift || '',
        editCnae: cliente.cnae || '',
        editClienteId: cliente.id,
        editPerfilId: cliente.perfil_id || ''
    }
    
    for (const [id, value] of Object.entries(elementos)) {
        const el = document.getElementById(id)
        if (el) {
            if (id === 'editEmailFisica') {
                el.value = value
                el.readOnly = true
                el.style.background = '#f1f5f9'
            } else {
                el.value = value
            }
        }
    }
}

function recogerDatosFormulario() {
    const id = document.getElementById('editClienteId')?.value
    if (!id) return null
    
    const nombre = document.getElementById('editNombreFisica')?.value.trim() || ''
    const apellido1 = document.getElementById('editPrimerApellido')?.value.trim() || ''
    const apellido2 = document.getElementById('editSegundoApellido')?.value.trim() || ''
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim()
    
    let oficio = document.getElementById('editOficioSelect')?.value || ''
    if (oficio === 'otro') {
        oficio = document.getElementById('editOtroOficioTexto')?.value.trim() || 'otro'
    }
    
    let whatsapp = document.getElementById('editWhatsappFisica')?.value.trim() || ''
    const mismoWhatsapp = document.getElementById('editMismoWhatsappFisica')?.checked
    const telefono = document.getElementById('editTelefonoFisica')?.value.trim() || ''
    if (mismoWhatsapp && telefono) {
        whatsapp = telefono
    }
    
    return {
        id: id,
        perfil_id: document.getElementById('editPerfilId')?.value,
        nombre_empresa: nombreCompleto,
        nif_cif: document.getElementById('editNifFisica')?.value.trim() || '',
        telefono: telefono,
        whatsapp_contacto: whatsapp,
        oficio: oficio,
        calle: document.getElementById('editCalle')?.value.trim() || '',
        numero: document.getElementById('editNumero')?.value.trim() || '',
        piso: document.getElementById('editPiso')?.value.trim() || '',
        codigo_postal: document.getElementById('editCodigoPostal')?.value.trim() || '',
        ciudad: document.getElementById('editMunicipio')?.value.trim() || '',
        provincia: document.getElementById('editProvincia')?.value.trim() || '',
        iban: document.getElementById('editIban')?.value.trim() || '',
        banco: document.getElementById('editBanco')?.value.trim() || '',
        swift: document.getElementById('editSwift')?.value.trim() || '',
        cnae: document.getElementById('editCnae')?.value.trim() || '',
        fecha_inicio_actividad: document.getElementById('editFechaInicioActividad')?.value || null
    }
}

async function guardarCambios(datos) {
    if (!datos) return false
    
    try {
        const { id, perfil_id, ...updateData } = datos
        
        const { error: empresaError } = await sb
            .from('empresas')
            .update(updateData)
            .eq('id', id)
        
        if (empresaError) throw empresaError
        
        if (perfil_id) {
            await sb.from('perfiles').update({
                nombre_razon_social: updateData.nombre_empresa,
                telefono: updateData.telefono
            }).eq('id', perfil_id)
        }
        
        return true
        
    } catch (error) {
        console.error('Error guardando:', error)
        mostrarModalInformativo('Error', error.message, 'error')
        return false
    }
}

async function recargarListaClientes() {
    try {
        const { cargarClientes } = await import('../clientes.js')
        if (typeof cargarClientes === 'function') await cargarClientes()
    } catch (e) {}
}

async function actualizarStats() {
    try {
        const { cargarStats } = await import('../main.js')
        if (typeof cargarStats === 'function') await cargarStats()
    } catch (e) {}
}

function abrirModalResetearPassword(email) {
    const modal = document.getElementById('modalResetearPassword')
    if (!modal) {
        mostrarModalInformativo('Error', 'Modal de reseteo no encontrado', 'error')
        return
    }
    
    const emailInput = document.getElementById('resetEmail')
    const nuevaPassInput = document.getElementById('resetNuevaPassword')
    const confirmarPassInput = document.getElementById('resetConfirmarPassword')
    const errorDiv = document.getElementById('resetPasswordError')
    
    if (emailInput) emailInput.value = email
    if (nuevaPassInput) nuevaPassInput.value = ''
    if (confirmarPassInput) confirmarPassInput.value = ''
    if (errorDiv) errorDiv.style.display = 'none'
    
    modal.style.display = 'flex'
    
    const btnConfirmar = document.getElementById('btnConfirmarReset')
    if (btnConfirmar) {
        const nuevoBtnConfirmar = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar)
        nuevoBtnConfirmar.onclick = async () => {
            const nuevaPassword = document.getElementById('resetNuevaPassword')?.value.trim() || ''
            const confirmarPassword = document.getElementById('resetConfirmarPassword')?.value.trim() || ''
            
            if (!nuevaPassword || nuevaPassword.length < 6) {
                if (errorDiv) {
                    errorDiv.innerText = '❌ La contraseña debe tener al menos 6 caracteres'
                    errorDiv.style.display = 'block'
                }
                return
            }
            
            if (nuevaPassword !== confirmarPassword) {
                if (errorDiv) {
                    errorDiv.innerText = '❌ Las contraseñas no coinciden'
                    errorDiv.style.display = 'block'
                }
                return
            }
            
            modal.style.display = 'none'
            await ejecutarResetearPassword(email, nuevaPassword)
        }
    }
    
    const btnCancelar = document.getElementById('btnCancelarReset')
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => modal.style.display = 'none'
    }
    
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none' }
}

async function ejecutarResetearPassword(email, nuevaPassword) {
    mostrarModalCarga('Actualizando contraseña...')
    try {
        const { data: { session } } = await sb.auth.getSession()
        const { SUPABASE_URL } = await import('../supabase.js')
        const response = await fetch(`${SUPABASE_URL}/functions/v1/resetear-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ email, nuevaPassword })
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        cerrarModalCarga()
        mostrarModalInformativo('✅ Contraseña actualizada', `La contraseña para ${email} ha sido actualizada`, 'exito')
    } catch (error) {
        cerrarModalCarga()
        mostrarModalInformativo('Error', error.message, 'error')
    }
}

function configurarBotonReset(email) {
    let btnReset = document.getElementById('btnResetPassword')
    if (btnReset) {
        const nuevoBtn = btnReset.cloneNode(true)
        btnReset.parentNode.replaceChild(nuevoBtn, btnReset)
        nuevoBtn.onclick = (e) => {
            e.preventDefault()
            abrirModalResetearPassword(email)
        }
    }
}

export async function abrirModalEditarAutonomo(cliente) {
    console.log('🚪 abrirModalEditarAutonomo() llamada para:', cliente.nombre_empresa)
    
    if (!cliente || !cliente.id) {
        mostrarModalInformativo('Error', 'No se pudo identificar el cliente', 'error')
        return
    }
    
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    const header = document.getElementById('modalEditarClienteHeader')
    if (header) header.innerHTML = `✏️ Editar autónomo: ${cliente.nombre_empresa || 'Sin nombre'}`
    
    cargarDatosEnFormulario(cliente)
    
    const btnGuardar = document.getElementById('btnGuardarEdicion')
    if (btnGuardar) {
        const nuevoBtnGuardar = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtnGuardar, btnGuardar)
        nuevoBtnGuardar.onclick = async () => {
            mostrarModalCarga('Guardando cambios...')
            const datos = recogerDatosFormulario()
            const success = await guardarCambios(datos)
            cerrarModalCarga()
            if (success) {
                cerrarModal('modalEditarCliente')
                mostrarModalInformativo('✅ Autónomo actualizado', 'Los cambios se han guardado correctamente', 'exito')
                await recargarListaClientes()
                await actualizarStats()
            }
        }
    }
    
    const btnCancelar = document.getElementById('btnCancelarEdicion')
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalEditarCliente')
    }
    
    const email = cliente.contacto_email || cliente.email
    if (email) {
        configurarBotonReset(email)
    }
    
    abrirModal('modalEditarCliente')
}

export default {
    abrirModalEditarAutonomo
}