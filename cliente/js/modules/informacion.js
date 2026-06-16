// cliente/js/modules/informacion.js
// Información del cliente y sus activos

import { sb } from '../config/supabase.js'
import { formatearFecha, escapeHtml } from './utils.js'

// ============================================================
// CARGAR ACTIVOS DEL CLIENTE
// ============================================================

export async function cargarActivos(clienteId) {
    if (!clienteId) return []
    
    try {
        const { data, error } = await sb
            .from('activos')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('nombre')
        
        if (error) throw error
        return data || []
        
    } catch (error) {
        console.error('Error cargando activos:', error)
        return []
    }
}

// ============================================================
// RENDERIZAR INFORMACIÓN DEL CLIENTE
// ============================================================

export function renderizarInformacionCliente(cliente) {
    if (!cliente) return '<div class="card">No hay información disponible</div>'
    
    return `
        <div class="card">
            <div class="card-header">ℹ️ Información de la comunidad</div>
            <div class="row-flex">
                <div class="grupo"><strong>🏢 Nombre:</strong> ${escapeHtml(cliente.nombre || '-')}</div>
                <div class="grupo"><strong>📋 NIF/CIF:</strong> ${escapeHtml(cliente.nif_cif || '-')}</div>
            </div>
            <div class="row-flex">
                <div class="grupo"><strong>📍 Dirección:</strong> ${escapeHtml(cliente.direccion || '-')}</div>
                <div class="grupo"><strong>📞 Teléfono:</strong> ${escapeHtml(cliente.telefono || '-')}</div>
            </div>
            <div class="row-flex">
                <div class="grupo"><strong>📧 Email:</strong> ${escapeHtml(cliente.email || '-')}</div>
                <div class="grupo"><strong>🔑 Código:</strong> <span class="badge badge-activo">${escapeHtml(cliente.codigo_acceso || '-')}</span></div>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZAR LISTA DE ACTIVOS
// ============================================================

export function renderizarListaActivos(activos) {
    if (!activos || activos.length === 0) {
        return '<div class="text-center" style="padding:20px;">No hay activos registrados</div>'
    }
    
    let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Nombre</th><th>Dirección</th><th>Localidad</th><th>Instrucciones</th></tr></thead><tbody>`
    
    for (const activo of activos) {
        html += `
            <tr>
                <td><strong>${escapeHtml(activo.nombre)}</strong></td>
                <td>${escapeHtml(activo.direccion || '-')}</td>
                <td>${escapeHtml(activo.localidad || '-')}</td>
                <td><small>${escapeHtml(activo.instrucciones_acceso || '-')}</small></td>
            </tr>
        `
    }
    
    html += `</tbody></table></div>`
    return html
}

// ============================================================
// OBTENER INFORMACIÓN DE UN ACTIVO ESPECÍFICO
// ============================================================

export async function getActivoById(activoId) {
    if (!activoId) return null
    
    try {
        const { data, error } = await sb
            .from('activos')
            .select('*')
            .eq('id', activoId)
            .single()
        
        if (error) throw error
        return data
        
    } catch (error) {
        console.error('Error obteniendo activo:', error)
        return null
    }
}

export default {
    cargarActivos,
    renderizarInformacionCliente,
    renderizarListaActivos,
    getActivoById
}