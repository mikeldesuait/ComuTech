export function formatDate(date) {
    if (!date) return ''
    return new Date(date).toLocaleDateString('es-ES')
}

export function mostrarMensaje(texto, tipo = 'exito') {
    const msg = document.createElement('div')
    msg.className = 'mensaje'
    msg.style.background = tipo === 'exito' ? '#2c7a4d' : '#c2410c'
    msg.innerHTML = texto
    document.body.appendChild(msg)
    setTimeout(() => msg.remove(), 3000)
}

export function getBadgeTipo(tipo) {
    const badges = {
        'administrador': '<span class="badge badge-administrador">🏢 Administrador</span>',
        'comunidad': '<span class="badge badge-comunidad">🏘️ Comunidad</span>',
        'autonomo': '<span class="badge badge-autonomo">👤 Autónomo</span>'
    }
    return badges[tipo] || '<span class="badge badge-empresa">🏭 Empresa</span>'
}

export function getTipoIcono(tipo) {
    const tipos = {
        'administrador': '🏢 Administrador',
        'comunidad': '🏘️ Comunidad',
        'autonomo': '👤 Autónomo'
    }
    return tipos[tipo] || '🏭 Empresa'
}
