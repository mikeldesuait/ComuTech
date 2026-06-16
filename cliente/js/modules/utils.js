// cliente/js/modules/utils.js
// Funciones auxiliares para el panel cliente

// ============================================================
// MENSAJES FLOTANTES
// ============================================================

export function mostrarMensaje(texto, tipo = 'exito') {
    const msg = document.createElement('div')
    msg.className = 'mensaje'
    if (tipo === 'error') msg.classList.add('error')
    msg.innerHTML = texto
    document.body.appendChild(msg)
    
    setTimeout(() => {
        msg.style.opacity = '0'
        setTimeout(() => msg.remove(), 300)
    }, 3000)
}

// ============================================================
// FORMATEO DE FECHAS
// ============================================================

export function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha'
    if (typeof fecha === 'string' && fecha.includes('T')) {
        fecha = fecha.split('T')[0]
    }
    const partes = fecha.split('-')
    if (partes.length !== 3) return fecha
    return `${partes[2]}/${partes[1]}/${partes[0]}`
}

export function formatearFechaHora(isoString) {
    if (!isoString) return '-'
    const fecha = new Date(isoString)
    return fecha.toLocaleString('es-ES')
}

// ============================================================
// ESCAPAR HTML
// ============================================================

export function escapeHtml(text) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// ============================================================
// FORMATO MONEDA
// ============================================================

export function formatMoney(amount) {
    if (amount === undefined || amount === null) return '0,00'
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ============================================================
// MODAL DE CARGA
// ============================================================

export function mostrarModalCarga(mensaje = 'Cargando...') {
    const modal = document.getElementById('modalCarga')
    if (modal) {
        const mensajeEl = document.getElementById('modalCargaMensaje')
        if (mensajeEl) mensajeEl.innerHTML = mensaje
        modal.style.display = 'flex'
    }
}

export function cerrarModalCarga() {
    const modal = document.getElementById('modalCarga')
    if (modal) modal.style.display = 'none'
}

// ============================================================
// MODAL INFORMATIVO
// ============================================================

export function mostrarModalInformativo(titulo, mensaje, tipo = 'exito') {
    const modal = document.getElementById('modalInformativo')
    const tituloEl = document.getElementById('modalInformativoTitulo')
    const mensajeEl = document.getElementById('modalInformativoMensaje')
    
    if (!modal) return
    
    if (tituloEl) tituloEl.innerHTML = tipo === 'exito' ? `✅ ${titulo}` : `⚠️ ${titulo}`
    if (mensajeEl) mensajeEl.innerHTML = mensaje
    
    modal.style.display = 'flex'
    
    const btnCerrar = document.getElementById('btnCerrarInformativo')
    if (btnCerrar) {
        const newBtn = btnCerrar.cloneNode(true)
        btnCerrar.parentNode.replaceChild(newBtn, btnCerrar)
        newBtn.onclick = () => modal.style.display = 'none'
    }
}

// ============================================================
// MODAL DE CONFIRMACIÓN
// ============================================================

export function mostrarModalConfirmacion(mensaje, onConfirmar, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar') {
    const modal = document.getElementById('modalConfirmacion')
    const mensajeEl = document.getElementById('mensajeConfirmacion')
    const btnConfirmar = document.getElementById('btnConfirmarAccion')
    const btnCancelar = document.getElementById('btnCancelarAccion')
    
    if (!modal) return
    
    if (mensajeEl) mensajeEl.innerHTML = mensaje
    
    if (btnConfirmar) {
        const newBtn = btnConfirmar.cloneNode(true)
        btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar)
        newBtn.innerHTML = textoConfirmar
        newBtn.onclick = () => {
            modal.style.display = 'none'
            if (onConfirmar) onConfirmar()
        }
    }
    
    if (btnCancelar) {
        const newBtn = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(newBtn, btnCancelar)
        newBtn.innerHTML = textoCancelar
        newBtn.onclick = () => modal.style.display = 'none'
    }
    
    modal.style.display = 'flex'
}

// ============================================================
// VALIDACIONES
// ============================================================

export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

// ============================================================
// GENERAR ID ÚNICO
// ============================================================

export function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// ============================================================
// FORMATEAR CÓDIGO DE ACCESO
// ============================================================

export function formatearCodigoAcceso(codigo) {
    if (!codigo) return ''
    // Convertir a mayúsculas y eliminar espacios dobles
    return codigo.toUpperCase().trim().replace(/\s+/g, ' ')
}