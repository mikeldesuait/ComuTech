// tecnico/js/modules/ui.js
// Renderizado de la interfaz de usuario (listas, pantallas, modales)

import { 
    getPrioridadClass, getTipoIcono, getTipoClass, 
    getEstadoClass, getEstadoTexto, formatearFecha,
    escapeHtml
} from './utils.js'

// ============================================================
// RENDERIZAR LISTA DE TAREAS (cards)
// ============================================================

export function renderizarListaTareas(tareas, tipo, onTareaClick) {
    if (!tareas || tareas.length === 0) {
        return `
            <div class="container">
                <div class="card-tarea text-center">
                    📭 No hay tareas ${tipo === 'nuevas' ? 'nuevas' : (tipo === 'activas' ? 'activas' : 'completadas')}
                </div>
            </div>
        `
    }
    
    let html = '<div class="container">'
    
    tareas.forEach(tarea => {
        const clienteNombre = tarea.empresas?.nombre_empresa || 'Cliente'
        const activoNombre = tarea.activos?.nombre || 'Sin activo'
        const direccion = tarea.activos?.direccion || ''
        
        let botonTexto = ''
        if (tipo === 'nuevas') {
            botonTexto = '👁️ Leer y aceptar'
        } else if (tarea.estado === 'ACEPTADA') {
            botonTexto = '🚗 Iniciar desplazamiento'
        } else if (tarea.estado === 'SUSPENDIDA') {
            botonTexto = '⏸️ Continuar (suspendida)'
        } else {
            botonTexto = '🔧 Continuar trabajo'
        }
        
        html += `
            <div class="card-tarea ${getPrioridadClass(tarea.prioridad)}" data-id="${tarea.id}">
                <div class="card-header-tarea">
                    <span class="badge ${getTipoClass(tarea.prioridad)}">
                        ${getTipoIcono(tarea.prioridad)} ${tarea.prioridad || 'MANTENIMIENTO'}
                    </span>
                    <span class="badge ${getEstadoClass(tarea.estado)}">
                        ${getEstadoTexto(tarea.estado)}
                    </span>
                </div>
                <div class="tarea-cliente">${escapeHtml(clienteNombre)}</div>
                <div class="tarea-direccion">${escapeHtml(activoNombre)} - ${escapeHtml(direccion)}</div>
                <div class="tarea-direccion">📅 Asignada: ${formatearFecha(tarea.fecha_asignacion)}</div>
                <button class="btn-leer" data-id="${tarea.id}" data-tipo="${tipo}">
                    ${botonTexto}
                </button>
            </div>
        `
    })
    
    html += '</div>'
    return html
}

// ============================================================
// RENDERIZAR LISTA DE TAREAS COMPLETADAS (con filtros)
// ============================================================

export function renderizarListaCompletadas(tareas, onVerDetalle) {
    if (!tareas || tareas.length === 0) {
        return `
            <div class="container">
                <div class="card-tarea text-center">
                    📭 No hay tareas completadas
                </div>
            </div>
        `
    }
    
    let html = '<div class="container">'
    
    tareas.forEach(tarea => {
        const clienteNombre = tarea.empresas?.nombre_empresa || 'Cliente'
        const activoNombre = tarea.activos?.nombre || 'Sin activo'
        const direccion = tarea.activos?.direccion || ''
        const fechaCompletada = tarea.completada_en?.split('T')[0] || tarea.fecha_asignacion
        
        html += `
            <div class="card-tarea ${getPrioridadClass(tarea.prioridad)}" data-id="${tarea.id}">
                <div class="card-header-tarea">
                    <span class="badge ${getTipoClass(tarea.prioridad)}">
                        ${getTipoIcono(tarea.prioridad)} ${tarea.prioridad || 'MANTENIMIENTO'}
                    </span>
                    <span class="badge ${getEstadoClass(tarea.estado)}">
                        ${getEstadoTexto(tarea.estado)}
                    </span>
                </div>
                <div class="tarea-cliente">${escapeHtml(clienteNombre)}</div>
                <div class="tarea-direccion">${escapeHtml(activoNombre)} - ${escapeHtml(direccion)}</div>
                <div class="tarea-direccion">📅 Completada: ${formatearFecha(fechaCompletada)}</div>
                <button class="btn-ver-detalle" data-id="${tarea.id}">
                    👁️ Ver detalle completo
                </button>
            </div>
        `
    })
    
    html += '</div>'
    return html
}

// ============================================================
// RENDERIZAR PERFIL DEL TÉCNICO
// ============================================================

export function renderizarPerfil(tecnicoNombre, tecnicoEmail, isExterno, onCerrarSesion) {
    return `
        <div class="container">
            <div class="card-tarea">
                <h3>👤 Mi perfil</h3>
                <p><strong>Nombre:</strong> ${escapeHtml(tecnicoNombre)}</p>
                <p><strong>Email:</strong> ${escapeHtml(tecnicoEmail)}</p>
                ${isExterno ? '<p><strong>Tipo:</strong> Técnico externo</p>' : ''}
                <hr>
                <button class="btn-leer" id="btnCerrarSesionPerfil">🚪 Cerrar sesión</button>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZAR FILTROS PARA COMPLETADAS
// ============================================================

export function renderizarFiltrosCompletadas() {
    return `
        <div class="filtros-bar">
            <div class="buscador-container">
                <input type="text" id="filtroBuscar" placeholder="🔍 Buscar (cliente, activo)" autocomplete="off">
            </div>
            <select id="filtroTipo">
                <option value="">Todos los tipos</option>
                <option value="URGENCIA">🔴 Urgencia</option>
                <option value="AVERIA">🟠 Avería</option>
                <option value="MANTENIMIENTO">🟢 Mantenimiento</option>
                <option value="REVISION">🔵 Revisión</option>
                <option value="PRESUPUESTO">🟡 Presupuesto</option>
            </select>
            <input type="date" id="filtroFechaDesde" placeholder="Desde">
            <input type="date" id="filtroFechaHasta" placeholder="Hasta">
            <button class="btn-filtrar" id="btnFiltrar">🔍 Filtrar</button>
            <button class="btn-filtrar" id="btnLimpiarFiltros" style="background:#64748b;">🗑️ Limpiar</button>
        </div>
    `
}

// ============================================================
// ACTUALIZAR CONTADORES EN HEADER
// ============================================================

export function actualizarContadores(nuevas, activas, completadas) {
    const contNuevas = document.getElementById('contNuevas')
    const contActivas = document.getElementById('contActivas')
    const contCompletadas = document.getElementById('contCompletadas')
    
    if (contNuevas) contNuevas.innerText = nuevas
    if (contActivas) contActivas.innerText = activas
    if (contCompletadas) contCompletadas.innerText = completadas
}

// ============================================================
// MOSTRAR MODAL DE ACEPTAR TAREA
// ============================================================

export function mostrarModalAceptarTarea(ordenTrabajo, onAceptar, onRechazar, onVolver) {
    console.log('📢 mostrarModalAceptarTarea ejecutándose');
    
    const modal = document.getElementById('modalAceptarTarea')
    if (!modal) {
        console.error('❌ Modal modalAceptarTarea no encontrado');
        return;
    }
    
    // Rellenar orden de trabajo
    const ordenDiv = document.getElementById('modalOrdenTrabajo')
    if (ordenDiv) {
        ordenDiv.innerHTML = ordenTrabajo || 'Sin instrucciones'
    }
    
    // Fecha propuesta: hoy + 7 días
    const fechaInput = document.getElementById('modalFechaPropuesta')
    if (fechaInput) {
        const fecha = new Date()
        fecha.setDate(fecha.getDate() + 7)
        fechaInput.value = fecha.toISOString().split('T')[0]
    }
    
    // Hora propuesta: 10:00
    const horaInput = document.getElementById('modalHoraPropuesta')
    if (horaInput) {
        horaInput.value = '10:00'
    }
    
    // Mostrar modal
    modal.style.display = 'flex'
    
    // Configurar botones
    const btnAceptar = document.getElementById('btnConfirmarAceptar')
    const btnRechazar = document.getElementById('btnRechazarTarea')
    const btnVolver = document.getElementById('btnVolverAceptar')
    
    // Si no existen los botones, los creamos
    const botonesContainer = document.querySelector('#modalAceptarTarea .modal-buttons')
    if (botonesContainer && (!btnRechazar || !btnVolver)) {
        botonesContainer.innerHTML = `
            <button id="btnConfirmarAceptar" class="btn-aceptar">✅ Aceptar</button>
            <button id="btnRechazarTarea" class="btn-danger">❌ Rechazar</button>
            <button id="btnVolverAceptar" class="btn-cancelar">◀ Volver</button>
        `
    }
    
    const newBtnAceptar = document.getElementById('btnConfirmarAceptar')
    const newBtnRechazar = document.getElementById('btnRechazarTarea')
    const newBtnVolver = document.getElementById('btnVolverAceptar')
    
    if (!newBtnAceptar || !newBtnRechazar || !newBtnVolver) {
        console.error('❌ Botones no encontrados');
        return;
    }
    
    // Limpiar eventos anteriores
    const cleanBtnAceptar = newBtnAceptar.cloneNode(true)
    const cleanBtnRechazar = newBtnRechazar.cloneNode(true)
    const cleanBtnVolver = newBtnVolver.cloneNode(true)
    newBtnAceptar.parentNode.replaceChild(cleanBtnAceptar, newBtnAceptar)
    newBtnRechazar.parentNode.replaceChild(cleanBtnRechazar, newBtnRechazar)
    newBtnVolver.parentNode.replaceChild(cleanBtnVolver, newBtnVolver)
    
    // Evento Aceptar
    cleanBtnAceptar.onclick = () => {
        const fecha = document.getElementById('modalFechaPropuesta').value
        const hora = document.getElementById('modalHoraPropuesta').value
        if (!fecha || !hora) {
            alert('Completa fecha y hora propuesta')
            return
        }
        modal.style.display = 'none'
        onAceptar(fecha, hora)
    }
    
    // Evento Rechazar
    cleanBtnRechazar.onclick = () => {
        const motivo = prompt('Motivo del rechazo:')
        if (motivo && motivo.trim() !== '') {
            modal.style.display = 'none'
            onRechazar(motivo)
        } else {
            alert('Debes indicar un motivo para rechazar la tarea')
        }
    }
    
    // Evento Volver
    cleanBtnVolver.onclick = () => {
        modal.style.display = 'none'
        if (onVolver) onVolver()
    }
}

// ============================================================
// MOSTRAR MODAL DE INFORME
// ============================================================

export function mostrarModalInforme(informe, onAceptar, onRegenerar, onCancelar) {
    const modal = document.getElementById('modalInformeCliente')
    if (!modal) return
    
    document.getElementById('informePreview').innerHTML = informe || 'No se pudo generar el informe'
    modal.style.display = 'flex'
    
    const btnAceptar = document.getElementById('btnAceptarInforme')
    const btnRegenerar = document.getElementById('btnRegenerarInforme')
    const btnCancelar = document.getElementById('btnCancelarInforme')
    
    btnAceptar.onclick = () => {
        modal.style.display = 'none'
        onAceptar()
    }
    btnRegenerar.onclick = () => onRegenerar()
    btnCancelar.onclick = () => {
        modal.style.display = 'none'
        onCancelar()
    }
}

// ============================================================
// MOSTRAR MODAL DE ALBARÁN
// ============================================================

export function mostrarModalAlbaran(totalMateriales, onGuardar, onCancelar) {
    const modal = document.getElementById('modalAlbaran')
    if (!modal) return
    
    document.getElementById('albaranMateriales').value = totalMateriales.toFixed(2)
    actualizarTotalAlbaran()
    
    modal.style.display = 'flex'
    
    const inputs = ['albaranHoras', 'albaranPrecioHora', 'albaranDietas']
    inputs.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.addEventListener('input', actualizarTotalAlbaran)
    })
    
    const btnGuardar = document.getElementById('btnAceptarAlbaran')
    const btnCancelar = document.getElementById('btnCancelarAlbaran')
    
    btnGuardar.onclick = () => {
        const horas = parseFloat(document.getElementById('albaranHoras')?.value) || 0
        const precioHora = parseFloat(document.getElementById('albaranPrecioHora')?.value) || 0
        const dietas = parseFloat(document.getElementById('albaranDietas')?.value) || 0
        const total = (horas * precioHora) + totalMateriales + dietas
        
        modal.style.display = 'none'
        onGuardar({ horas, precioHora, dietas, total })
    }
    
    btnCancelar.onclick = () => {
        modal.style.display = 'none'
        onCancelar()
    }
}

function actualizarTotalAlbaran() {
    const horas = parseFloat(document.getElementById('albaranHoras')?.value) || 0
    const precioHora = parseFloat(document.getElementById('albaranPrecioHora')?.value) || 0
    const materiales = parseFloat(document.getElementById('albaranMateriales')?.value) || 0
    const dietas = parseFloat(document.getElementById('albaranDietas')?.value) || 0
    const total = (horas * precioHora) + materiales + dietas
    document.getElementById('albaranTotal').value = total.toFixed(2) + ' €'
}

// ============================================================
// MOSTRAR MODAL DE DETALLE DE TAREA COMPLETADA
// ============================================================

export function mostrarModalDetalleTarea(contenido) {
    const modal = document.getElementById('modalDetalleTarea')
    if (!modal) return
    
    document.getElementById('detalleTareaContent').innerHTML = contenido
    modal.style.display = 'flex'
    
    const btnCerrar = document.getElementById('btnCerrarDetalle')
    btnCerrar.onclick = () => { modal.style.display = 'none' }
}

// ============================================================
// MOSTRAR MODAL DE ORDEN DE TRABAJO
// ============================================================

export function mostrarModalOrdenTrabajo(ordenTrabajo) {
    const modal = document.getElementById('modalVerOrden')
    if (!modal) return
    
    document.getElementById('ordenTrabajoContent').innerHTML = ordenTrabajo || 'Sin instrucciones'
    modal.style.display = 'flex'
    
    const btnCerrar = document.getElementById('btnCerrarOrden')
    btnCerrar.onclick = () => { modal.style.display = 'none' }
}

// ============================================================
// CERRAR TODOS LOS MODALES
// ============================================================

export function cerrarTodosModales() {
    const modales = [
        'modalAceptarTarea',
        'modalInformeCliente',
        'modalAlbaran',
        'modalDetalleTarea',
        'modalVerOrden'
    ]
    modales.forEach(id => {
        const modal = document.getElementById(id)
        if (modal) modal.style.display = 'none'
    })
}