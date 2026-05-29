// js/modules/utils.js
import { sb } from './supabase.js'

export function getTipoIcono(tipo) {
    const tipos = {
        'administrador': '🏢 Administrador',
        'comunidad': '🏘️ Comunidad',
        'empresa_piscinas': '🌊 Piscinas',
        'empresa_jardineria': '🌳 Jardinería',
        'empresa_fontaneria': '🔧 Fontanería',
        'empresa_electricidad': '⚡ Electricidad',
        'empresa_limpieza': '🧹 Limpieza',
        'empresa_cerrajeria': '🔒 Cerrajería',
        'empresa_reformas': '🏗️ Reformas',
        'empresa_antenas': '📡 Antenas',
        'empresa_climatizacion': '❄️ Climatización',
        'autonomo': '👤 Autónomo',
        'otro': '📋 Otro'
    }
    return tipos[tipo] || '📋 ' + tipo
}

export function getBadgeTipo(tipo) {
    if (tipo === 'administrador') return '<span class="badge badge-administrador">🏢 Administrador</span>'
    if (tipo === 'comunidad') return '<span class="badge badge-comunidad">🏘️ Comunidad</span>'
    if (tipo === 'autonomo') return '<span class="badge badge-autonomo">👤 Autónomo</span>'
    return '<span class="badge badge-empresa">🏭 Empresa</span>'
}

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

export async function generarHash(contenido) {
    const encoder = new TextEncoder()
    const data = encoder.encode(contenido)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function obtenerUltimoHash(nifEmisor) {
    const { data } = await sb.from('registros_facturacion')
        .select('hash_factura')
        .eq('nif_emisor', nifEmisor)
        .order('created_at', { ascending: false })
        .limit(1)
    return data && data.length > 0 ? data[0].hash_factura : null
}
