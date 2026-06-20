// gerente/js/modules/utils.js
// Funciones auxiliares para el panel gerente - VERSIÓN ACTUALIZADA

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
    return fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
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
// ✅ BADGES - ACTUALIZADOS CON NUEVOS ESTADOS
// ============================================================

export function getEstadoBadge(estado) {
    const badges = {
        // ✅ NUEVOS ESTADOS DEL FLUJO
        'pendiente_aceptacion': '<span class="badge badge-pendiente">⏳ Pendiente aceptación</span>',
        'vista': '<span class="badge" style="background:#dbeafe; color:#1e40af;">👁️ Vista</span>',
        'aceptada': '<span class="badge" style="background:#d4edda; color:#155724;">✅ Aceptada</span>',
        'rechazada': '<span class="badge badge-inactivo">❌ Rechazada</span>',
        'en_desplazamiento': '<span class="badge" style="background:#fef3c7; color:#92400e;">🚗 En desplazamiento</span>',
        'trabajando_onsite': '<span class="badge" style="background:#d1ecf1; color:#0c5460;">🔧 Trabajando OnSite</span>',
        'terminada': '<span class="badge badge-completada">✅ Terminada</span>',
        'suspendida': '<span class="badge" style="background:#f8d7da; color:#721c24;">⏸️ Suspendida</span>',
        'cancelada': '<span class="badge badge-cancelada">❌ Cancelada</span>',
        
        // Estados antiguos (compatibilidad)
        'pendiente': '<span class="badge badge-pendiente">⏳ Pendiente</span>',
        'en_progreso': '<span class="badge" style="background:#d1ecf1; color:#0c5460;">⚙️ En progreso</span>',
        'completada': '<span class="badge badge-completada">✅ Completada</span>',
        'facturada': '<span class="badge" style="background:#d4edda; color:#155724;">💰 Facturada</span>'
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
// ✅ NUEVO: OBTENER COLOR DEL ESTADO (para estilos dinámicos)
// ============================================================

export function getEstadoColor(estado) {
    const colores = {
        'pendiente_aceptacion': '#fef3c7',  // Amarillo claro
        'vista': '#dbeafe',                 // Azul claro
        'aceptada': '#d4edda',              // Verde claro
        'rechazada': '#f8d7da',             // Rojo claro
        'en_desplazamiento': '#fef3c7',     // Amarillo claro
        'trabajando_onsite': '#d1ecf1',     // Azul turquesa
        'terminada': '#d4edda',             // Verde claro
        'suspendida': '#f8d7da',            // Rojo claro
        'cancelada': '#e2e3e5',             // Gris claro
        'pendiente': '#fef3c7',
        'en_progreso': '#d1ecf1',
        'completada': '#d4edda'
    }
    return colores[estado] || '#e2e3e5'
}

export function getEstadoTextoColor(estado) {
    const colores = {
        'pendiente_aceptacion': '#92400e',
        'vista': '#1e40af',
        'aceptada': '#155724',
        'rechazada': '#721c24',
        'en_desplazamiento': '#92400e',
        'trabajando_onsite': '#0c5460',
        'terminada': '#155724',
        'suspendida': '#721c24',
        'cancelada': '#383d41',
        'pendiente': '#92400e',
        'en_progreso': '#0c5460',
        'completada': '#155724'
    }
    return colores[estado] || '#383d41'
}

// ============================================================
// ✅ NUEVO: OBTENER ICONO DEL ESTADO
// ============================================================

export function getEstadoIcono(estado) {
    const iconos = {
        'pendiente_aceptacion': '⏳',
        'vista': '👁️',
        'aceptada': '✅',
        'rechazada': '❌',
        'en_desplazamiento': '🚗',
        'trabajando_onsite': '🔧',
        'terminada': '✅',
        'suspendida': '⏸️',
        'cancelada': '❌',
        'pendiente': '⏳',
        'en_progreso': '⚙️',
        'completada': '✅'
    }
    return iconos[estado] || '📋'
}

// ============================================================
// ✅ NUEVO: OBTENER LABEL DEL ESTADO
// ============================================================

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
        'cancelada': 'Cancelada',
        'pendiente': 'Pendiente',
        'en_progreso': 'En progreso',
        'completada': 'Completada'
    }
    return labels[estado] || estado || 'Desconocido'
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

// ============================================================
// ✅ NUEVO: VALIDAR TRANSICIÓN DE ESTADO
// ============================================================

export function validarTransicionEstado(estadoActual, nuevoEstado) {
    const transiciones = {
        'pendiente_aceptacion': ['vista', 'rechazada', 'cancelada'],
        'vista': ['aceptada', 'rechazada', 'cancelada'],
        'aceptada': ['en_desplazamiento', 'suspendida', 'cancelada'],
        'en_desplazamiento': ['trabajando_onsite', 'suspendida', 'cancelada'],
        'trabajando_onsite': ['terminada', 'suspendida', 'cancelada'],
        'suspendida': ['aceptada', 'cancelada'],
        'rechazada': ['pendiente_aceptacion', 'cancelada'],
        'terminada': [],
        'cancelada': []
    }
    
    return transiciones[estadoActual]?.includes(nuevoEstado) || false
}

// ============================================================
// ✅ NUEVO: OBTENER ESTADOS DISPONIBLES PARA UN ESTADO ACTUAL
// ============================================================

export function getEstadosDisponibles(estadoActual) {
    const transiciones = {
        'pendiente_aceptacion': [
            { value: 'vista', label: '👁️ Marcar como vista' },
            { value: 'rechazada', label: '❌ Rechazar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'vista': [
            { value: 'aceptada', label: '✅ Aceptar tarea' },
            { value: 'rechazada', label: '❌ Rechazar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'aceptada': [
            { value: 'en_desplazamiento', label: '🚗 Iniciar desplazamiento' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'en_desplazamiento': [
            { value: 'trabajando_onsite', label: '🔧 Llegada al sitio' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'trabajando_onsite': [
            { value: 'terminada', label: '✅ Finalizar tarea' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'suspendida': [
            { value: 'aceptada', label: '▶️ Reactivar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'rechazada': [
            { value: 'pendiente_aceptacion', label: '🔄 Reasignar y reiniciar' },
            { value: 'cancelada', label: '❌ Cancelar definitivamente' }
        ],
        'terminada': [],
        'cancelada': []
    }
    
    return transiciones[estadoActual] || []
}