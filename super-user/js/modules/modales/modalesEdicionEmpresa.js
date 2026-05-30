// js/modules/modales/modalesEdicionEmpresa.js
// 🏢 LÓGICA DE EDICIÓN DE EMPRESAS

import { sb, SUPABASE_URL } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'

const TEMPLATE_URL = 'templates/clientes/editar-empresa.html'
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
    // Datos de la empresa
    const razonSocialInput = document.getElementById('editRazonSocial')
    if (razonSocialInput) razonSocialInput.value = cliente.nombre_empresa || ''
    
    const emailInput = document.getElementById('editEmail')
    if (emailInput) emailInput.value = cliente.contacto_email || cliente.email || ''
    
    const nifInput = document.getElementById('editNif')
    if (nifInput) nifInput.value = cliente.nif_cif || ''
    
    const telefonoInput = document.getElementById('editTelefono')
    if (telefonoInput) telefonoInput.value = cliente.telefono || ''
    
    const whatsappInput = document.getElementById('editWhatsapp')
    if (whatsappInput) whatsappInput.value = cliente.whatsapp_contacto || ''
    
    const nombreContactoInput = document.getElementById('editNombreContacto')
    if (nombreContactoInput) nombreContactoInput.value = cliente.contacto_nombre || ''
    
    const formaSocialSelect = document.getElementById('editFormaSocial')
    if (formaSocialSelect) formaSocialSelect.value = cliente.forma_social || ''
    
    const fechaConstitucionInput = document.getElementById('editFechaConstitucion')
    if (fechaConstitucionInput) fechaConstitucionInput.value = cliente.fecha_constitucion || ''
    
    const registroMercantilInput = document.getElementById('editRegistroMercantil')
    if (registroMercantilInput) registroMercantilInput.value = cliente.registro_mercantil || ''
    
    const representanteInput = document.getElementById('editRepresentante')
    if (representanteInput) representanteInput.value = cliente.representante_nombre || ''
    
    // Domicilio
    const calleInput = document.getElementById('editCalle')
    if (calleInput) calleInput.value = cliente.calle || ''
    
    const numeroInput = document.getElementById('editNumero')
    if (numeroInput) numeroInput.value = cliente.numero || ''
    
    const pisoInput = document.getElementById('editPiso')
    if (pisoInput) pisoInput.value = cliente.piso || ''
    
    const cpInput = document.getElementById('editCp')
    if (cpInput) cpInput.value = cliente.codigo_postal || ''
    
    const ciudadInput = document.getElementById('editCiudad')
    if (ciudadInput) ciudadInput.value = cliente.ciudad || cliente.municipio || ''
    
    const provinciaInput = document.getElementById('editProvincia')
    if (provinciaInput) provinciaInput.value = cliente.provincia || ''
    
    // Datos bancarios
    const ibanInput = document.getElementById('editIban')
    if (ibanInput) ibanInput.value = cliente.iban || ''
    
    const bancoInput = document.getElementById('editBanco')
    if (bancoInput) bancoInput.value = cliente.banco || ''
    
    const swiftInput = document.getElementById('editSwift')
    if (swiftInput) swiftInput.value = cliente.swift || ''
    
    // Plan y actividad
    const planSelect = document.getElementById('editPlan')
    if (planSelect) planSelect.value = cliente.plan || 'BASICO'
    
    const cnaeInput = document.getElementById('editCnae')
    if (cnaeInput) cnaeInput.value = cliente.cnae || ''
    
    const fechaInicioInput = document.getElementById('editFechaInicioActividad')
    if (fechaInicioInput) fechaInicioInput.value = cliente.fecha_inicio_actividad || ''
    
    // IDs ocultos
    const clienteIdInput = document.getElementById('editClienteId')
    if (clienteIdInput) clienteIdInput.value = cliente.id
    
    const perfilIdInput = document.getElementById('editPerfilId')
    if (perfilIdInput && cliente.perfil_id) perfilIdInput.value = cliente.perfil_id
}

function recogerDatosFormulario() {
    return {
        id: document.getElementById('editClienteId')?.value,
        perfil_id: document.getElementById('editPerfilId')?.value,
        nombre_empresa: document.getElementById('editRazonSocial')?.value.trim() || '',
        email: document.getElementById('editEmail')?.value.trim() || '',
        nif_cif: document.getElementById('editNif')?.value.trim() || '',
        telefono: document.getElementById('editTelefono')?.value.trim() || '',
        whatsapp_contacto: document.getElementById('editWhatsapp')?.value.trim() || '',
        contacto_nombre: document.getElementById('editNombreContacto')?.value.trim() || '',
        forma_social: document.getElementById('editFormaSocial')?.value || '',
        fecha_constitucion: document.getElementById('editFechaConstitucion')?.value || null,
        registro_mercantil: document.getElementById('editRegistroMercantil')?.value.trim() || '',
        representante_nombre: document.getElementById('editRepresentante')?.value.trim() || '',
        calle: document.getElementById('editCalle')?.value.trim() || '',
        numero: document.getElementById('editNumero')?.value.trim() || '',
        piso: document.getElementById('editPiso')?.value.trim() || '',
        codigo_postal: document.getElementById('editCp')?.value.trim() || '',
        ciudad: document.getElementById('editCiudad')?.value.trim() || '',
        provincia: document.getElementById('editProvincia')?.value.trim() || '',
        iban: document.getElementById('editIban')?.value.trim() || '',
        banco: document.getElementById('editBanco')?.value.trim() || '',
        swift: document.getElementById('editSwift')?.value.trim() || '',
        cnae: document.getElementById('editCnae')?.value.trim() || '',
        fecha_inicio_actividad: document.getElementById('editFechaInicioActividad')?.value || null,
        plan: document.getElementById('editPlan')?.value || 'BASICO',
        tipo_cliente: 'empresa'
    }
}

async function guardarCambios(datos) {
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
                forma_social: updateData.forma_social,
                fecha_constitucion: updateData.fecha_constitucion,
                registro_mercantil: updateData.registro_mercantil,
                representante_nombre: updateData.representante_nombre,
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
        
        // 2. Actualizar perfil del gerente
        if (perfil_id) {
            const { error: perfilError } = await sb
                .from('perfiles')
                .update({
                    nombre_razon_social: updateData.contacto_nombre || updateData.nombre_empresa,
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
        
        if (!accessToken) {
            throw new Error('No se pudo obtener el token de sesión')
        }
        
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

export async function abrirModalEditarEmpresa(cliente) {
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    const header = document.getElementById('modalEditarClienteHeader')
    if (header) header.innerHTML = `✏️ Editar empresa: ${cliente.nombre_empresa || 'Sin nombre'}`
    
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
                mostrarModalInformativo('✅ Empresa actualizada', 'Los cambios se han guardado correctamente', 'exito')
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
    abrirModalEditarEmpresa
}