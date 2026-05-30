// js/modules/modales/modalesVision.js
// 👁️ LÓGICA DE VISUALIZACIÓN DE CLIENTES (VER DETALLE)

import { sb } from '../supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modalesGenerales.js'
import { formatDate } from '../utils.js'

// ============================================================
// CONSTANTES
// ============================================================

const TEMPLATE_URL = 'templates/clientes/ver-cliente.html'
const CONTAINER_ID = 'detalleCliente'

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

/**
 * Carga el template HTML del detalle
 */
async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template: ${TEMPLATE_URL}`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        return true
    } catch (error) {
        console.error(error)
        mostrarModalInformativo('Error', 'No se pudo cargar la vista de detalle', 'error')
        return false
    }
}

/**
 * Obtiene el icono según el tipo de cliente
 * @param {string} tipo - Tipo de cliente
 * @returns {string} Icono + texto
 */
function getTipoIcono(tipo) {
    const tipos = {
        'administrador': '🏢 Administrador de comunidades',
        'comunidad': '🏘️ Comunidad de propietarios',
        'empresa_piscinas': '🌊 Empresa de piscinas',
        'empresa_jardineria': '🌳 Empresa de jardinería',
        'empresa_fontaneria': '🔧 Empresa de fontanería',
        'empresa_electricidad': '⚡ Empresa de electricidad',
        'empresa_limpieza': '🧹 Empresa de limpieza',
        'empresa_cerrajeria': '🔒 Empresa de cerrajería',
        'empresa_reformas': '🏗️ Empresa de reformas',
        'empresa_antenas': '📡 Empresa de antenas',
        'empresa_climatizacion': '❄️ Climatización',
        'autonomo': '👤 Autónomo',
        'empresa': '🏢 Empresa',
        'otro': '📋 Otro'
    }
    return tipos[tipo] || '📋 ' + tipo
}

/**
 * Obtiene el historial de consentimientos del cliente
 * @param {string} perfilId - ID del perfil
 * @returns {Promise<Array>} Lista de consentimientos
 */
async function obtenerHistorialConsentimientos(perfilId) {
    if (!perfilId) return []
    
    try {
        const { data, error } = await sb.from('historico_consentimientos')
            .select('*')
            .eq('perfil_id', perfilId)
            .order('fecha_aceptacion', { ascending: false })
        
        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error obteniendo consentimientos:', error)
        return []
    }
}

/**
 * Genera el HTML del historial de consentimientos
 * @param {Array} consentimientos - Lista de consentimientos
 * @returns {string} HTML del historial
 */
function generarHistorialHtml(consentimientos) {
    if (!consentimientos.length) {
        return '<p>No hay registros de consentimiento</p>'
    }
    
    let html = ''
    consentimientos.forEach(c => {
        const fechaAceptacion = formatDate(c.fecha_aceptacion)
        const finalidades = c.finalidades_aceptadas ? c.finalidades_aceptadas.join(', ') : 'Todas'
        
        html += `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
                <small>📅 <strong>${fechaAceptacion}</strong> - Versión: ${c.consentimiento_version || '1.0'}</small>
                <br><small>Finalidades: ${finalidades}</small>
        `
        
        if (c.fecha_revocacion) {
            html += `<br><small style="color: #c2410c;">❌ Revocado: ${formatDate(c.fecha_revocacion)}</small>`
        }
        
        html += `</div>`
    })
    
    return html
}

/**
 * Genera el HTML del detalle del cliente
 * @param {Object} cliente - Datos del cliente
 * @returns {string} HTML del detalle
 */
function generarDetalleHtml(cliente) {
    // Construir dirección completa
    const direccion = [
        cliente.calle,
        cliente.numero,
        cliente.piso
    ].filter(p => p).join(', ') || cliente.direccion || '-'
    
    const direccionCompleta = [
        direccion,
        cliente.codigo_postal,
        cliente.ciudad || cliente.municipio,
        cliente.provincia
    ].filter(p => p).join(', ')
    
    return `
        <div class="detalle-info">
            <p><strong>🏢 ${cliente.nombre_empresa || '-'}</strong></p>
            <p>📋 Tipo: ${getTipoIcono(cliente.tipo_cliente)}</p>
            ${cliente.oficio ? `<p>🔧 Oficio: ${cliente.oficio}</p>` : ''}
            <p>📋 NIF/CIF: ${cliente.nif_cif || '-'}</p>
            <p>📍 Dirección: ${direccionCompleta || '-'}</p>
            <p>📞 Teléfono: ${cliente.telefono || '-'}</p>
            <p>📧 Email: ${cliente.contacto_email || cliente.email || '-'}</p>
            <p>👤 Contacto: ${cliente.contacto_nombre || '-'}</p>
            <p>📱 WhatsApp: ${cliente.whatsapp_contacto || '-'}</p>
            ${cliente.iban ? `<p>🏦 IBAN: ${cliente.iban}</p>` : ''}
            ${cliente.banco ? `<p>🏦 Banco: ${cliente.banco}</p>` : ''}
            <p>🏷️ Plan: ${cliente.plan || 'BASICO'}</p>
            <p>📅 Fecha de alta: ${formatDate(cliente.created_at)}</p>
            ${cliente.fecha_inicio_actividad ? `<p>📅 Inicio actividad: ${formatDate(cliente.fecha_inicio_actividad)}</p>` : ''}
            <p>✅ Estado: ${cliente.activo ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>'}</p>
            <p>📜 RGPD: ${cliente.consentimiento ? '<span class="badge badge-activo">Consentimiento aceptado</span>' : '<span class="badge badge-inactivo">Pendiente</span>'}</p>
        </div>
    `
}

// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

/**
 * Abre el modal de visualización de cliente
 * @param {Object} cliente - Datos del cliente a visualizar
 */
export async function abrirModalVerCliente(cliente) {
    mostrarModalCarga('Cargando datos del cliente...')
    
    try {
        // Cargar template
        const cargado = await cargarTemplate()
        if (!cargado) {
            cerrarModalCarga()
            return
        }
        
        // Cambiar título del modal
        const header = document.getElementById('modalVerClienteHeader')
        if (header) header.innerHTML = `📋 Detalle del cliente: ${cliente.nombre_empresa || 'Sin nombre'}`
        
        // Obtener historial de consentimientos
        const consentimientos = await obtenerHistorialConsentimientos(cliente.perfil_id)
        
        // Generar HTML del detalle
        const detalleHtml = generarDetalleHtml(cliente)
        
        // Generar HTML del historial
        const historialHtml = `
            <div class="detalle-info">
                <strong>📜 Histórico de consentimientos RGPD</strong>
                <div style="margin-top: 12px;">
                    ${generarHistorialHtml(consentimientos)}
                </div>
            </div>
        `
        
        // Insertar en el DOM
        const detalleContainer = document.getElementById('detalleCliente')
        const historicoContainer = document.getElementById('historicoConsentimientos')
        
        if (detalleContainer) detalleContainer.innerHTML = detalleHtml
        if (historicoContainer) historicoContainer.innerHTML = historialHtml
        
        // Configurar botón cerrar
        const btnCerrar = document.getElementById('btnCerrarDetalle')
        if (btnCerrar) {
            const nuevoBtnCerrar = btnCerrar.cloneNode(true)
            btnCerrar.parentNode.replaceChild(nuevoBtnCerrar, btnCerrar)
            nuevoBtnCerrar.onclick = () => cerrarModal('modalVerCliente')
        }
        
        cerrarModalCarga()
        abrirModal('modalVerCliente')
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error en abrirModalVerCliente:', error)
        mostrarModalInformativo('Error', 'No se pudieron cargar los datos del cliente', 'error')
    }
}

/**
 * Abre el modal de visualización solo con datos básicos (versión rápida)
 * @param {Object} cliente - Datos básicos del cliente
 */
export function abrirModalVerClienteSimple(cliente) {
    const modalVer = document.getElementById('modalVerCliente')
    const detalleContainer = document.getElementById('detalleCliente')
    
    if (!modalVer || !detalleContainer) {
        console.error('Modal o contenedor no encontrado')
        return
    }
    
    const html = `
        <div class="detalle-info">
            <p><strong>🏢 ${cliente.nombre_empresa || '-'}</strong></p>
            <p>📋 NIF/CIF: ${cliente.nif_cif || '-'}</p>
            <p>📧 Email: ${cliente.email || '-'}</p>
            <p>📞 Teléfono: ${cliente.telefono || '-'}</p>
            <p>🏷️ Plan: ${cliente.plan || 'BASICO'}</p>
            <p>✅ Estado: ${cliente.activo ? 'Activo' : 'Inactivo'}</p>
        </div>
        <div class="detalle-info">
            <strong>📜 Consentimiento RGPD</strong>
            <p>${cliente.consentimiento ? '✅ Consentimiento aceptado' : '❌ Pendiente de aceptación'}</p>
        </div>
    `
    
    detalleContainer.innerHTML = html
    abrirModal('modalVerCliente')
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
    abrirModalVerCliente,
    abrirModalVerClienteSimple
}