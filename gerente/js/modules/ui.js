// gerente/js/modules/ui.js
// Funciones de renderizado de interfaz para el panel gerente

import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion, mostrarModalInformativo } from './utils.js'

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
// RENDERIZADO DE TAREAS (UI específica)
// ============================================================

export function renderizarListaTareas(tareas, onVerDetalle, onAsignar) {
    if (!tareas || tareas.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                📭 No hay tareas creadas
                <br><br>
                <button class="btn-success" id="btnCrearTareaLista">➕ Crear primera tarea</button>
            </div>
        `
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nº Tarea</th>
                        <th>Título</th>
                        <th>Cliente</th>
                        <th>Técnico</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const tarea of tareas) {
        const tecnicoNombre = tarea.perfiles?.nombre_razon_social || 'Sin asignar'
        const clienteNombre = tarea.empresas?.nombre_empresa || '-'
        
        const prioridadClass = tarea.prioridad === 'urgente' ? 'badge-inactivo' : (tarea.prioridad === 'alta' ? 'badge-pendiente' : 'badge-activo')
        const estadoClass = tarea.estado === 'completada' ? 'badge-activo' : (tarea.estado === 'cancelada' ? 'badge-inactivo' : 'badge-pendiente')
        
        html += `
            <tr>
                <td><strong>${escapeHtml(tarea.numero_tarea)}</strong></td>
                <td>${escapeHtml(tarea.titulo)}</td>
                <td>${escapeHtml(clienteNombre)}</td>
                <td>${escapeHtml(tecnicoNombre)}</td>
                <td><span class="badge ${prioridadClass}">${tarea.prioridad || 'media'}</span></td>
                <td><span class="badge ${estadoClass}">${tarea.estado || 'pendiente'}</span></td>
                <td>${formatearFecha(tarea.fecha_asignacion || tarea.created_at)}</td>
                <td>
                    <button class="btn-sm ver-tarea" data-id="${tarea.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                    ${tarea.estado === 'pendiente' || tarea.estado === 'cancelada' ? 
                        `<button class="btn-sm asignar-tarea" data-id="${tarea.id}" style="background:#e67e22; color:white;">🔄 Asignar</button>` : ''}
                 </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnCrearTareaLista">➕ Nueva tarea</button>
        </div>
    `
    
    return html
}

export function renderizarFormularioCrearTarea(clientes, tecnicos) {
    const clientesOptions = clientes.map(c => 
        `<option value="${c.id}" data-nif="${escapeHtml(c.nif_cif || '')}" data-nombre="${escapeHtml(c.nombre_empresa)}">${escapeHtml(c.nombre_empresa)}</option>`
    ).join('')
    
    const tecnicosOptions = `
        <option value="">-- Sin asignar --</option>
        ${tecnicos.map(t => 
            `<option value="${t.id}">${escapeHtml(t.nombre_razon_social)}</option>`
        ).join('')}
    `
    
    return `
        <div class="card">
            <div class="card-header">➕ Crear nueva tarea</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>🏢 Cliente *</label>
                    <select id="tareaCliente">
                        <option value="">-- Seleccionar cliente --</option>
                        ${clientesOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>🏗️ Activo</label>
                    <select id="tareaActivo">
                        <option value="">-- Seleccionar activo --</option>
                    </select>
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>👨‍🔧 Técnico</label>
                    <select id="tareaTecnico">
                        ${tecnicosOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>⭐ Prioridad</label>
                    <select id="tareaPrioridad">
                        <option value="baja">🟢 Baja</option>
                        <option value="media" selected>🟡 Media</option>
                        <option value="alta">🔴 Alta</option>
                        <option value="urgente">🔥 Urgente</option>
                    </select>
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📝 Título *</label>
                    <input type="text" id="tareaTitulo" placeholder="Ej: Revisión de piscina">
                </div>
                <div class="grupo">
                    <label>📅 Fecha límite</label>
                    <input type="date" id="tareaFechaLimite">
                </div>
            </div>
            
            <div class="grupo">
                <label>📄 Descripción</label>
                <textarea id="tareaDescripcion" rows="3" placeholder="Descripción detallada de la tarea..."></textarea>
            </div>
            
            <div class="grupo">
                <label>📋 Orden de trabajo</label>
                <textarea id="tareaOrdenTrabajo" rows="4" placeholder="Instrucciones detalladas para el técnico..."></textarea>
            </div>
            
            <div class="btn-group" style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="btnGuardarTarea" class="btn-success">💾 Guardar tarea</button>
                <button id="btnCancelarTarea" class="btn-danger">✖ Cancelar</button>
            </div>
        </div>
    `
}

export function renderizarModalAsignarTarea(tarea, tecnicos) {
    const tecnicosOptions = tecnicos.map(t => 
        `<option value="${t.id}">${escapeHtml(t.nombre_razon_social)} (${escapeHtml(t.email)})</option>`
    ).join('')
    
    return `
        <div class="form-group">
            <label>📋 Tarea: ${escapeHtml(tarea.titulo)}</label>
        </div>
        <div class="form-group">
            <label>👨‍🔧 Seleccionar técnico</label>
            <select id="asignarTecnico" style="width:100%; padding:12px; border-radius:12px;">
                <option value="">-- Seleccionar --</option>
                ${tecnicosOptions}
            </select>
        </div>
        <div class="form-group">
            <label>📝 Motivo de reasignación</label>
            <textarea id="asignarMotivo" rows="2" placeholder="Motivo del cambio de asignación..."></textarea>
        </div>
    `
}

// ============================================================
// RENDERIZADO DE PERSONAL
// ============================================================

export function renderizarListaTecnicos(tecnicos, tipo, onEditar, onEliminar) {
    if (!tecnicos || tecnicos.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                👨‍🔧 No hay técnicos ${tipo === 'interno' ? 'internos' : 'externos'}
                <br><br>
                <button class="btn-success" id="btnAgregarTecnico">➕ Agregar técnico</button>
            </div>
        `
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Especialidad</th>
                        ${tipo === 'interno' ? '<th>€/hora</th>' : ''}
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const t of tecnicos) {
        html += `
            <tr>
                <td>${escapeHtml(t.nombre)}</td>
                <td>${escapeHtml(t.email)}</td>
                <td>${escapeHtml(t.telefono || '-')}</td>
                <td>${escapeHtml(t.especialidad || '-')}</td>
                ${tipo === 'interno' ? `<td>${formatMoney(t.salario_hora || 0)}€</td>` : ''}
                <td>${t.activo ? '<span class="badge badge-activo">✅ Activo</span>' : '<span class="badge badge-inactivo">❌ Inactivo</span>'}</td>
                <td>
                    <button class="btn-sm editar-tecnico" data-id="${t.id}" style="background:#e67e22; color:white;">✏️ Editar</button>
                    <button class="btn-sm eliminar-tecnico" data-id="${t.id}" style="background:#dc2626; color:white;">🗑️ Eliminar</button>
                 </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnAgregarTecnico">➕ Agregar técnico</button>
        </div>
    `
    
    return html
}

export function renderizarListaVacaciones(vacaciones, tecnicos, onAprobar) {
    if (!vacaciones || vacaciones.length === 0) {
        return `<div class="text-center" style="padding: 40px; color: var(--ios-gray);">🌴 No hay solicitudes de vacaciones</div>`
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Técnico</th>
                        <th>Fecha inicio</th>
                        <th>Fecha fin</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const v of vacaciones) {
        const tecnico = tecnicos.find(t => t.id === v.tecnico_id)
        html += `
            <tr>
                <td>${escapeHtml(tecnico?.nombre || '-')}</td>
                <td>${formatearFecha(v.fecha_inicio)}</td>
                <td>${formatearFecha(v.fecha_fin)}</td>
                <td>${v.estado === 'pendiente' ? '<span class="badge badge-pendiente">⏳ Pendiente</span>' : (v.estado === 'aprobada' ? '<span class="badge badge-activo">✅ Aprobada</span>' : '<span class="badge badge-inactivo">❌ Rechazada</span>')}</td>
                <td>
                    ${v.estado === 'pendiente' ? `
                        <button class="btn-sm aprobar-vacacion" data-id="${v.id}" data-estado="aprobada" style="background:#2c7a4d; color:white;">✅ Aprobar</button>
                        <button class="btn-sm rechazar-vacacion" data-id="${v.id}" data-estado="rechazada" style="background:#dc2626; color:white;">❌ Rechazar</button>
                    ` : '-'}
                 </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `
    
    return html
}

export function renderizarListaAusencias(ausencias, tecnicos) {
    if (!ausencias || ausencias.length === 0) {
        return `<div class="text-center" style="padding: 40px; color: var(--ios-gray);">⚠️ No hay ausencias registradas</div>`
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Técnico</th>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Motivo</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const a of ausencias) {
        const tecnico = tecnicos.find(t => t.id === a.tecnico_id)
        const tipoTexto = {
            'baja_medica': '🏥 Baja médica',
            'permiso': '📋 Permiso',
            'formacion': '📚 Formación',
            'otros': '📌 Otros'
        }[a.tipo] || a.tipo
        
        html += `
            <tr>
                <td>${escapeHtml(tecnico?.nombre || '-')}</td>
                <td>${formatearFecha(a.fecha)}</td>
                <td>${tipoTexto}</td>
                <td>${escapeHtml(a.motivo || '-')}</td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `
    
    return html
}