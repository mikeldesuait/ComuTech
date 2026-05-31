// js/modules/utils.js
// 🔧 FUNCIONES AUXILIARES COMPARTIDAS

import { sb } from './supabase.js'

// ============================================================
// FORMATO DE FECHAS
// ============================================================

export function formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('es-ES')
}

export function formatDateTime(date) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES')
}

// ============================================================
// MENSAJES FLOTANTES
// ============================================================

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

export function getBadgeTipo(tipo) {
    const badges = {
        'administrador': '<span class="badge badge-administrador">🏢 Administrador</span>',
        'comunidad': '<span class="badge badge-comunidad">🏘️ Comunidad</span>',
        'autonomo': '<span class="badge badge-autonomo">👤 Autónomo</span>',
        'empresa': '<span class="badge badge-empresa">🏭 Empresa</span>'
    }
    return badges[tipo] || badges['empresa']
}

export function getTipoIcono(tipo) {
    const tipos = {
        'administrador': '🏢 Administrador de comunidades',
        'comunidad': '🏘️ Comunidad de propietarios',
        'autonomo': '👤 Autónomo',
        'empresa': '🏢 Empresa'
    }
    return tipos[tipo] || tipos['empresa']
}

export function getBadgePlan(plan) {
    const planes = {
        'BASICO': 'badge-basico',
        'PRO': 'badge-pro',
        'EMPRESA': 'badge-empresa-plan'
    }
    return planes[plan] || 'badge-basico'
}

export function getBadgeEstado(activo) {
    if (activo) {
        return '<span class="badge badge-activo">✅ Activo</span>'
    }
    return '<span class="badge badge-inactivo">❌ Inactivo</span>'
}

export function getBadgeConsentimiento(consentimiento) {
    if (consentimiento) {
        return '<span class="badge badge-activo">✅ Aceptado</span>'
    }
    return '<span class="badge badge-inactivo">❌ Pendiente</span>'
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

export function isValidIBAN(iban) {
    if (!iban) return true
    const ibanRegex = /^ES[0-9]{2}[0-9]{20}$/
    return ibanRegex.test(iban.toUpperCase().replace(/\s/g, ''))
}

// ============================================================
// MANIPULACIÓN DE MODALES
// ============================================================

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
// GENERADORES
// ============================================================

export function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

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
// ESCAPAR HTML
// ============================================================

export function escapeHtml(text) {
    if (!text) return text
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// ============================================================
// CONTRATOS - URL FIRMADA
// ============================================================

export async function obtenerURLContrato(empresaId) {
    if (!empresaId) return null
    
    try {
        console.log('🔍 Buscando contrato para empresa:', empresaId)
        
        const { data: contratos, error } = await sb
            .from('historico_contratos')
            .select('contrato_pdf_url')
            .eq('empresa_id', empresaId)
            .order('fecha_aceptacion', { ascending: false })
        
        if (error) {
            console.error('Error:', error)
            return null
        }
        
        if (!contratos || contratos.length === 0) {
            console.log('No hay contratos')
            return null
        }
        
        let ruta = contratos[0].contrato_pdf_url
        console.log('Ruta original:', ruta)
        
        // Si la ruta no empieza con 'contratos/', añadirlo
        if (!ruta.startsWith('contratos/')) {
            ruta = 'contratos/' + ruta
        }
        
        console.log('Ruta corregida:', ruta)
        
        const { data, error: urlError } = await sb.storage
            .from('contratos')
            .createSignedUrl(ruta, 604800)
        
        if (urlError) {
            console.error('Error generando URL:', urlError)
            return null
        }
        
        console.log('URL generada:', data?.signedUrl)
        return data?.signedUrl
        
    } catch (error) {
        console.error('Error:', error)
        return null
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
    copiarAlPortapapeles,
    escapeHtml,
    obtenerURLContrato
}