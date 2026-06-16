// cliente/js/modules/ui.js
// Funciones de renderizado de interfaz para el panel cliente

import { formatearFecha, escapeHtml, formatMoney } from './utils.js'

// ============================================================
// MODALES GENÉRICOS
// ============================================================

export function mostrarModal(titulo, contenido, onConfirmar, onCancelar, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar') {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.style.display = 'flex'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h3>${titulo}</h3>
            <div style="margin: 16px 0;">
                ${contenido}
            </div>
            <div class="modal-buttons">
                <button id="modalConfirmarBtn" class="btn-aceptar">${textoConfirmar}</button>
                <button id="modalCancelarBtn" class="btn-cancelar">${textoCancelar}</button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('modalConfirmarBtn').onclick = () => {
        modal.remove()
        if (onConfirmar) onConfirmar()
    }
    
    document.getElementById('modalCancelarBtn').onclick = () => {
        modal.remove()
        if (onCancelar) onCancelar()
    }
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove()
            if (onCancelar) onCancelar()
        }
    }
}

// ============================================================
// RENDERIZADO DE TARJETA DE TAREA (para tablón)
// ============================================================

export function renderizarTareaCard(tarea) {
    const fecha = formatearFecha(tarea.completada_en || tarea.fecha_asignacion)
    const tecnicoNombre = tarea.perfiles?.nombre_razon_social || 'Técnico'
    const activoNombre = tarea.activos?.nombre || 'Sin activo'
    
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
    
    let comentarioHtml = ''
    if (tarea.nota_cliente) {
        comentarioHtml = `<div class="tarea-comentario">📝 ${escapeHtml(tarea.nota_cliente)}</div>`
    }
    
    return `
        <div class="tarea-card completada">
            <div class="tarea-fecha">📅 ${fecha} | 👨‍🔧 ${escapeHtml(tecnicoNombre)}</div>
            <div class="tarea-titulo">🏗️ ${escapeHtml(activoNombre)} - ${escapeHtml(tarea.titulo)}</div>
            <div class="tarea-descripcion">${escapeHtml(tarea.descripcion || 'Sin descripción')}</div>
            ${medicionesHtml}
            ${comentarioHtml}
        </div>
    `
}

// ============================================================
// RENDERIZADO DE TARJETA DE INCIDENCIA
// ============================================================

export function renderizarIncidenciaCard(incidencia) {
    const estadoClass = incidencia.estado === 'resuelta' ? 'badge-resuelta' : 'badge-pendiente'
    const estadoTexto = incidencia.estado === 'resuelta' ? '✅ Resuelta' : '⏳ Pendiente'
    const activoNombre = incidencia.activos?.nombre || 'General'
    
    return `
        <div class="card" style="margin-bottom: 12px;">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span><span class="badge ${estadoClass}">${estadoTexto}</span> <strong>${escapeHtml(incidencia.titulo)}</strong></span>
                <small>${formatearFecha(incidencia.creada_en)}</small>
            </div>
            <div><small>📍 ${escapeHtml(activoNombre)}</small></div>
            <div style="margin-top: 8px;">${escapeHtml(incidencia.descripcion)}</div>
            ${incidencia.comentario_resolucion ? `<div style="margin-top: 8px; background: #f0fdf4; padding: 8px; border-radius: 8px;"><small>🔧 Resolución: ${escapeHtml(incidencia.comentario_resolucion)}</small></div>` : ''}
        </div>
    `
}

// ============================================================
// RENDERIZADO DE CARD DE ACTIVO
// ============================================================

export function renderizarActivoCard(activo) {
    return `
        <div class="card" style="margin-bottom: 12px;">
            <div class="card-header">
                🏗️ ${escapeHtml(activo.nombre)}
            </div>
            <div>📍 ${escapeHtml(activo.direccion || 'Sin dirección')}</div>
            <div>🏙️ ${escapeHtml(activo.localidad || 'Sin localidad')}</div>
            ${activo.instrucciones_acceso ? `<div style="margin-top: 8px;"><small>📝 Acceso: ${escapeHtml(activo.instrucciones_acceso)}</small></div>` : ''}
        </div>
    `
}

// ============================================================
// RENDERIZADO DE FILTROS
// ============================================================

export function renderizarFiltrosBusqueda() {
    return `
        <div class="filtros-bar" style="margin-bottom: 16px;">
            <input type="text" id="filtroBuscar" placeholder="🔍 Buscar..." class="btn-sm" style="flex: 2;">
            <button id="btnFiltrar" class="btn-info btn-sm">Filtrar</button>
            <button id="btnLimpiarFiltros" class="btn-warning btn-sm">Limpiar</button>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE PAGINACIÓN
// ============================================================

export function renderizarPaginacion(paginaActual, totalPaginas, onCambioPagina) {
    if (totalPaginas <= 1) return ''
    
    let html = `<div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">`
    
    // Botón anterior
    if (paginaActual > 1) {
        html += `<button class="btn-sm" data-pagina="${paginaActual - 1}">◀ Anterior</button>`
    }
    
    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === paginaActual) {
            html += `<button class="btn-sm active" style="background: #2c7a4d; color: white;">${i}</button>`
        } else {
            html += `<button class="btn-sm" data-pagina="${i}">${i}</button>`
        }
    }
    
    // Botón siguiente
    if (paginaActual < totalPaginas) {
        html += `<button class="btn-sm" data-pagina="${paginaActual + 1}">Siguiente ▶</button>`
    }
    
    html += `</div>`
    return html
}

export default {
    mostrarModal,
    renderizarTareaCard,
    renderizarIncidenciaCard,
    renderizarActivoCard,
    renderizarFiltrosBusqueda,
    renderizarPaginacion
}