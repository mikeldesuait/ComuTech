// cliente/js/modules/tablon.js
// Tablón de tareas recientes para el cliente

import { sb } from '../config/supabase.js'
import { formatearFecha, escapeHtml } from './utils.js'

// ============================================================
// CARGAR TAREAS RECIENTES PARA EL TABLÓN
// ============================================================

export async function cargarTareasRecientes(empresaId) {
    if (!empresaId) return []
    
    try {
        // Obtener tareas completadas recientes (últimos 30 días)
        const fechaLimite = new Date()
        fechaLimite.setDate(fechaLimite.getDate() - 30)
        
        const { data, error } = await sb
            .from('tareas')
            .select(`
                *,
                activos(id, nombre),
                perfiles!perfil_id(id, nombre_razon_social)
            `)
            .eq('empresa_id', empresaId)
            .eq('estado', 'completada')
            .gte('completada_en', fechaLimite.toISOString())
            .order('completada_en', { ascending: false })
            .limit(20)
        
        if (error) throw error
        
        // Enriquecer con mediciones si existen
        const tareasConMediciones = []
        for (const tarea of (data || [])) {
            const { data: mediciones } = await sb
                .from('mediciones_dinamicas')
                .select('*')
                .eq('tarea_id', tarea.id)
                .eq('publica', true)
                .order('created_at', { ascending: false })
                .limit(1)
            
            tareasConMediciones.push({
                ...tarea,
                ultimaMedicion: mediciones?.[0] || null
            })
        }
        
        return tareasConMediciones
        
    } catch (error) {
        console.error('Error cargando tareas recientes:', error)
        return []
    }
}

// ============================================================
// RENDERIZAR LISTA DEL TABLÓN
// ============================================================

export function renderizarListaTablón(tareas) {
    if (!tareas || tareas.length === 0) {
        return `<div class="container"><div class="card"><div class="card-header">📋 Tablón</div><div class="text-center" style="padding:40px;">📭 No hay novedades recientes</div></div></div>`
    }
    
    let html = `<div class="container"><div class="card"><div class="card-header">📋 Novedades recientes</div>`
    
    for (const tarea of tareas) {
        const fecha = formatearFecha(tarea.completada_en || tarea.fecha_asignacion)
        const tecnicoNombre = tarea.perfiles?.nombre_razon_social || 'Técnico'
        const activoNombre = tarea.activos?.nombre || 'Sin activo'
        
        // Mostrar mediciones si existen
        let medicionesHtml = ''
        if (tarea.ultimaMedicion) {
            const params = tarea.ultimaMedicion.parametros
            medicionesHtml = `<div class="tarea-mediciones">`
            
            if (params.cloro) medicionesHtml += `<span>🧪 Cloro: ${params.cloro} ppm</span> | `
            if (params.ph) medicionesHtml += `<span>🧪 pH: ${params.ph}</span> | `
            if (params.temperatura) medicionesHtml += `<span>🌡️ Temperatura: ${params.temperatura}°C</span> | `
            if (params.altura) medicionesHtml += `<span>📏 Altura césped: ${params.altura} cm</span>`
            
            medicionesHtml = medicionesHtml.replace(/ \| $/, '')
            medicionesHtml += `</div>`
        }
        
        // Mostrar comentario público
        let comentarioHtml = ''
        if (tarea.nota_cliente) {
            comentarioHtml = `<div class="tarea-comentario">📝 ${escapeHtml(tarea.nota_cliente)}</div>`
        }
        
        html += `
            <div class="tarea-card completada">
                <div class="tarea-fecha">📅 ${fecha} | 👨‍🔧 ${escapeHtml(tecnicoNombre)}</div>
                <div class="tarea-titulo">🏗️ ${escapeHtml(activoNombre)} - ${escapeHtml(tarea.titulo)}</div>
                <div class="tarea-descripcion">${escapeHtml(tarea.descripcion || 'Sin descripción')}</div>
                ${medicionesHtml}
                ${comentarioHtml}
            </div>
        `
    }
    
    html += `</div></div>`
    return html
}

export default {
    cargarTareasRecientes,
    renderizarListaTablón
}