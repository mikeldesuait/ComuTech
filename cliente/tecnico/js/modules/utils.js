// tecnico/js/modules/utils.js
// Funciones auxiliares para el panel técnico

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
// OBTENER FECHA/HORA ACTUAL LOCAL (formato ISO sin zona)
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
// GENERAR ID ÚNICO TEMPORAL
// ============================================================

export function generarIdTemp() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// ============================================================
// MODAL DE CARGA
// ============================================================

let modalCarga = null

export function mostrarModalCarga(mensaje = 'Cargando...') {
    if (!modalCarga) {
        modalCarga = document.createElement('div')
        modalCarga.id = 'modalCarga'
        modalCarga.className = 'modal-overlay'
        modalCarga.style.display = 'none'
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
// OBTENER ESTADO/PRIORIDAD (mapeo)
// ============================================================

export function getPrioridadClass(tipo) {
    const prioridades = {
        'URGENCIA': 'prioridad-urgente',
        'AVERIA': 'prioridad-averia',
        'MANTENIMIENTO': 'prioridad-mantenimiento',
        'REVISION': 'prioridad-revision',
        'PRESUPUESTO': 'prioridad-presupuesto'
    }
    return prioridades[tipo] || 'prioridad-mantenimiento'
}

export function getTipoIcono(tipo) {
    const iconos = {
        'URGENCIA': '🔴',
        'AVERIA': '🟠',
        'MANTENIMIENTO': '🟢',
        'REVISION': '🔵',
        'PRESUPUESTO': '🟡'
    }
    return iconos[tipo] || '📋'
}

export function getTipoClass(tipo) {
    const tipos = {
        'URGENCIA': 'tipo-urgente',
        'AVERIA': 'tipo-averia',
        'MANTENIMIENTO': 'tipo-mantenimiento',
        'REVISION': 'tipo-revision',
        'PRESUPUESTO': 'tipo-presupuesto'
    }
    return tipos[tipo] || 'tipo-mantenimiento'
}

export function getEstadoClass(estado) {
    const estados = {
        'PENDIENTE': 'estado-pendiente',
        'ACEPTADA': 'estado-aceptada',
        'EN_CURSO': 'estado-curso',
        'SUSPENDIDA': 'estado-suspendida',
        'COMPLETADA': 'estado-completada',
        'CANCELADA': 'estado-cancelada'
    }
    return estados[estado] || 'estado-pendiente'
}

export function getEstadoTexto(estado) {
    const textos = {
        'PENDIENTE': 'Pendiente',
        'ACEPTADA': 'Aceptada',
        'EN_CURSO': 'En curso',
        'SUSPENDIDA': 'Suspendida',
        'COMPLETADA': 'Completada',
        'CANCELADA': 'Cancelada'
    }
    return textos[estado] || estado
}