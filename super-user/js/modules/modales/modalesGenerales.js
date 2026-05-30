// js/modules/modales/modalesGenerales.js
// 🧠 FUNCIONES GENERALES PARA CONTROL DE MODALES

// ============================================================
// FUNCIONES BÁSICAS DE APERTURA Y CIERRE
// ============================================================

export function abrirModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
        modal.style.display = 'flex'
        const content = modal.querySelector('.modal-content')
        if (content) content.scrollTop = 0
    }
}

export function cerrarModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) modal.style.display = 'none'
}

export function cerrarTodosModales() {
    const modales = [
        'modalInformativo',
        'modalConfirmacion',
        'modalAltaCliente',
        'modalGenerarPassword',
        'modalEditarCliente',
        'modalVerCliente',
        'modalConfirmarEliminacion',
        'modalElegirTipoCliente'
    ]
    modales.forEach(id => cerrarModal(id))
}

// ============================================================
// CONFIGURACIÓN GLOBAL DE MODALES
// ============================================================

export function setupModalesGlobales() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarTodosModales()
    })
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none'
        }
    })
}

// ============================================================
// MODAL INFORMATIVO
// ============================================================

export function mostrarModalInformativo(titulo, mensaje, tipo = 'exito') {
    const modal = document.getElementById('modalInformativo')
    const header = document.getElementById('modalInformativoHeader')
    const icono = document.getElementById('modalInformativoIcono')
    const mensajeEl = document.getElementById('modalInformativoMensaje')
    
    if (!modal) {
        console.error('❌ Modal informativo no encontrado')
        return
    }
    
    if (tipo === 'exito') {
        if (header) header.innerHTML = '🎉 ' + titulo
        if (icono) icono.innerHTML = '✅'
    } else {
        if (header) header.innerHTML = '⚠️ ' + titulo
        if (icono) icono.innerHTML = '❌'
    }
    
    if (mensajeEl) mensajeEl.innerHTML = mensaje
    
    const btnCerrar = document.getElementById('btnCerrarInformativo')
    if (btnCerrar) {
        const nuevoBtn = btnCerrar.cloneNode(true)
        btnCerrar.parentNode.replaceChild(nuevoBtn, btnCerrar)
        nuevoBtn.onclick = () => cerrarModal('modalInformativo')
    }
    
    abrirModal('modalInformativo')
    
    if (tipo === 'exito') {
        setTimeout(() => cerrarModal('modalInformativo'), 5000)
    }
}

// ============================================================
// MODAL DE CONFIRMACIÓN
// ============================================================

export function mostrarModalConfirmacion(mensaje, onConfirmar, textoConfirmar = '✅ Confirmar', textoCancelar = 'Cancelar') {
    const modal = document.getElementById('modalConfirmacion')
    const mensajeEl = document.getElementById('mensajeConfirmacion')
    const btnConfirmar = document.getElementById('btnConfirmarAccion')
    const btnCancelar = document.getElementById('btnCancelarAccion')
    
    if (!modal) {
        console.error('❌ Modal de confirmación no encontrado')
        return
    }
    
    if (mensajeEl) mensajeEl.innerHTML = mensaje
    
    if (btnConfirmar) {
        const nuevoConfirmar = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(nuevoConfirmar, btnConfirmar)
        nuevoConfirmar.innerHTML = textoConfirmar
        nuevoConfirmar.onclick = () => {
            cerrarModal('modalConfirmacion')
            if (onConfirmar && typeof onConfirmar === 'function') onConfirmar()
        }
    }
    
    if (btnCancelar) {
        const nuevoCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoCancelar, btnCancelar)
        nuevoCancelar.innerHTML = textoCancelar
        nuevoCancelar.onclick = () => cerrarModal('modalConfirmacion')
    }
    
    abrirModal('modalConfirmacion')
}

// ============================================================
// MODAL DE CARGA
// ============================================================

let modalCarga = null

export function mostrarModalCarga(mensaje = 'Procesando...') {
    if (!modalCarga) {
        modalCarga = document.createElement('div')
        modalCarga.id = 'modalCarga'
        modalCarga.className = 'modal'
        modalCarga.style.backgroundColor = 'rgba(0,0,0,0.5)'
        modalCarga.style.display = 'none'
        modalCarga.style.justifyContent = 'center'
        modalCarga.style.alignItems = 'center'
        modalCarga.innerHTML = `
            <div class="modal-content" style="max-width: 300px; text-align: center;">
                <div style="padding: 20px;">
                    <div class="spinner" style="margin: 0 auto 16px auto;"></div>
                    <p id="modalCargaMensaje">${mensaje}</p>
                </div>
            </div>
        `
        document.body.appendChild(modalCarga)
    }
    
    const mensajeEl = document.getElementById('modalCargaMensaje')
    if (mensajeEl) mensajeEl.innerHTML = mensaje
    modalCarga.style.display = 'flex'
}

export function cerrarModalCarga() {
    if (modalCarga) modalCarga.style.display = 'none'
}

// ============================================================
// MODAL ELEGIR TIPO DE CLIENTE (NUEVO)
// ============================================================

export function abrirModalElegirTipoCliente() {
    const modal = document.getElementById('modalElegirTipoCliente')
    if (!modal) {
        console.error('❌ Modal modalElegirTipoCliente no encontrado')
        return
    }
    
    const btnEmpresa = document.getElementById('btnElegirEmpresa')
    const btnAutonomo = document.getElementById('btnElegirAutonomo')
    const btnCancelar = document.getElementById('btnCancelarElegir')
    
    if (btnEmpresa) {
        const nuevoBtnEmpresa = btnEmpresa.cloneNode(true)
        btnEmpresa.parentNode.replaceChild(nuevoBtnEmpresa, btnEmpresa)
        nuevoBtnEmpresa.onclick = async () => {
            cerrarModal('modalElegirTipoCliente')
            const { abrirModalAltaEmpresa } = await import('./modalesAltaEmpresa.js')
            abrirModalAltaEmpresa()
        }
    }
    
    if (btnAutonomo) {
        const nuevoBtnAutonomo = btnAutonomo.cloneNode(true)
        btnAutonomo.parentNode.replaceChild(nuevoBtnAutonomo, btnAutonomo)
        nuevoBtnAutonomo.onclick = async () => {
            cerrarModal('modalElegirTipoCliente')
            const { abrirModalAltaAutonomo } = await import('./modalesAltaAutonomo.js')
            abrirModalAltaAutonomo()
        }
    }
    
    if (btnCancelar) {
        const nuevoBtnCancelar = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar)
        nuevoBtnCancelar.onclick = () => cerrarModal('modalElegirTipoCliente')
    }
    
    abrirModal('modalElegirTipoCliente')
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    abrirModal,
    cerrarModal,
    cerrarTodosModales,
    setupModalesGlobales,
    mostrarModalInformativo,
    mostrarModalConfirmacion,
    mostrarModalCarga,
    cerrarModalCarga,
    abrirModalElegirTipoCliente  // ← EXPORTADA
}