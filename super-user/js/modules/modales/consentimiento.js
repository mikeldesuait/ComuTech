// js/modules/modales/consentimiento.js
// ⚖️ MODAL DE CONSENTIMIENTO RGPD

import { abrirModal, cerrarModal } from './modalesGenerales.js'

let onAceptarCallback = null

/**
 * Muestra el modal de consentimiento RGPD
 * @param {Function} onAceptar - Función a ejecutar cuando el usuario acepta (recibe true/false)
 */
export function mostrarModalConsentimiento(onAceptar) {
    onAceptarCallback = onAceptar
    
    const modal = document.getElementById('modalConsentimientoRGPD')
    if (!modal) {
        console.error('❌ Modal de consentimiento no encontrado')
        if (onAceptarCallback) onAceptarCallback(true)
        return
    }
    
    const btnAceptar = document.getElementById('btnAceptarConsentimientoFinal')
    if (btnAceptar) {
        const nuevoBtnAceptar = btnAceptar.cloneNode(true)
        btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar)
        nuevoBtnAceptar.onclick = () => {
            cerrarModal('modalConsentimientoRGPD')
            if (onAceptarCallback) onAceptarCallback(true)
        }
    }
    
    const btnRechazar = document.getElementById('btnRechazarConsentimiento')
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

export function cerrarModalConsentimiento() {
    cerrarModal('modalConsentimientoRGPD')
    onAceptarCallback = null
}

export default {
    mostrarModalConsentimiento,
    cerrarModalConsentimiento
}