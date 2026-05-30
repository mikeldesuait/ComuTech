// js/modules/modales/modalesAltaEmpresa.js
// 🧠 LÓGICA DE ALTA DE CLIENTES TIPO EMPRESA

import { sb } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'
import { crearClienteCompleto } from './modalesPassword.js'

// ============================================================
// CONSTANTES
// ============================================================

const TEMPLATE_URL = 'templates/clientes/alta-empresa.html'
const CONTAINER_ID = 'altaClienteContainer'

// ============================================================
// FUNCIONES DE VALIDACIÓN Y ERRORES
// ============================================================

/**
 * Limpia todos los mensajes de error y resaltados del formulario
 */
function limpiarErroresFormulario() {
    // Eliminar mensajes de error
    document.querySelectorAll('.error-message').forEach(el => el.remove())
    
    // Limpiar estilos de campos
    document.querySelectorAll('#modalAltaCliente input, #modalAltaCliente select, #modalAltaCliente textarea').forEach(campo => {
        campo.style.borderColor = ''
        campo.style.backgroundColor = ''
    })
}

/**
 * Muestra errores visualmente en el formulario
 * @param {string[]} errores - Lista de errores
 */
function mostrarErroresEnFormulario(errores) {
    errores.forEach(error => {
        let campoId = null
        
        if (error.includes('Razón Social')) campoId = 'razonSocial'
        if (error.includes('Email')) campoId = 'emailContacto'
        if (error.includes('consentimiento')) campoId = 'consentimientoAceptado'
        
        if (campoId) {
            const campo = document.getElementById(campoId)
            if (campo) {
                // Resaltar campo
                campo.style.borderColor = '#c2410c'
                campo.style.backgroundColor = '#fff5f5'
                
                // Añadir mensaje de error
                const errorDiv = document.createElement('div')
                errorDiv.className = 'error-message'
                errorDiv.style.color = '#c2410c'
                errorDiv.style.fontSize = '0.7rem'
                errorDiv.style.marginTop = '4px'
                errorDiv.style.paddingLeft = '4px'
                errorDiv.innerHTML = `❌ ${error}`
                
                // Insertar después del campo
                campo.parentNode.appendChild(errorDiv)
                
                // Limpiar error al enfocar
                campo.onfocus = () => {
                    campo.style.borderColor = ''
                    campo.style.backgroundColor = ''
                    const err = campo.parentNode.querySelector('.error-message')
                    if (err) err.remove()
                    campo.onfocus = null
                }
            }
        }
    })
}

/**
 * Valida los campos del formulario
 * @returns {Object} - { valido: boolean, errores: string[] }
 */
function validarFormulario() {
    const errores = []
    
    const razonSocial = document.getElementById('razonSocial')?.value.trim()
    if (!razonSocial) errores.push('❌ Razón Social es obligatoria')
    
    const email = document.getElementById('emailContacto')?.value.trim()
    if (!email) errores.push('❌ Email de contacto es obligatorio')
    if (email && !email.includes('@')) errores.push('❌ El email no es válido')
    
    const consentimiento = document.getElementById('consentimientoAceptado')?.checked
    if (!consentimiento) errores.push('❌ Debes aceptar el consentimiento RGPD')
    
    return {
        valido: errores.length === 0,
        errores: errores
    }
}

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

/**
 * Carga el template HTML dentro del contenedor del modal
 */
async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template: ${TEMPLATE_URL}`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        return true
    } catch (error) {
        console.error(error)
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario de alta de empresa', 'error')
        return false
    }
}

/**
 * Configura el checkbox de WhatsApp (copiar teléfono)
 */
function configurarWhatsappCheckbox() {
    const mismoWhatsapp = document.getElementById('mismoWhatsappJuridica')
    const telefonoInput = document.getElementById('telefonoContacto')
    const whatsappInput = document.getElementById('whatsappContacto')
    
    if (mismoWhatsapp && telefonoInput && whatsappInput) {
        mismoWhatsapp.onchange = () => {
            if (mismoWhatsapp.checked) {
                whatsappInput.value = telefonoInput.value
                whatsappInput.disabled = true
            } else {
                whatsappInput.disabled = false
            }
        }
        
        telefonoInput.oninput = () => {
            if (mismoWhatsapp.checked) {
                whatsappInput.value = telefonoInput.value
            }
        }
    }
}

/**
 * Recoge todos los datos del formulario
 * @returns {Object} - Datos para enviar a la Edge Function
 */
function recogerDatosFormulario() {
    const razonSocial = document.getElementById('razonSocial')?.value.trim() || ''
    const email = document.getElementById('emailContacto')?.value.trim() || ''
    const nif = document.getElementById('nifCif')?.value.trim() || ''
    const telefono = document.getElementById('telefonoContacto')?.value.trim() || ''
    const whatsapp = document.getElementById('whatsappContacto')?.value.trim() || ''
    const nombreContacto = document.getElementById('nombreContacto')?.value.trim() || ''
    const formaSocial = document.getElementById('formaSocial')?.value || ''
    
    // Domicilio
    const calle = document.getElementById('direccionCalle')?.value.trim() || ''
    const numero = document.getElementById('direccionNumero')?.value.trim() || ''
    const piso = document.getElementById('direccionPiso')?.value.trim() || ''
    const codigoPostal = document.getElementById('codigoPostal')?.value.trim() || ''
    const municipio = document.getElementById('municipio')?.value.trim() || ''
    const provincia = document.getElementById('provincia')?.value.trim() || ''
    
    // Datos bancarios
    const iban = document.getElementById('ibanCuenta')?.value.trim() || ''
    const banco = document.getElementById('bancoNombre')?.value.trim() || ''
    const swift = document.getElementById('swiftCodigo')?.value.trim() || ''
    
    // Plan y actividad
    const plan = document.getElementById('planSeleccionado')?.value || 'BASICO'
    const cnae = document.getElementById('cnaeCodigo')?.value.trim() || ''
    const fechaInicioActividad = document.getElementById('fechaInicioActividad')?.value || null
    
    // Tipo de cliente
    const tipoCliente = document.getElementById('tipoClienteSelect')?.value || 'administrador'
    
    // Construir nombre de contacto (si no se especificó, usar razón social)
    const contactoFinal = nombreContacto || razonSocial
    
    // Consentimiento
    const consentimiento = document.getElementById('consentimientoAceptado')?.checked || false
    
    return {
        nombre_empresa: razonSocial,
        nif_cif: nif,
        email: email,
        telefono: telefono,
        whatsapp_contacto: whatsapp,
        nombre_contacto: contactoFinal,
        forma_social: formaSocial,
        calle: calle,
        numero: numero,
        piso: piso,
        codigo_postal: codigoPostal,
        ciudad: municipio,
        provincia: provincia,
        iban: iban,
        banco: banco,
        swift: swift,
        cnae: cnae,
        fecha_inicio_actividad: fechaInicioActividad,
        plan: plan,
        tipo_cliente: tipoCliente,
        oficio: null,
        consentimiento: consentimiento
    }
}

// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

/**
 * Abre el modal de alta de empresa
 */
export async function abrirModalAltaEmpresa() {
    // Cargar template
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    // Cambiar título del modal
    const header = document.getElementById('modalAltaClienteHeader')
    if (header) header.innerHTML = '🏢 Dar de alta Empresa'
    
    // Configurar checkbox de WhatsApp
    configurarWhatsappCheckbox()
    
    // Configurar botones
    const btnGuardar = document.getElementById('btnGuardarCliente')
    const btnCancelar = document.getElementById('btnCancelarAlta')
    
    if (btnGuardar) {
        const nuevoBtnGuardar = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtnGuardar, btnGuardar)
        nuevoBtnGuardar.onclick = crearEmpresa
    }
    
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalAltaCliente')
    }
    
    // Abrir modal
    abrirModal('modalAltaCliente')
}

/**
 * Crea una nueva empresa usando la Edge Function
 */
export async function crearEmpresa() {
    // Limpiar errores anteriores
    limpiarErroresFormulario()
    
    // Validar formulario
    const validacion = validarFormulario()
    if (!validacion.valido) {
        // Mostrar errores visualmente en el formulario
        mostrarErroresEnFormulario(validacion.errores)
        // Mostrar modal resumen
        mostrarModalInformativo('❌ Datos incompletos', validacion.errores.join('<br>'), 'error')
        return
    }
    
    // Recoger datos
    const datos = recogerDatosFormulario()
    
    // Llamar a la función central de creación
    await crearClienteCompleto(datos)
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    abrirModalAltaEmpresa,
    crearEmpresa
}