// js/modules/modales/modalesEdicionAutonomo.js
// ✏️ LÓGICA DE EDICIÓN DE AUTÓNOMOS

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

const TEMPLATE_URL = 'templates/clientes/editar-autonomo.html'
const CONTAINER_ID = 'editarClienteContainer'

async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template: ${TEMPLATE_URL}`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        return true
    } catch (error) {
        console.error(error)
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario de edición', 'error')
        return false
    }
}

function cargarDatosEnFormulario(cliente) {
    // Dividir nombre completo en nombre y apellidos
    const nombreCompleto = cliente.nombre_empresa || ''
    const partes = nombreCompleto.split(' ')
    const nombre = partes[0] || ''
    const apellido1 = partes[1] || ''
    const apellido2 = partes[2] || ''
    
    document.getElementById('editNombreFisica').value = nombre
    document.getElementById('editPrimerApellido').value = apellido1
    document.getElementById('editSegundoApellido').value = apellido2
    document.getElementById('editEmailFisica').value = cliente.contacto_email || cliente.email || ''
    document.getElementById('editNifFisica').value = cliente.nif_cif || ''
    document.getElementById('editTelefonoFisica').value = cliente.telefono || ''
    document.getElementById('editWhatsappFisica').value = cliente.whatsapp_contacto || ''
    document.getElementById('editOficioSelect').value = cliente.oficio || ''
    document.getElementById('editFechaInicioActividad').value = cliente.fecha_inicio_actividad || ''
    document.getElementById('editCalle').value = cliente.calle || ''
    document.getElementById('editNumero').value = cliente.numero || ''
    document.getElementById('editPiso').value = cliente.piso || ''
    document.getElementById('editCodigoPostal').value = cliente.codigo_postal || ''
    document.getElementById('editMunicipio').value = cliente.ciudad || cliente.municipio || ''
    document.getElementById('editProvincia').value = cliente.provincia || ''
    document.getElementById('editIban').value = cliente.iban || ''
    document.getElementById('editBanco').value = cliente.banco || ''
    document.getElementById('editSwift').value = cliente.swift || ''
    document.getElementById('editCnae').value = cliente.cnae || ''
    document.getElementById('editPlan').value = cliente.plan || 'BASICO'
    document.getElementById('editClienteId').value = cliente.id
    document.getElementById('editPerfilId').value = cliente.perfil_id || ''
}

function recogerDatosFormulario() {
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
        id: document.getElementById('editClienteId')?.value,
        perfil_id: document.getElementById('editPerfilId')?.value,
        nombre_empresa: nombreCompleto,
        email: document.getElementById('editEmailFisica')?.value.trim() || '',
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
        fecha_inicio_actividad: document.getElementById('editFechaInicioActividad')?.value || null,
        plan: document.getElementById('editPlan')?.value || 'BASICO',
        tipo_cliente: 'autonomo'
    }
}

async function guardarCambios(datos) {
    try {
        const { id, perfil_id, ...updateData } = datos
        
        // Actualizar empresa
        const { error: empresaError } = await sb
            .from('empresas')
            .update({
                nombre_empresa: updateData.nombre_empresa,
                nif_cif: updateData.nif_cif,
                telefono: updateData.telefono,
                whatsapp_contacto: updateData.whatsapp_contacto,
                oficio: updateData.oficio,
                calle: updateData.calle,
                numero: updateData.numero,
                piso: updateData.piso,
                codigo_postal: updateData.codigo_postal,
                ciudad: updateData.ciudad,
                provincia: updateData.provincia,
                iban: updateData.iban,
                banco: updateData.banco,
                swift: updateData.swift,
                cnae: updateData.cnae,
                fecha_inicio_actividad: updateData.fecha_inicio_actividad,
                plan: updateData.plan,
                tipo_cliente: updateData.tipo_cliente
            })
            .eq('id', id)
        
        if (empresaError) throw empresaError
        
        // Actualizar perfil
        if (perfil_id) {
            const { error: perfilError } = await sb
                .from('perfiles')
                .update({
                    nombre_razon_social: updateData.nombre_empresa,
                    email: updateData.email,
                    telefono: updateData.telefono
                })
                .eq('id', perfil_id)
            
            if (perfilError) throw perfilError
        }
        
        return true
    } catch (error) {
        console.error('Error guardando cambios:', error)
        mostrarModalInformativo('Error', error.message, 'error')
        return false
    }
}

async function recargarListaClientes() {
    try {
        const { cargarClientes } = await import('../clientes.js')
        if (typeof cargarClientes === 'function') {
            await cargarClientes()
        }
    } catch (e) {}
}

async function actualizarStats() {
    try {
        const { cargarStats } = await import('../main.js')
        if (typeof cargarStats === 'function') {
            await cargarStats()
        }
    } catch (e) {}
}

// ============================================================
// RESETEAR CONTRASEÑA
// ============================================================

function abrirModalResetearPassword(email) {
    const modalEditar = document.getElementById('modalEditarCliente')
    if (modalEditar) modalEditar.style.display = 'none'
    
    const modal = document.getElementById('modalResetearPassword')
    const emailInput = document.getElementById('resetEmail')
    const nuevaPassInput = document.getElementById('resetNuevaPassword')
    const confirmarPassInput = document.getElementById('resetConfirmarPassword')
    const errorDiv = document.getElementById('resetPasswordError')
    
    if (!modal) {
        mostrarModalInformativo('Error', 'No se pudo abrir el diálogo de reseteo', 'error')
        return
    }
    
    emailInput.value = email
    nuevaPassInput.value = ''
    confirmarPassInput.value = ''
    errorDiv.style.display = 'none'
    modal.style.display = 'flex'
    
    const btnConfirmar = document.getElementById('btnConfirmarReset')
    if (btnConfirmar) {
        const nuevoBtnConfirmar = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar)
        nuevoBtnConfirmar.onclick = async () => {
            const nuevaPassword = nuevaPassInput?.value.trim() || ''
            const confirmarPassword = confirmarPassInput?.value.trim() || ''
            
            if (!nuevaPassword || nuevaPassword.length < 6) {
                errorDiv.innerText = '❌ La contraseña debe tener al menos 6 caracteres'
                errorDiv.style.display = 'block'
                return
            }
            
            if (nuevaPassword !== confirmarPassword) {
                errorDiv.innerText = '❌ Las contraseñas no coinciden'
                errorDiv.style.display = 'block'
                return
            }
            
            cerrarModal('modalResetearPassword')
            await ejecutarResetearPassword(email, nuevaPassword)
        }
    }
    
    const btnCancelar = document.getElementById('btnCancelarReset')
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalResetearPassword')
    }
}

async function ejecutarResetearPassword(email, nuevaPassword) {
    mostrarModalCarga('Actualizando contraseña...')
    
    try {
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
        
        cerrarModalCarga()
        mostrarModalInformativo('✅ Contraseña actualizada', `La contraseña para ${email} ha sido actualizada correctamente`, 'exito')
        
    } catch (error) {
        cerrarModalCarga()
        mostrarModalInformativo('Error', error.message, 'error')
    }
}

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

export async function abrirModalEditarAutonomo(cliente) {
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    document.getElementById('modalEditarClienteHeader').innerHTML = `✏️ Editar autónomo: ${cliente.nombre_empresa || 'Sin nombre'}`
    cargarDatosEnFormulario(cliente)
    
    const btnGuardar = document.getElementById('btnGuardarEdicion')
    const btnCancelar = document.getElementById('btnCancelarEdicion')
    
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
    
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalEditarCliente')
    }
    
    const btnResetPassword = document.getElementById('btnResetPassword')
    if (btnResetPassword && cliente.perfil_id) {
        const nuevoBtnReset = btnResetPassword.cloneNode(true)
        btnResetPassword.parentNode.replaceChild(nuevoBtnReset, btnResetPassword)
        nuevoBtnReset.onclick = () => {
            const email = cliente.contacto_email || cliente.email
            if (email) abrirModalResetearPassword(email)
        }
    }
    
    abrirModal('modalEditarCliente')
}

export default {
    abrirModalEditarAutonomo
}