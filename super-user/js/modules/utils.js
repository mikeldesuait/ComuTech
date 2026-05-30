// js/modules/utils.js
// 🔧 FUNCIONES AUXILIARES COMPARTIDAS

// ============================================================
// FORMATO DE FECHAS
// ============================================================

/**
 * Formatea una fecha a formato local español
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada (dd/mm/yyyy)
 */
export function formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('es-ES')
}

/**
 * Formatea una fecha y hora a formato local español
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export function formatDateTime(date) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES')
}

// ============================================================
// MENSAJES FLOTANTES
// ============================================================

/**
 * Muestra un mensaje flotante temporal
 * @param {string} texto - Mensaje a mostrar
 * @param {string} tipo - 'exito' o 'error'
 */
export function mostrarMensaje(texto, tipo = 'exito') {
    const msg = document.createElement('div')
    msg.className = 'mensaje'
    msg.style.background = tipo === 'exito' ? '#2c7a4d' : '#c2410c'
    msg.innerHTML = texto
    document.body.appendChild(msg)
    
    setTimeout(() => {
        msg.style.opacity = '0'
        setTimeout(() => msg.remove(), 300)
    }, 3000)
}

// ============================================================
// BADGES Y TIPOS DE CLIENTE
// ============================================================

/**
 * Obtiene el HTML del badge según el tipo de cliente
 * @param {string} tipo - Tipo de cliente
 * @returns {string} HTML del badge
 */
export function getBadgeTipo(tipo) {
    const badges = {
        'administrador': '<span class="badge badge-administrador">🏢 Administrador</span>',
        'comunidad': '<span class="badge badge-comunidad">🏘️ Comunidad</span>',
        'autonomo': '<span class="badge badge-autonomo">👤 Autónomo</span>',
        'empresa_piscinas': '<span class="badge badge-empresa">🌊 Piscinas</span>',
        'empresa_jardineria': '<span class="badge badge-empresa">🌳 Jardinería</span>',
        'empresa_fontaneria': '<span class="badge badge-empresa">🔧 Fontanería</span>',
        'empresa_electricidad': '<span class="badge badge-empresa">⚡ Electricidad</span>',
        'empresa_limpieza': '<span class="badge badge-empresa">🧹 Limpieza</span>',
        'empresa_cerrajeria': '<span class="badge badge-empresa">🔒 Cerrajería</span>',
        'empresa_reformas': '<span class="badge badge-empresa">🏗️ Reformas</span>',
        'empresa_antenas': '<span class="badge badge-empresa">📡 Antenas</span>',
        'empresa_climatizacion': '<span class="badge badge-empresa">❄️ Climatización</span>',
        'empresa': '<span class="badge badge-empresa">🏭 Empresa</span>',
        'otro': '<span class="badge badge-empresa">📋 Otro</span>'
    }
    return badges[tipo] || badges['empresa']
}

/**
 * Obtiene el texto con icono según el tipo de cliente
 * @param {string} tipo - Tipo de cliente
 * @returns {string} Texto con icono
 */
export function getTipoIcono(tipo) {
    const tipos = {
        'administrador': '🏢 Administrador de comunidades',
        'comunidad': '🏘️ Comunidad de propietarios',
        'autonomo': '👤 Autónomo',
        'empresa_piscinas': '🌊 Empresa de piscinas',
        'empresa_jardineria': '🌳 Empresa de jardinería',
        'empresa_fontaneria': '🔧 Empresa de fontanería',
        'empresa_electricidad': '⚡ Empresa de electricidad',
        'empresa_limpieza': '🧹 Empresa de limpieza',
        'empresa_cerrajeria': '🔒 Empresa de cerrajería',
        'empresa_reformas': '🏗️ Empresa de reformas',
        'empresa_antenas': '📡 Empresa de antenas',
        'empresa_climatizacion': '❄️ Climatización',
        'empresa': '🏢 Empresa',
        'otro': '📋 Otro'
    }
    return tipos[tipo] || tipos['empresa']
}

/**
 * Obtiene el color del badge según el plan
 * @param {string} plan - Plan del cliente
 * @returns {string} Clase CSS del badge
 */
export function getBadgePlan(plan) {
    const planes = {
        'BASICO': 'badge-basico',
        'PRO': 'badge-pro',
        'EMPRESA': 'badge-empresa-plan'
    }
    return planes[plan] || 'badge-basico'
}

/**
 * Obtiene el estado del cliente (activo/inactivo)
 * @param {boolean} activo - Estado del cliente
 * @returns {string} HTML del badge de estado
 */
export function getBadgeEstado(activo) {
    if (activo) {
        return '<span class="badge badge-activo">✅ Activo</span>'
    }
    return '<span class="badge badge-inactivo">❌ Inactivo</span>'
}

/**
 * Obtiene el badge de consentimiento RGPD
 * @param {boolean} consentimiento - Si aceptó el consentimiento
 * @returns {string} HTML del badge
 */
export function getBadgeConsentimiento(consentimiento) {
    if (consentimiento) {
        return '<span class="badge badge-activo">✅ Aceptado</span>'
    }
    return '<span class="badge badge-inactivo">❌ Pendiente</span>'
}

// ============================================================
// VALIDACIONES
// ============================================================

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

/**
 * Valida un NIF español (básico)
 * @param {string} nif - NIF a validar
 * @returns {boolean} true si tiene formato válido
 */
export function isValidNIF(nif) {
    if (!nif) return true // Opcional
    const nifRegex = /^[0-9]{8}[A-Z]$|^[A-Z][0-9]{7}[A-Z]$|^[A-Z]{3}[0-9]{4}[A-Z]$/
    return nifRegex.test(nif.toUpperCase())
}

/**
 * Valida un IBAN español (básico)
 * @param {string} iban - IBAN a validar
 * @returns {boolean} true si tiene formato válido
 */
export function isValidIBAN(iban) {
    if (!iban) return true // Opcional
    const ibanRegex = /^ES[0-9]{2}[0-9]{20}$/
    return ibanRegex.test(iban.toUpperCase().replace(/\s/g, ''))
}

// ============================================================
// MANIPULACIÓN DE MODALES
// ============================================================

/**
 * Cierra un modal específico
 * @param {string} modalId - ID del modal
 */
export function cerrarModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) modal.style.display = 'none'
}

/**
 * Cierra todos los modales
 */
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
// GENERADORES
// ============================================================

/**
 * Genera un ID único simple
 * @returns {string} ID único
 */
export function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Genera una contraseña aleatoria segura
 * @param {number} longitud - Longitud de la contraseña (por defecto 12)
 * @returns {string} Contraseña generada
 */
export function generarPassword(longitud = 12) {
    const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const minusculas = 'abcdefghijkmnopqrstuvwxyz'
    const numeros = '23456789'
    const simbolos = '!@#$%'
    
    const randomChar = (str) => str[Math.floor(Math.random() * str.length)]
    
    let password = ''
    password += randomChar(mayusculas)
    password += randomChar(minusculas)
    password += randomChar(numeros)
    password += randomChar(simbolos)
    
    const todos = mayusculas + minusculas + numeros + simbolos
    for (let i = password.length; i < longitud; i++) {
        password += randomChar(todos)
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

// ============================================================
// COPIA AL PORTAPAPELES
// ============================================================

/**
 * Copia un texto al portapapeles
 * @param {string} texto - Texto a copiar
 * @returns {Promise<boolean>} true si se copió correctamente
 */
export async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto)
        mostrarMensaje('✅ Copiado al portapapeles', 'exito')
        return true
    } catch (error) {
        console.error('Error al copiar:', error)
        mostrarMensaje('❌ No se pudo copiar', 'error')
        return false
    }
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    formatDate,
    formatDateTime,
    mostrarMensaje,
    getBadgeTipo,
    getTipoIcono,
    getBadgePlan,
    getBadgeEstado,
    getBadgeConsentimiento,
    isValidEmail,
    isValidNIF,
    isValidIBAN,
    cerrarModal,
    cerrarTodosModales,
    generarIdUnico,
    generarPassword,
    copiarAlPortapapeles
}