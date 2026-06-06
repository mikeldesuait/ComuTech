// js/modules/modales/consentimiento.js
import { abrirModal, cerrarModal } from './modalesGenerales.js'

const TEXTO_RGPD = `
POLÍTICA DE PROTECCIÓN DE DATOS (RGPD)

De acuerdo con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos (RGPD), y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), se le informa:

1. RESPONSABLE DEL TRATAMIENTO
   - Identidad: COMUTECH S.L.
   - NIF: B12345678
   - Dirección: [TU DIRECCIÓN]
   - Email: dpd@comutech.es

2. FINALIDAD DEL TRATAMIENTO
   Sus datos serán tratados para:
   - Gestión de la relación contractual
   - Emisión de facturas y gestión contable
   - Comunicaciones relacionadas con el servicio
   - Cumplimiento de obligaciones legales

3. LEGITIMACIÓN
   La base legal para el tratamiento de sus datos es:
   - Ejecución de un contrato
   - Cumplimiento de obligaciones legales
   - Consentimiento explícito

4. DESTINATARIOS
   Sus datos podrán ser comunicados a:
   - Agencia Tributaria (obligación legal)
   - Entidades bancarias (gestión de cobros)
   - Proveedores de servicios tecnológicos

5. DERECHOS
   Usted tiene derecho a:
   - Acceder a sus datos
   - Rectificarlos
   - Suprimirlos (derecho al olvido)
   - Limitar su tratamiento
   - Oponerse al tratamiento
   - Portabilidad de los datos

6. PLAZO DE CONSERVACIÓN
   Los datos se conservarán mientras dure la relación contractual y, una vez finalizada, durante los plazos legales establecidos.

Fecha de esta versión: 1 de junio de 2026
Versión: 2.0
`

let onAceptarCallback = null

export function mostrarModalConsentimiento(onAceptar) {
    onAceptarCallback = onAceptar
    
    const modal = document.getElementById('modalConsentimientoRGPD')
    if (!modal) {
        if (onAceptarCallback) onAceptarCallback(true)
        return
    }
    
    const textoContainer = modal.querySelector('.consentimiento-texto')
    if (textoContainer) {
        textoContainer.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 12px; margin: 0;">${TEXTO_RGPD}</pre>`
    }
    
    const btnAceptar = document.getElementById('btnAceptarConsentimientoFinal')
    const btnRechazar = document.getElementById('btnRechazarConsentimiento')
    const check = document.getElementById('consentimientoCheckFinal')
    
    if (btnAceptar) {
        const nuevoBtnAceptar = btnAceptar.cloneNode(true)
        btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar)
        nuevoBtnAceptar.onclick = () => {
            if (!check || !check.checked) {
                alert('Debes marcar la casilla de aceptación para continuar')
                return
            }
            cerrarModal('modalConsentimientoRGPD')
            if (onAceptarCallback) onAceptarCallback(true)
        }
    }
    
    if (btnRechazar) {
        const nuevoBtnRechazar = btnRechazar.cloneNode(true)
        btnRechazar.parentNode.replaceChild(nuevoBtnRechazar, btnRechazar)
        nuevoBtnRechazar.onclick = () => {
            cerrarModal('modalConsentimientoRGPD')
            if (onAceptarCallback) onAceptarCallback(false)
        }
    }
    
    abrirModal('modalConsentimientoRGPD')
}

export default {
    mostrarModalConsentimiento
}