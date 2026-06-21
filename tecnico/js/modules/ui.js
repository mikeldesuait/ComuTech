// tecnico/js/modules/ui.js
import { formatearFecha, escapeHtml, getEstadoBadge, getPrioridadBadge, getEstadoLabel } from '../utils/utils.js'
import { getBotonInteligente } from './tareas.js'

// tecnico/js/modules/ui.js - renderizarTablaTareas CON BOTÓN VER ORDEN

export function renderizarTablaTareas(tareas, tipo, onAccion) {
    if (!tareas || tareas.length === 0) {
        return `<div class="text-center" style="padding: 40px; color: var(--ios-gray);">📭 No hay tareas ${tipo === 'pendientes' ? 'pendientes' : tipo === 'activas' ? 'activas' : 'completadas'}</div>`
    }
    
    let html = `<div style="overflow-x: auto;"><table class="data-table"><thead><tr>
        <th>Nº Tarea</th><th>Título</th><th>Cliente / Activo</th><th>Técnico</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
    </tr></thead><tbody>`
    
    for (const tarea of tareas) {
        const boton = getBotonInteligente(tarea)
        const clienteNombre = tarea.empresas?.nombre_empresa || tarea.cliente?.nombre || '-'
        const activoNombre = tarea.activos?.nombre || ''
        const tecnicoNombre = tarea.perfiles?.nombre_razon_social || 'Sin asignar'
        const fechaLimite = tarea.fecha_fin_prevista || tarea.fecha_asignacion || tarea.created_at
        
        // ✅ Botón principal (acción según estado)
        let botonesHtml = `<button class="btn-sm btn-accion-tarea" data-id="${tarea.id}" data-accion="${boton.accion}" style="background:#2c7a4d; color:white; border:none; padding:6px 14px; border-radius:30px; font-size:13px; cursor:pointer;">${boton.texto}</button>`
        
        // ✅ Botón "Ver orden" SIEMPRE visible
        botonesHtml += ` <button class="btn-sm btn-accion-tarea" data-id="${tarea.id}" data-accion="ver_orden" style="background:#6b21a5; color:white; border:none; padding:6px 14px; border-radius:30px; font-size:13px; cursor:pointer;">📄 Ver orden</button>`
        
        html += `<tr>
            <td><strong>${escapeHtml(tarea.numero_tarea)}</strong></td>
            <td>${escapeHtml(tarea.titulo)}</td>
            <td>${escapeHtml(clienteNombre)}${activoNombre ? `<br><small style="color:var(--ios-gray);">🏗️ ${escapeHtml(activoNombre)}</small>` : ''}</td>
            <td>${escapeHtml(tecnicoNombre)}</td>
            <td>${getPrioridadBadge(tarea.prioridad)}</td>
            <td>${getEstadoBadge(tarea.estado)}</td>
            <td style="font-size:12px;">${formatearFecha(fechaLimite)}</td>
            <td>${botonesHtml}</td>
        </tr>`
    }
    
    html += `</tbody></table></div>`
    return html
}

export function renderizarFiltrosTareas() {
    return `<div class="filtros-bar">
        <input type="text" id="buscarTarea" placeholder="🔍 Buscar por título, número, cliente, técnico, dirección..." style="flex:3; min-width:200px;">
        <select id="filtroEstado"><option value="todos">Todos los estados</option>
            <option value="pendiente_aceptacion">⏳ Pendiente aceptación</option>
            <option value="vista">👁️ Vista</option>
            <option value="aceptada">✅ Aceptada</option>
            <option value="rechazada">❌ Rechazada</option>
            <option value="en_desplazamiento">🚗 En desplazamiento</option>
            <option value="trabajando_onsite">🔧 Trabajando OnSite</option>
            <option value="terminada">✅ Terminada</option>
            <option value="suspendida">⏸️ Suspendida</option>
            <option value="cancelada">❌ Cancelada</option>
        </select>
        <select id="filtroPrioridad"><option value="todos">Todas las prioridades</option>
            <option value="baja">🟢 Baja</option><option value="media">🟡 Media</option>
            <option value="alta">🔴 Alta</option><option value="urgente">🔥 Urgente</option>
        </select>
        <button id="btnLimpiarFiltros" class="btn-sm" style="background:#6b7280; color:white;">🗑️ Limpiar</button>
    </div>`
}

export function renderizarSubPestanas(activa) {
    const tabs = [
        { id: 'todas', label: '📋 Todas' },
        { id: 'pendientes', label: '⏳ Pendientes' },
        { id: 'activas', label: '▶️ Activas' },
        { id: 'completadas', label: '🏁 Completadas' }
    ]
    return `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">${tabs.map(t => `<button class="btn-sm sub-tab ${t.id === activa ? 'btn-success' : 'btn-info'}" data-subtab="${t.id}" style="${t.id === activa ? 'background:#2c7a4d; color:white;' : 'background:#e2e8f0;'}">${t.label}</button>`).join('')}</div>`
}

export function mostrarModalAceptarTarea(ordenTrabajo, onAceptar, onRechazar, onVolver) {
    const modal = document.getElementById('modalAceptarTarea')
    if (!modal) return
    const ordenDiv = document.getElementById('modalOrdenTrabajo')
    if (ordenDiv) {
        const contenido = ordenTrabajo || '📋 No hay instrucciones específicas para esta tarea.'
        const esHtml = contenido.includes('<div') || contenido.includes('<h') || contenido.includes('<ul')
        if (esHtml) { ordenDiv.innerHTML = contenido; ordenDiv.style.whiteSpace = 'normal' }
        else { ordenDiv.textContent = contenido; ordenDiv.style.whiteSpace = 'pre-wrap' }
    }
    const fechaInput = document.getElementById('modalFechaPropuesta')
    if (fechaInput) { const f = new Date(); f.setDate(f.getDate() + 7); fechaInput.value = f.toISOString().split('T')[0] }
    const horaInput = document.getElementById('modalHoraPropuesta')
    if (horaInput) horaInput.value = '10:00'
    modal.style.display = 'flex'
    document.getElementById('btnConfirmarAceptar').onclick = () => {
        const fecha = document.getElementById('modalFechaPropuesta').value; const hora = document.getElementById('modalHoraPropuesta').value
        if (!fecha || !hora) { alert('Completa fecha y hora propuesta'); return }
        modal.style.display = 'none'; onAceptar(fecha, hora)
    }
    document.getElementById('btnRechazarTarea').onclick = () => {
        const motivo = prompt('Motivo del rechazo:')
        if (motivo && motivo.trim() !== '') { modal.style.display = 'none'; onRechazar(motivo) }
        else alert('Debes indicar un motivo')
    }
    document.getElementById('btnVolverAceptar').onclick = () => { modal.style.display = 'none'; if (onVolver) onVolver() }
}

export function mostrarModalDetalleTarea(contenido) {
    const modal = document.getElementById('modalDetalleTarea')
    if (!modal) return
    document.getElementById('detalleTareaContent').innerHTML = contenido
    modal.style.display = 'flex'
    document.getElementById('btnCerrarDetalle').onclick = () => modal.style.display = 'none'
}

export function mostrarModalOrdenTrabajo(ordenTrabajo) {
    const modal = document.getElementById('modalVerOrden')
    if (!modal) return
    document.getElementById('ordenTrabajoContent').innerHTML = ordenTrabajo || 'Sin instrucciones'
    modal.style.display = 'flex'
    document.getElementById('btnCerrarOrden').onclick = () => modal.style.display = 'none'
}

export function mostrarModalAlbaran(totalMateriales, onGuardar, onCancelar) {
    const modal = document.getElementById('modalAlbaran')
    if (!modal) return
    document.getElementById('albaranMateriales').value = totalMateriales.toFixed(2)
    const actualizarTotal = () => {
        const horas = parseFloat(document.getElementById('albaranHoras')?.value) || 0
        const precioHora = parseFloat(document.getElementById('albaranPrecioHora')?.value) || 0
        const materiales = parseFloat(document.getElementById('albaranMateriales')?.value) || 0
        const dietas = parseFloat(document.getElementById('albaranDietas')?.value) || 0
        document.getElementById('albaranTotal').value = ((horas * precioHora) + materiales + dietas).toFixed(2) + ' €'
    }
    ['albaranHoras', 'albaranPrecioHora', 'albaranDietas'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarTotal)
    })
    actualizarTotal()
    modal.style.display = 'flex'
    document.getElementById('btnAceptarAlbaran').onclick = () => {
        const horas = parseFloat(document.getElementById('albaranHoras')?.value) || 0
        const precioHora = parseFloat(document.getElementById('albaranPrecioHora')?.value) || 0
        const dietas = parseFloat(document.getElementById('albaranDietas')?.value) || 0
        const total = (horas * precioHora) + totalMateriales + dietas
        modal.style.display = 'none'; onGuardar({ horas, precioHora, dietas, total })
    }
    document.getElementById('btnCancelarAlbaran').onclick = () => { modal.style.display = 'none'; onCancelar() }
}