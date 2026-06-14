// gerente/js/modules/utils.js
// Funciones auxiliares para el panel gerente

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

export function formatearDuracion(minutos) {
    if (!minutos && minutos !== 0) return 'No registrado'
    if (minutos === 0) return '1 min'
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0 && mins > 0) return `${horas}h ${mins}min`
    if (horas > 0) return `${horas}h`
    return `${mins}min`
}

// ============================================================
// OBTENER FECHA/HORA ACTUAL LOCAL
// ============================================================

export function getNowLocalISO() {
    const ahora = new Date()
    const offset = ahora.getTimezoneOffset()
    return new Date(ahora.getTime() - offset * 60000).toISOString().slice(0, 19)
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

let modalCarga = null

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
// BADGES
// ============================================================

export function getEstadoBadge(estado) {
    const badges = {
        'pendiente': '<span class="badge badge-pendiente">⏳ Pendiente</span>',
        'en_progreso': '<span class="badge badge-activo">⚙️ En progreso</span>',
        'completada': '<span class="badge badge-completada">✅ Completada</span>',
        'cancelada': '<span class="badge badge-cancelada">❌ Cancelada</span>',
        'facturada': '<span class="badge badge-activo">💰 Facturada</span>'
    }
    return badges[estado] || '<span class="badge badge-pendiente">📋 Otro</span>'
}

export function getPrioridadBadge(prioridad) {
    const badges = {
        'baja': '<span class="badge" style="background:#d4edda; color:#155724;">🟢 Baja</span>',
        'media': '<span class="badge" style="background:#fff3cd; color:#856404;">🟡 Media</span>',
        'alta': '<span class="badge" style="background:#f8d7da; color:#721c24;">🔴 Alta</span>',
        'urgente': '<span class="badge" style="background:#dc2626; color:white;">🔥 Urgente</span>'
    }
    return badges[prioridad] || badges['media']
}

// ============================================================
// VALIDACIONES
// ============================================================

export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

export function isValidNIF(nif) {
    if (!nif) return true
    const nifRegex = /^[0-9]{8}[A-Z]$|^[A-Z][0-9]{7}[A-Z]$|^[A-Z]{3}[0-9]{4}[A-Z]$/
    return nifRegex.test(nif.toUpperCase())
}

// ============================================================
// GENERAR ID ÚNICO
// ============================================================

export function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}