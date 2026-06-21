// tecnico/js/utils/utils.js
export function mostrarMensaje(texto, tipo = 'exito') {
    const msg = document.createElement('div')
    msg.className = 'mensaje'
    if (tipo === 'error') msg.classList.add('error')
    msg.innerHTML = texto
    document.body.appendChild(msg)
    setTimeout(() => { msg.style.opacity = '0'; setTimeout(() => msg.remove(), 300) }, 3000)
}

export function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha'
    if (typeof fecha === 'string' && fecha.includes('T')) fecha = fecha.split('T')[0]
    const partes = fecha.split('-')
    if (partes.length !== 3) return fecha
    return `${partes[2]}/${partes[1]}/${partes[0]}`
}

export function formatearFechaHora(isoString) {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleString('es-ES')
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

export function getNowLocalISO() {
    const ahora = new Date()
    const offset = ahora.getTimezoneOffset()
    return new Date(ahora.getTime() - offset * 60000).toISOString().slice(0, 19)
}

export function escapeHtml(text) {
    if (!text) return ''
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function formatMoney(amount) {
    if (amount === undefined || amount === null) return '0,00'
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getEstadoBadge(estado) {
    const badges = {
        'pendiente_aceptacion': '<span class="badge badge-pendiente">⏳ Pendiente aceptación</span>',
        'vista': '<span class="badge" style="background:#dbeafe; color:#1e40af;">👁️ Vista</span>',
        'aceptada': '<span class="badge" style="background:#d4edda; color:#155724;">✅ Aceptada</span>',
        'rechazada': '<span class="badge badge-inactivo">❌ Rechazada</span>',
        'en_desplazamiento': '<span class="badge" style="background:#fef3c7; color:#92400e;">🚗 En desplazamiento</span>',
        'trabajando_onsite': '<span class="badge" style="background:#d1ecf1; color:#0c5460;">🔧 Trabajando OnSite</span>',
        'terminada': '<span class="badge badge-completada">✅ Terminada</span>',
        'suspendida': '<span class="badge" style="background:#f8d7da; color:#721c24;">⏸️ Suspendida</span>',
        'cancelada': '<span class="badge badge-cancelada">❌ Cancelada</span>'
    }
    return badges[estado] || '<span class="badge badge-pendiente">📋 Otro</span>'
}

export function getEstadoLabel(estado) {
    const labels = {
        'pendiente_aceptacion': 'Pendiente de aceptación',
        'vista': 'Vista',
        'aceptada': 'Aceptada',
        'rechazada': 'Rechazada',
        'en_desplazamiento': 'En desplazamiento',
        'trabajando_onsite': 'Trabajando en el sitio',
        'terminada': 'Terminada',
        'suspendida': 'Suspendida',
        'cancelada': 'Cancelada'
    }
    return labels[estado] || estado || 'Desconocido'
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