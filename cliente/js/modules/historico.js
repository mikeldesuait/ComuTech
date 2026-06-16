// cliente/js/modules/historico.js
// Histórico de tareas completadas

import { sb } from '../config/supabase.js'
import { formatearFecha, escapeHtml } from './utils.js'

// ============================================================
// CARGAR HISTÓRICO DE TAREAS COMPLETADAS (por empresa_id)
// ============================================================

export async function cargarHistorico(empresaId) {
    if (!empresaId) return []
    
    try {
        // Obtener tareas completadas (más antiguas de 30 días)
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
            .lt('completada_en', fechaLimite.toISOString())
            .order('completada_en', { ascending: false })
        
        if (error) throw error
        
        // Enriquecer con mediciones si existen
        const tareasConMediciones = []
        for (const tarea of (data || [])) {
            const { data: mediciones } = await sb
                .from('mediciones_dinamicas')
                .select('*')
                .eq('tarea_id', tarea.id)
                .order('created_at', { ascending: false })
                .limit(1)
            
            tareasConMediciones.push({
                ...tarea,
                ultimaMedicion: mediciones?.[0] || null
            })
        }
        
        return tareasConMediciones
        
    } catch (error) {
        console.error('Error cargando histórico:', error)
        return []
    }
}

// ============================================================
// RENDERIZAR LISTA DEL HISTÓRICO
// ============================================================

export function renderizarListaHistorico(tareas) {
    if (!tareas || tareas.length === 0) {
        return `<div class="container"><div class="card"><div class="card-header">📜 Histórico</div><div class="text-center" style="padding:40px;">📭 No hay tareas en el histórico</div></div></div>`
    }
    
    let html = `<div class="container"><div class="card"><div class="card-header">📜 Histórico de trabajos realizados</div>`
    
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

// ============================================================
// BUSCAR EN HISTÓRICO
// ============================================================

export function filtrarHistorico(tareas, textoBusqueda) {
    if (!textoBusqueda || textoBusqueda.trim() === '') return tareas
    
    const busqueda = textoBusqueda.toLowerCase()
    return tareas.filter(tarea => 
        tarea.titulo?.toLowerCase().includes(busqueda) ||
        tarea.descripcion?.toLowerCase().includes(busqueda) ||
        tarea.activos?.nombre?.toLowerCase().includes(busqueda) ||
        tarea.nota_cliente?.toLowerCase().includes(busqueda)
    )
}

export default {
    cargarHistorico,
    renderizarListaHistorico,
    filtrarHistorico
}