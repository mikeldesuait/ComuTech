// js/modules/modales/contrato.js
import { abrirModal, cerrarModal } from './modalesGenerales.js'

function generarTextoContrato(datosCliente) {
    const fecha = new Date().toLocaleDateString('es-ES')
    const nombreCliente = datosCliente?.nombre_empresa || 'EL CLIENTE'
    const nifCliente = datosCliente?.nif_cif || '___'
    const direccionCliente = datosCliente?.direccion || '___'
    const plan = datosCliente?.plan || 'BASICO'
    const importe = plan === 'PRO' ? '99' : (plan === 'EMPRESA' ? '199' : '49')
    
    return `
CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

En [CIUDAD], a ${fecha}.

REUNIDOS

De una parte, COMUTECH S.L., con NIF B12345678, y domicilio a efectos de notificaciones en [DIRECCIÓN COMUTECH] (en adelante, "EL PRESTADOR").

De otra parte, ${nombreCliente}, con NIF ${nifCliente}, y domicilio en ${direccionCliente} (en adelante, "EL CLIENTE").

EXPONEN

Que EL CLIENTE desea contratar los servicios de facturación y gestión ofrecidos por EL PRESTADOR.

CLAUSULAS

PRIMERA. - OBJETO
EL PRESTADOR prestará al CLIENTE servicios de facturación, gestión contable y emisión de facturas Verifactu según el plan contratado.

SEGUNDA. - DURACIÓN
El contrato tendrá una duración inicial de DOCE (12) MESES, renovable automáticamente.

TERCERA. - PRECIO
El precio será de ${importe}€/mes (plan ${plan}), pagadero por domiciliación bancaria.

CUARTA. - PROTECCIÓN DE DATOS
Ambas partes cumplirán con el RGPD. EL PRESTADOR tratará los datos conforme a su política de privacidad.

QUINTA. - RESOLUCIÓN
Cualquiera de las partes puede resolver el contrato con 30 días de antelación.

SEXTA. - LEGISLACIÓN
Rige la legislación española.

En prueba de conformidad, ambas partes firman digitalmente.

_________________________
COMUTECH S.L.

_________________________
${nombreCliente}
Fecha: ${fecha}
`
}

let onAceptarCallback = null
let datosClienteActual = null

export function mostrarModalContrato(datosCliente, onAceptar) {
    onAceptarCallback = onAceptar
    datosClienteActual = datosCliente
    
    const modal = document.getElementById('modalContratoServicios')
    if (!modal) {
        if (onAceptarCallback) onAceptarCallback(true)
        return
    }
    
    const texto = generarTextoContrato(datosCliente)
    const textoContainer = modal.querySelector('.contrato-texto')
    if (textoContainer) {
        textoContainer.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 12px; margin: 0;">${texto}</pre>`
    }
    
    const btnAceptar = document.getElementById('btnAceptarContrato')
    const btnRechazar = document.getElementById('btnRechazarContrato')
    const check = document.getElementById('contratoCheckFinal')
    
    if (btnAceptar) {
        const nuevoBtnAceptar = btnAceptar.cloneNode(true)
        btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar)
        nuevoBtnAceptar.onclick = () => {
            if (!check || !check.checked) {
                alert('Debes marcar la casilla de aceptación para continuar')
                return
            }
            cerrarModal('modalContratoServicios')
            if (onAceptarCallback) onAceptarCallback(true)
        }
    }
    
    if (btnRechazar) {
        const nuevoBtnRechazar = btnRechazar.cloneNode(true)
        btnRechazar.parentNode.replaceChild(nuevoBtnRechazar, btnRechazar)
        nuevoBtnRechazar.onclick = () => {
            cerrarModal('modalContratoServicios')
            if (onAceptarCallback) onAceptarCallback(false)
        }
    }
    
    abrirModal('modalContratoServicios')
}

export default {
    mostrarModalContrato
}