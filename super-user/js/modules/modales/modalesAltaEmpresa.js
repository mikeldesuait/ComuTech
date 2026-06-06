// js/modules/modales/modalesAltaEmpresa.js
// 🏢 LÓGICA DE ALTA DE CLIENTES TIPO EMPRESA

import { mostrarModalInformativo, abrirModal, cerrarModal } from './modalesGenerales.js'
import { crearClienteCompleto } from './modalesPassword.js'
import { mostrarModalConsentimiento } from './consentimiento.js'
import { mostrarModalContrato } from './contrato.js'

const TEMPLATE_URL = 'templates/clientes/alta-empresa.html'
const CONTAINER_ID = 'altaClienteContainer'

// ============================================================
// FUNCIONES DE VALIDACIÓN Y ERRORES
// ============================================================

function limpiarErroresFormulario() {
    document.querySelectorAll('.error-message').forEach(el => el.remove())
    document.querySelectorAll('#modalAltaCliente input, #modalAltaCliente select, #modalAltaCliente textarea').forEach(campo => {
        campo.style.borderColor = ''
        campo.style.backgroundColor = ''
    })
}

function mostrarErroresEnFormulario(errores) {
    errores.forEach(error => {
        let campoId = null
        if (error.includes('Razón Social')) campoId = 'razonSocial'
        if (error.includes('Email')) campoId = 'emailContacto'
        
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

function validarFormulario() {
    const errores = []
    
    const razonSocial = document.getElementById('razonSocial')?.value.trim()
    if (!razonSocial) errores.push('❌ Razón Social es obligatoria')
    
    const email = document.getElementById('emailContacto')?.value.trim()
    if (!email) errores.push('❌ Email de contacto es obligatorio')
    if (email && !email.includes('@')) errores.push('❌ El email no es válido')
    
    return {
        valido: errores.length === 0,
        errores: errores
    }
}

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
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario de alta de empresa', 'error')
        return false
    }
}

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

// js/modules/modales/modalesAltaEmpresa.js

function recogerDatosFormulario() {
    const razonSocial = document.getElementById('razonSocial')?.value.trim() || ''
    const email = document.getElementById('emailContacto')?.value.trim() || ''
    const nif = document.getElementById('nifCif')?.value.trim() || ''
    const telefono = document.getElementById('telefonoContacto')?.value.trim() || ''
    const whatsapp = document.getElementById('whatsappContacto')?.value.trim() || ''
    const nombreContacto = document.getElementById('nombreContacto')?.value.trim() || ''
    const formaSocial = document.getElementById('formaSocial')?.value || ''
    
    const calle = document.getElementById('direccionCalle')?.value.trim() || ''
    const numero = document.getElementById('direccionNumero')?.value.trim() || ''
    const piso = document.getElementById('direccionPiso')?.value.trim() || ''
    const codigoPostal = document.getElementById('codigoPostal')?.value.trim() || ''
    const municipio = document.getElementById('municipio')?.value.trim() || ''
    const provincia = document.getElementById('provincia')?.value.trim() || ''
    
    const iban = document.getElementById('ibanCuenta')?.value.trim() || ''
    const banco = document.getElementById('bancoNombre')?.value.trim() || ''
    const swift = document.getElementById('swiftCodigo')?.value.trim() || ''
    
    const plan = document.getElementById('planSeleccionado')?.value || 'BASICO'
    const cnae = document.getElementById('cnaeCodigo')?.value.trim() || ''
    const fechaInicioActividad = document.getElementById('fechaInicioActividad')?.value || null
    const tipoCliente = document.getElementById('tipoClienteSelect')?.value || 'administrador'
    
    const contactoFinal = nombreContacto || razonSocial
    
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
        consentimiento: true  // Se activará cuando acepte el modal
    }
}


// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

export async function abrirModalAltaEmpresa() {
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    const header = document.getElementById('modalAltaClienteHeader')
    if (header) header.innerHTML = '🏢 Dar de alta Empresa'
    
    configurarWhatsappCheckbox()
    
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
    
    abrirModal('modalAltaCliente')
}

export async function crearEmpresa() {
    limpiarErroresFormulario()
    
    const validacion = validarFormulario()
    if (!validacion.valido) {
        mostrarErroresEnFormulario(validacion.errores)
        mostrarModalInformativo('❌ Datos incompletos', validacion.errores.join('<br>'), 'error')
        return
    }
    
    const datos = recogerDatosFormulario()
    
    // Cerrar el modal de alta antes de mostrar los modales de aceptación
    cerrarModal('modalAltaCliente')
    
    // Mostrar consentimiento RGPD
    mostrarModalConsentimiento(async (aceptado) => {
        if (!aceptado) {
            mostrarModalInformativo('Consentimiento requerido', 'Debes aceptar el RGPD para continuar', 'error')
            return
        }
        
        // Mostrar contrato de servicios
        mostrarModalContrato(datos, async (aceptadoContrato) => {
            if (!aceptadoContrato) {
                mostrarModalInformativo('Contrato requerido', 'Debes aceptar el contrato de servicios para continuar', 'error')
                return
            }
            
            datos.consentimiento = true
            await crearClienteCompleto(datos)
        })
    })
}

export default {
    abrirModalAltaEmpresa,
    crearEmpresa
}