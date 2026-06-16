// cliente/js/modules/incidencias.js
// Gestión de incidencias reportadas por clientes

import { sb } from '../config/supabase.js'
import { formatearFecha, escapeHtml, mostrarMensaje } from './utils.js'

// ============================================================
// CARGAR INCIDENCIAS DEL CLIENTE
// ============================================================

export async function cargarIncidencias(clienteId) {
    if (!clienteId) return []
    
    try {
        const { data, error } = await sb
            .from('incidencias_clientes')
            .select(`
                *,
                activos(id, nombre)
            `)
            .eq('cliente_id', clienteId)
            .order('creada_en', { ascending: false })
        
        if (error) throw error
        return data || []
        
    } catch (error) {
        console.error('Error cargando incidencias:', error)
        return []
    }
}

// ============================================================
// CREAR NUEVA INCIDENCIA
// ============================================================

export async function crearIncidencia(datos) {
    const { clienteId, activoId, titulo, descripcion } = datos
    
    if (!clienteId || !titulo || !descripcion) {
        mostrarMensaje('Faltan datos obligatorios', 'error')
        return false
    }
    
    try {
        const { error } = await sb
            .from('incidencias_clientes')
            .insert({
                cliente_id: clienteId,
                activo_id: activoId || null,
                titulo: titulo,
                descripcion: descripcion,
                estado: 'pendiente'
            })
        
        if (error) throw error
        
        mostrarMensaje('✅ Incidencia reportada correctamente', 'exito')
        return true
        
    } catch (error) {
        console.error('Error creando incidencia:', error)
        mostrarMensaje('Error al reportar incidencia', 'error')
        return false
    }
}

// ============================================================
// RENDERIZAR LISTA DE INCIDENCIAS
// ============================================================

export function renderizarListaIncidencias(incidencias) {
    if (!incidencias || incidencias.length === 0) {
        return '<div class="text-center" style="padding:40px;">📭 No hay incidencias reportadas</div>'
    }
    
    let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Estado</th><th>Fecha</th><th>Activo</th><th>Título</th><th>Descripción</th><th>Resolución</th></tr></thead><tbody>`
    
    for (const incidencia of incidencias) {
        const estadoClass = incidencia.estado === 'resuelta' ? 'badge-resuelta' : 'badge-pendiente'
        const estadoTexto = incidencia.estado === 'resuelta' ? '✅ Resuelta' : '⏳ Pendiente'
        const activoNombre = incidencia.activos?.nombre || 'General'
        
        html += `
            <tr>
                <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                <td>${formatearFecha(incidencia.creada_en)}</td>
                <td>${escapeHtml(activoNombre)}</span></div></td>
                <td><strong>${escapeHtml(incidencia.titulo)}</strong></td>
                <td><small>${escapeHtml(incidencia.descripcion?.substring(0, 100))}${incidencia.descripcion?.length > 100 ? '...' : ''}</small></td>
                <td><small>${incidencia.comentario_resolucion ? escapeHtml(incidencia.comentario_resolucion.substring(0, 80)) : '-'}</small></td>
            </tr>
        `
    }
    
    html += `</tbody></table></div>`
    return html
}

// ============================================================
// OBTENER INCIDENCIA POR ID
// ============================================================

export async function getIncidenciaById(incidenciaId) {
    if (!incidenciaId) return null
    
    try {
        const { data, error } = await sb
            .from('incidencias_clientes')
            .select('*')
            .eq('id', incidenciaId)
            .single()
        
        if (error) throw error
        return data
        
    } catch (error) {
        console.error('Error obteniendo incidencia:', error)
        return null
    }
}

export default {
    cargarIncidencias,
    crearIncidencia,
    renderizarListaIncidencias,
    getIncidenciaById
}