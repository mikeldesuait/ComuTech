// js/modules/modales/contrato.js
// 📄 MODAL DE CONTRATO DE SERVICIOS

import { abrirModal, cerrarModal } from './modalesGenerales.js'

let onAceptarCallback = null

/**
 * Muestra el modal del contrato de servicios
 * @param {Object} datosCliente - Datos del cliente para personalizar el contrato
 * @param {Function} onAceptar - Función a ejecutar cuando el usuario acepta
 */
export function mostrarModalContrato(datosCliente, onAceptar) {
    onAceptarCallback = onAceptar
    
    const modal = document.getElementById('modalContratoServicios')
    if (!modal) {
        console.error('❌ Modal de contrato no encontrado')
        if (onAceptarCallback) onAceptarCallback(true)
        return
    }
    
    // Personalizar el contrato con los datos del cliente
    const fecha = new Date().toLocaleDateString('es-ES')
    const fechaSpan = document.getElementById('fechaContrato')
    if (fechaSpan) fechaSpan.textContent = fecha
    
    const nombreSpan = document.getElementById('clienteNombreContrato')
    if (nombreSpan) nombreSpan.textContent = datosCliente.nombre_empresa || datosCliente.nombre_contacto || 'EL CLIENTE'
    
    const nifSpan = document.getElementById('clienteNifContrato')
    if (nifSpan) nifSpan.textContent = datosCliente.nif_cif || '___'
    
    const direccionSpan = document.getElementById('clienteDireccionContrato')
    if (direccionSpan) {
        const direccion = [datosCliente.calle, datosCliente.numero, datosCliente.piso, datosCliente.ciudad, datosCliente.provincia].filter(p => p).join(', ') || '___'
        direccionSpan.textContent = direccion
    }
    
    const btnAceptar = document.getElementById('btnAceptarContrato')
    const btnRechazar = document.getElementById('btnRechazarContrato')
    
    if (btnAceptar) {
        const nuevoBtnAceptar = btnAceptar.cloneNode(true)
        btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar)
        nuevoBtnAceptar.onclick = () => {
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

export function cerrarModalContrato() {
    cerrarModal('modalContratoServicios')
    onAceptarCallback = null
}

export default {
    mostrarModalContrato,
    cerrarModalContrato
}