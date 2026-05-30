// js/modules/modales/modalesAltaAutonomo.js
// 🧠 LÓGICA DE ALTA DE CLIENTES TIPO AUTÓNOMO

import { sb } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal } from './modalesGenerales.js'
import { crearClienteCompleto } from './modalesPassword.js'

// ============================================================
// CONSTANTES
// ============================================================

const TEMPLATE_URL = 'templates/clientes/alta-autonomo.html'
const CONTAINER_ID = 'altaClienteContainer'

// ============================================================
// FUNCIONES DE VALIDACIÓN Y ERRORES
// ============================================================

/**
 * Limpia los mensajes de error del formulario
 */
function limpiarErroresFormulario() {
    document.querySelectorAll('.error-message').forEach(el => el.remove())
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
        if (error.includes('Nombre')) campoId = 'nombreFisica'
        if (error.includes('Email')) campoId = 'emailFisica'
        if (error.includes('oficio')) campoId = 'oficioSelect'
        if (error.includes('plan')) campoId = 'planSeleccionado'
        
        if (campoId) {
            const campo = document.getElementById(campoId)
            if (campo) {
                campo.style.borderColor = '#c2410c'
                campo.style.backgroundColor = '#fff5f5'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'error-message'
                errorDiv.style.color = '#c2410c'
                errorDiv.style.fontSize = '0.7rem'
                errorDiv.style.marginTop = '4px'
                errorDiv.style.paddingLeft = '4px'
                errorDiv.innerHTML = `❌ ${error}`
                campo.parentNode.appendChild(errorDiv)
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
    
    const nombre = document.getElementById('nombreFisica')?.value.trim()
    if (!nombre) errores.push('❌ Nombre es obligatorio')
    
    const email = document.getElementById('emailFisica')?.value.trim()
    if (!email) errores.push('❌ Email es obligatorio')
    if (email && !email.includes('@')) errores.push('❌ El email no es válido')
    
    const oficio = document.getElementById('oficioSelect')?.value
    if (!oficio) errores.push('❌ Debes seleccionar un oficio')
    if (oficio === 'otro') {
        const otroTexto = document.getElementById('otroOficioTexto')?.value.trim()
        if (!otroTexto) errores.push('❌ Debes especificar tu oficio')
    }
    
    const plan = document.getElementById('planSeleccionado')?.value
    if (!plan) errores.push('❌ Debes seleccionar un plan')
    
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
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario de alta de autónomo', 'error')
        return false
    }
}

/**
 * Configura el selector de oficio (mostrar campo "otro")
 */
function configurarSelectorOficio() {
    const oficioSelect = document.getElementById('oficioSelect')
    const otroDiv = document.getElementById('otroOficioDiv')
    
    if (oficioSelect && otroDiv) {
        const nuevoSelect = oficioSelect.cloneNode(true)
        oficioSelect.parentNode.replaceChild(nuevoSelect, oficioSelect)
        nuevoSelect.addEventListener('change', () => {
            otroDiv.style.display = nuevoSelect.value === 'otro' ? 'block' : 'none'
        })
    }
}

/**
 * Configura el checkbox de WhatsApp (copiar teléfono)
 */
function configurarWhatsappCheckbox() {
    const mismoWhatsapp = document.getElementById('mismoWhatsappFisica')
    const telefonoInput = document.getElementById('telefonoFisica')
    const whatsappInput = document.getElementById('whatsappContactoFisica')
    
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
    const nombre = document.getElementById('nombreFisica')?.value.trim() || ''
    const apellido1 = document.getElementById('primerApellido')?.value.trim() || ''
    const apellido2 = document.getElementById('segundoApellido')?.value.trim() || ''
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim()
    
    const email = document.getElementById('emailFisica')?.value.trim() || ''
    const nif = document.getElementById('nifFisica')?.value.trim() || ''
    const telefono = document.getElementById('telefonoFisica')?.value.trim() || ''
    
    let whatsapp = document.getElementById('whatsappContactoFisica')?.value.trim() || ''
    const mismoWhatsapp = document.getElementById('mismoWhatsappFisica')?.checked
    if (mismoWhatsapp && telefono) {
        whatsapp = telefono
    }
    
    let oficio = document.getElementById('oficioSelect')?.value || ''
    if (oficio === 'otro') {
        oficio = document.getElementById('otroOficioTexto')?.value.trim() || 'otro'
    }
    
    const calle = document.getElementById('direccionCalle')?.value.trim() || ''
    const numero = document.getElementById('direccionNumero')?.value.trim() || ''
    const piso = document.getElementById('direccionPiso')?.value.trim() || ''
    const direccionCompleta = [calle, numero, piso].filter(p => p).join(', ')
    const codigoPostal = document.getElementById('codigoPostal')?.value.trim() || ''
    const municipio = document.getElementById('municipio')?.value.trim() || ''
    const provincia = document.getElementById('provincia')?.value.trim() || ''
    
    const iban = document.getElementById('ibanCuenta')?.value.trim() || ''
    const banco = document.getElementById('bancoNombre')?.value.trim() || ''
    const swift = document.getElementById('swiftCodigo')?.value.trim() || ''
    
    const plan = document.getElementById('planSeleccionado')?.value || 'BASICO'
    const cnae = document.getElementById('cnaeCodigo')?.value.trim() || ''
    const fechaInicioActividad = document.getElementById('fechaInicioActividad')?.value || null
    
    const consentimiento = true
    
    return {
        nombre_empresa: nombreCompleto,
        nif_cif: nif,
        email: email,
        telefono: telefono,
        whatsapp_contacto: whatsapp,
        nombre_contacto: nombreCompleto,
        oficio: oficio,
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
        tipo_cliente: 'autonomo',
        consentimiento: consentimiento
    }
}

// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

/**
 * Abre el modal de alta de autónomo
 */
export async function abrirModalAltaAutonomo() {
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    const header = document.getElementById('modalAltaClienteHeader')
    if (header) header.innerHTML = '👤 Dar de alta Autónomo'
    
    configurarSelectorOficio()
    configurarWhatsappCheckbox()
    
    const btnGuardar = document.getElementById('btnGuardarAutonomo')
    const btnCancelar = document.getElementById('btnCancelarAlta')
    
    if (btnGuardar) {
        const nuevoBtnGuardar = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtnGuardar, btnGuardar)
        nuevoBtnGuardar.onclick = crearAutonomo
    }
    
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalAltaCliente')
    }
    
    abrirModal('modalAltaCliente')
}

/**
 * Crea un nuevo autónomo usando la Edge Function
 */
export async function crearAutonomo() {
    limpiarErroresFormulario()
    
    const validacion = validarFormulario()
    if (!validacion.valido) {
        mostrarErroresEnFormulario(validacion.errores)
        mostrarModalInformativo('❌ Datos incompletos', validacion.errores.join('<br>'), 'error')
        return
    }
    
    const datos = recogerDatosFormulario()
    await crearClienteCompleto(datos)
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    abrirModalAltaAutonomo,
    crearAutonomo
}