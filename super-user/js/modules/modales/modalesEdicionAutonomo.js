// js/modules/modales/modalesEdicionAutonomo.js
// 👤 LÓGICA DE EDICIÓN DE AUTÓNOMOS

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

const TEMPLATE_URL = 'templates/clientes/editar-autonomo.html'
const CONTAINER_ID = 'editarClienteContainer'

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

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
    console.log('🟢 Cargando datos del autónomo:', cliente)
    
    const nombreCompleto = cliente.nombre_empresa || ''
    const partes = nombreCompleto.split(' ')
    const nombre = partes[0] || ''
    const apellido1 = partes[1] || ''
    const apellido2 = partes.slice(2).join(' ') || ''
    
    // Asignar valores a los campos
    const nombreInput = document.getElementById('editNombreFisica')
    if (nombreInput) nombreInput.value = nombre
    
    const apellido1Input = document.getElementById('editPrimerApellido')
    if (apellido1Input) apellido1Input.value = apellido1
    
    const apellido2Input = document.getElementById('editSegundoApellido')
    if (apellido2Input) apellido2Input.value = apellido2
    
    const emailInput = document.getElementById('editEmailFisica')
    if (emailInput) emailInput.value = cliente.contacto_email || cliente.email || ''
    
    const nifInput = document.getElementById('editNifFisica')
    if (nifInput) nifInput.value = cliente.nif_cif || ''
    
    const telefonoInput = document.getElementById('editTelefonoFisica')
    if (telefonoInput) telefonoInput.value = cliente.telefono || ''
    
    const whatsappInput = document.getElementById('editWhatsappFisica')
    if (whatsappInput) whatsappInput.value = cliente.whatsapp_contacto || ''
    
    const oficioSelect = document.getElementById('editOficioSelect')
    if (oficioSelect) oficioSelect.value = cliente.oficio || ''
    
    const fechaInicioInput = document.getElementById('editFechaInicioActividad')
    if (fechaInicioInput) fechaInicioInput.value = cliente.fecha_inicio_actividad || ''
    
    const calleInput = document.getElementById('editCalle')
    if (calleInput) calleInput.value = cliente.calle || ''
    
    const numeroInput = document.getElementById('editNumero')
    if (numeroInput) numeroInput.value = cliente.numero || ''
    
    const pisoInput = document.getElementById('editPiso')
    if (pisoInput) pisoInput.value = cliente.piso || ''
    
    const cpInput = document.getElementById('editCodigoPostal')
    if (cpInput) cpInput.value = cliente.codigo_postal || ''
    
    const municipioInput = document.getElementById('editMunicipio')
    if (municipioInput) municipioInput.value = cliente.ciudad || cliente.municipio || ''
    
    const provinciaInput = document.getElementById('editProvincia')
    if (provinciaInput) provinciaInput.value = cliente.provincia || ''
    
    const ibanInput = document.getElementById('editIban')
    if (ibanInput) ibanInput.value = cliente.iban || ''
    
    const bancoInput = document.getElementById('editBanco')
    if (bancoInput) bancoInput.value = cliente.banco || ''
    
    const swiftInput = document.getElementById('editSwift')
    if (swiftInput) swiftInput.value = cliente.swift || ''
    
    const cnaeInput = document.getElementById('editCnae')
    if (cnaeInput) cnaeInput.value = cliente.cnae || ''
    
    const planSelect = document.getElementById('editPlan')
    if (planSelect) planSelect.value = cliente.plan || 'BASICO'
    
    // ============================================================
    // 🔴 IMPORTANTE: Asignar el ID del cliente al campo oculto
    // ============================================================
    const clienteIdInput = document.getElementById('editClienteId')
    if (clienteIdInput) {
        clienteIdInput.value = cliente.id
        console.log('✅ ID del cliente asignado:', cliente.id)
    } else {
        console.error('❌ No se encontró el campo editClienteId')
    }
    
    const perfilIdInput = document.getElementById('editPerfilId')
    if (perfilIdInput && cliente.perfil_id) {
        perfilIdInput.value = cliente.perfil_id
        console.log('✅ ID del perfil asignado:', cliente.perfil_id)
    }
    
    // Mostrar campo "otro" si es necesario
    if (cliente.oficio === 'otro') {
        const otroDiv = document.getElementById('editOtroOficioDiv')
        const otroInput = document.getElementById('editOtroOficioTexto')
        if (otroDiv) otroDiv.style.display = 'block'
        if (otroInput) otroInput.value = cliente.oficio_otro || ''
    }
}

function recogerDatosFormulario() {
    console.log('🟡 Recogiendo datos del formulario...')
    
    const id = document.getElementById('editClienteId')?.value
    console.log('ID leído:', id)
    
    if (!id) {
        console.error('❌ No se encontró el ID del cliente')
        mostrarModalInformativo('Error', 'No se pudo identificar el cliente', 'error')
        return null
    }
    
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
    
    const datos = {
        id: id,
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
    
    console.log('📋 Datos recogidos:', datos)
    return datos
}

async function guardarCambios(datos) {
    if (!datos) return false
    
    console.log('🟠 Guardando cambios en Supabase...')
    
    try {
        const { id, perfil_id, ...updateData } = datos
        
        // 1. Actualizar empresa
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
        
        if (empresaError) {
            console.error('❌ Error actualizando empresa:', empresaError)
            throw empresaError
        }
        
        console.log('✅ Empresa actualizada correctamente')
        
        // 2. Actualizar perfil del gerente
        if (perfil_id) {
            const { error: perfilError } = await sb
                .from('perfiles')
                .update({
                    nombre_razon_social: updateData.nombre_empresa,
                    email: updateData.email,
                    telefono: updateData.telefono
                })
                .eq('id', perfil_id)
            
            if (perfilError) {
                console.error('❌ Error actualizando perfil:', perfilError)
                throw perfilError
            }
            
            console.log('✅ Perfil actualizado correctamente')
        }
        
        return true
    } catch (error) {
        console.error('❌ Error en guardarCambios:', error)
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
    } catch (e) {
        console.log('Función cargarClientes no disponible')
    }
}

async function actualizarStats() {
    try {
        const { cargarStats } = await import('../main.js')
        if (typeof cargarStats === 'function') {
            await cargarStats()
        }
    } catch (e) {
        console.log('Función cargarStats no disponible')
    }
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
            const nuevaPassword = nuevaPassInput?.value.trim() || ''
            const confirmarPassword = confirmarPassInput?.value.trim() || ''
            
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
// FUNCIÓN PÚBLICA PRINCIPAL
// ============================================================

export async function abrirModalEditarAutonomo(cliente) {
    console.log('🔵 abrirModalEditarAutonomo llamado:', cliente)
    
    if (!cliente || !cliente.id) {
        console.error('❌ Cliente sin ID:', cliente)
        mostrarModalInformativo('Error', 'No se pudo identificar el cliente', 'error')
        return
    }
    
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    const header = document.getElementById('modalEditarClienteHeader')
    if (header) header.innerHTML = `✏️ Editar autónomo: ${cliente.nombre_empresa || 'Sin nombre'}`
    
    cargarDatosEnFormulario(cliente)
    
    const btnGuardar = document.getElementById('btnGuardarEdicion')
    const btnCancelar = document.getElementById('btnCancelarEdicion')
    
    if (btnGuardar) {
        const nuevoBtnGuardar = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtnGuardar, btnGuardar)
        nuevoBtnGuardar.onclick = async () => {
            console.log('🔵 Botón Guardar clickeado')
            mostrarModalCarga('Guardando cambios...')
            const datos = recogerDatosFormulario()
            if (!datos) {
                cerrarModalCarga()
                return
            }
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

// ============================================================
// EXPORTAR
// ============================================================

export default {
    abrirModalEditarAutonomo
}