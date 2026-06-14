// gerente/js/modules/tareas.js
// Gestión de tareas para el panel gerente

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, getEstadoBadge, getPrioridadBadge, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion } from './utils.js'

let todasTareas = []
let tecnicosDisponibles = []
let clientesDisponibles = []
let activosDisponibles = []

// ============================================================
// CARGAR TAREAS DE LA EMPRESA
// ============================================================

export async function cargarTareas(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('tareas')
            .select(`
                *,
                perfiles!perfil_id(id, nombre_razon_social, email),
                empresas!empresa_id(id, nombre_empresa)
            `)
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        todasTareas = data || []
        return todasTareas
        
    } catch (error) {
        console.error('Error cargando tareas:', error)
        mostrarMensaje('Error al cargar tareas', 'error')
        return []
    }
}

// ============================================================
// OBTENER TÉCNICOS DE LA EMPRESA
// ============================================================

export async function cargarTecnicos(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('perfiles')
            .select('id, nombre_razon_social, email, telefono')
            .eq('empresa_id', empresaId)
            .eq('rol', 'tecnico')
        
        if (error) throw error
        
        tecnicosDisponibles = data || []
        return tecnicosDisponibles
        
    } catch (error) {
        console.error('Error cargando técnicos:', error)
        return []
    }
}

// ============================================================
// OBTENER CLIENTES DE LA EMPRESA
// ============================================================

export async function cargarClientes(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('empresas')
            .select('id, nombre_empresa, nif_cif')
            .eq('id', empresaId)
        
        if (error) throw error
        
        clientesDisponibles = data || []
        return clientesDisponibles
        
    } catch (error) {
        console.error('Error cargando clientes:', error)
        return []
    }
}

// ============================================================
// OBTENER ACTIVOS DEL CLIENTE
// ============================================================

export async function cargarActivos(clienteId) {
    if (!clienteId) return []
    
    try {
        const { data, error } = await sb
            .from('activos')
            .select('id, nombre, direccion, localidad')
            .eq('empresa_id', clienteId)
        
        if (error) throw error
        
        activosDisponibles = data || []
        return activosDisponibles
        
    } catch (error) {
        console.error('Error cargando activos:', error)
        return []
    }
}

// ============================================================
// CREAR NUEVA TAREA
// ============================================================

export async function crearTarea(datos) {
    const { 
        clienteId, activoId, tecnicoId, titulo, descripcion, 
        prioridad, fechaLimite, ordenTrabajo 
    } = datos
    
    if (!clienteId || !titulo) {
        mostrarMensaje('Completa los campos obligatorios', 'error')
        return null
    }
    
    mostrarModalCarga('Creando tarea...')
    
    try {
        // Generar número de tarea
        const { data: ultimaTarea } = await sb
            .from('tareas')
            .select('numero_tarea')
            .order('created_at', { ascending: false })
            .limit(1)
        
        let numeroTarea = 'T001'
        if (ultimaTarea && ultimaTarea.length > 0) {
            const ultimoNumero = parseInt(ultimaTarea[0].numero_tarea.slice(1))
            numeroTarea = `T${String(ultimoNumero + 1).padStart(3, '0')}`
        }
        
        const { data, error } = await sb
            .from('tareas')
            .insert({
                empresa_id: clienteId,
                perfil_id: tecnicoId || null,
                activo_id: activoId || null,
                numero_tarea: numeroTarea,
                titulo: titulo,
                descripcion: descripcion,
                prioridad: prioridad || 'media',
                estado: tecnicoId ? 'pendiente' : 'pendiente',
                fecha_limite: fechaLimite || null,
                orden_trabajo: ordenTrabajo || null,
                leida: false
            })
            .select()
            .single()
        
        if (error) throw error
        
        // Registrar en historial de asignaciones
        if (tecnicoId) {
            await registrarHistorialAsignacion(data.id, tecnicoId, 'asignacion')
        }
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Tarea ${numeroTarea} creada correctamente`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando tarea:', error)
        mostrarMensaje('Error al crear tarea', 'error')
        return null
    }
}

// ============================================================
// ASIGNAR/REASIGNAR TAREA
// ============================================================

export async function asignarTarea(tareaId, tecnicoId, motivo = null) {
    mostrarModalCarga('Asignando tarea...')
    
    try {
        const { error } = await sb
            .from('tareas')
            .update({
                perfil_id: tecnicoId,
                estado: 'pendiente',
                leida: false,
                rechazada_por: null,
                fecha_rechazo: null,
                motivo_rechazo: null
            })
            .eq('id', tareaId)
        
        if (error) throw error
        
        await registrarHistorialAsignacion(tareaId, tecnicoId, 'reasignacion', motivo)
        
        cerrarModalCarga()
        mostrarMensaje('✅ Tarea asignada correctamente', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error asignando tarea:', error)
        mostrarMensaje('Error al asignar tarea', 'error')
        return false
    }
}

// ============================================================
// REGISTRAR HISTORIAL DE ASIGNACIÓN
// ============================================================

async function registrarHistorialAsignacion(tareaId, tecnicoId, tipo, motivo = null) {
    const { data: { user } } = await sb.auth.getUser()
    
    const { error } = await sb
        .from('historial_asignaciones')
        .insert({
            tarea_id: tareaId,
            tecnico_id: tecnicoId,
            asignado_por: user?.id,
            tipo: tipo,
            motivo: motivo
        })
    
    if (error) {
        console.error('Error registrando historial:', error)
    }
}

// ============================================================
// OBTENER HISTORIAL DE ASIGNACIONES
// ============================================================

export async function getHistorialAsignaciones(tareaId) {
    const { data, error } = await sb
        .from('historial_asignaciones')
        .select(`
            *,
            perfiles!tecnico_id(id, nombre_razon_social),
            perfiles!asignado_por(id, nombre_razon_social)
        `)
        .eq('tarea_id', tareaId)
        .order('fecha_asignacion', { ascending: false })
    
    if (error) {
        console.error('Error obteniendo historial:', error)
        return []
    }
    
    return data || []
}

// ============================================================
// RENDERIZAR LISTA DE TAREAS
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
        
        html += `
            <tr>
                <td><strong>${escapeHtml(tarea.numero_tarea)}</strong></td>
                <td>${escapeHtml(tarea.titulo)}</td>
                <td>${escapeHtml(clienteNombre)}</td>
                <td>${escapeHtml(tecnicoNombre)}</td>
                <td>${getPrioridadBadge(tarea.prioridad)}</td>
                <td>${getEstadoBadge(tarea.estado)}</td>
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

// ============================================================
// RENDERIZAR FORMULARIO CREAR TAREA
// ============================================================

export function renderizarFormularioCrear(clientes, tecnicos, onGuardar, onCancelar) {
    const clientesOptions = clientes.map(c => 
        `<option value="${c.id}">${escapeHtml(c.nombre_empresa)}</option>`
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
                    <label>🏗️ Activo (opcional)</label>
                    <select id="tareaActivo">
                        <option value="">-- Seleccionar activo --</option>
                    </select>
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>👨‍🔧 Técnico (opcional)</label>
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

// ============================================================
// RENDERIZAR MODAL ASIGNAR TAREA
// ============================================================

export function renderizarModalAsignar(tarea, tecnicos, onAsignar) {
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
            <label>📝 Motivo de reasignación (opcional)</label>
            <textarea id="asignarMotivo" rows="2" placeholder="Motivo del cambio de asignación..."></textarea>
        </div>
    `
}