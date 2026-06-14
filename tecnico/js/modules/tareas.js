// tecnico/js/modules/tareas.js
// Gestión de tareas del técnico

import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { mostrarMensaje, formatearFecha, escapeHtml } from './utils.js'

let todasTareas = []
let tareasNuevas = []
let tareasActivas = []
let tareasCompletadas = []

// ============================================================
// CARGAR TAREAS DEL TÉCNICO
// ============================================================

export async function cargarTareas() {
    const tecnicoId = getCurrentTecnicoId()
    if (!tecnicoId) return false
    
    try {
        const { data, error } = await sb
            .from('tareas')
            .select(`
                *,
                empresas!empresa_id(id, nombre_empresa)
            `)
            .eq('perfil_id', tecnicoId)
            .order('fecha_asignacion', { ascending: false })
        
        if (error) throw error
        
        todasTareas = data || []
        
        // Clasificar por estado (usando solo los estados permitidos)
        tareasNuevas = todasTareas.filter(t => 
            t.estado?.toLowerCase() === 'pendiente' && !t.leida
        )
        
        tareasActivas = todasTareas.filter(t => {
            const estado = t.estado?.toLowerCase()
            return estado === 'en_progreso'
        })
        
        tareasCompletadas = todasTareas.filter(t => {
            const estado = t.estado?.toLowerCase()
            return estado === 'completada' || 
                   estado === 'cancelada' ||
                   estado === 'facturada'
        })
        
        console.log('Tareas cargadas:', {
            total: todasTareas.length,
            nuevas: tareasNuevas.length,
            activas: tareasActivas.length,
            completadas: tareasCompletadas.length
        })
        
        return true
        
    } catch (error) {
        console.error('Error cargando tareas:', error)
        mostrarMensaje('Error al cargar tareas', 'error')
        return false
    }
}

// ============================================================
// OBTENER TAREAS POR CATEGORÍA
// ============================================================

export function getTareasNuevas() {
    return [...tareasNuevas]
}

export function getTareasActivas() {
    return [...tareasActivas]
}

export function getTareasCompletadas() {
    return [...tareasCompletadas]
}

export function getTodasTareas() {
    return [...todasTareas]
}

// ============================================================
// OBTENER CONTADORES
// ============================================================

export function getContadores() {
    return {
        nuevas: tareasNuevas.length,
        activas: tareasActivas.length,
        completadas: tareasCompletadas.length
    }
}

// ============================================================
// OBTENER TAREA POR ID
// ============================================================

export async function getTareaById(id) {
    // Buscar en caché primero
    const cached = todasTareas.find(t => t.id === id)
    if (cached) return cached
    
    // Si no está, buscar en BD
    const { data, error } = await sb
        .from('tareas')
        .select(`
            *,
            empresas!empresa_id(id, nombre_empresa)
        `)
        .eq('id', id)
        .single()
    
    if (error) {
        console.error('Error obteniendo tarea:', error)
        return null
    }
    
    return data
}

// ============================================================
// ACTUALIZAR ESTADO DE TAREA
// ============================================================

export async function actualizarEstadoTarea(id, estado, datosAdicionales = {}) {
    console.log('📤 Actualizando tarea:', { id, estado, datosAdicionales })
    
    // Filtrar solo los campos que existen en la BD
    const updateData = {
        estado: estado,
        updated_at: new Date().toISOString()
    }
    
    // Solo añadir campos si existen
    if (datosAdicionales.fecha_propuesta) updateData.fecha_propuesta = datosAdicionales.fecha_propuesta
    if (datosAdicionales.hora_propuesta) updateData.hora_propuesta = datosAdicionales.hora_propuesta
    if (datosAdicionales.leida !== undefined) updateData.leida = datosAdicionales.leida
    if (datosAdicionales.motivo_cancelacion) updateData.motivo_cancelacion = datosAdicionales.motivo_cancelacion
    if (datosAdicionales.nota_interna) updateData.nota_interna = datosAdicionales.nota_interna
    if (datosAdicionales.nota_cliente) updateData.nota_cliente = datosAdicionales.nota_cliente
    if (datosAdicionales.completada_en) updateData.completada_en = datosAdicionales.completada_en
    if (datosAdicionales.iniciada_en) updateData.iniciada_en = datosAdicionales.iniciada_en
    
    const { error } = await sb
        .from('tareas')
        .update(updateData)
        .eq('id', id)
    
    if (error) {
        console.error('❌ Error en actualizarEstadoTarea:', error)
        mostrarMensaje('Error al actualizar estado', 'error')
        return false
    }
    
    console.log('✅ Tarea actualizada correctamente')
    
    // Actualizar caché
    const tareaIndex = todasTareas.findIndex(t => t.id === id)
    if (tareaIndex !== -1) {
        todasTareas[tareaIndex].estado = estado
        Object.assign(todasTareas[tareaIndex], updateData)
    }
    
    return true
}

// ============================================================
// ACEPTAR TAREA (con fecha y hora propuesta)
// ============================================================

export async function aceptarTarea(id, fechaPropuesta, horaPropuesta) {
    return actualizarEstadoTarea(id, 'en_progreso', {
        fecha_propuesta: fechaPropuesta,
        hora_propuesta: horaPropuesta + ':00',
        leida: true
    })
}

// ============================================================
// CANCELAR TAREA
// ============================================================

export async function cancelarTarea(id, motivo) {
    return actualizarEstadoTarea(id, 'cancelada', {
        motivo_cancelacion: motivo,
        leida: true
    })
}

// ============================================================
// GUARDAR NOTA INTERNA
// ============================================================

export async function guardarNotaInterna(id, notaInterna) {
    const { error } = await sb
        .from('tareas')
        .update({ nota_interna: notaInterna })
        .eq('id', id)
    
    if (error) {
        mostrarMensaje('Error al guardar nota', 'error')
        return false
    }
    
    // Actualizar caché
    const tareaIndex = todasTareas.findIndex(t => t.id === id)
    if (tareaIndex !== -1) {
        todasTareas[tareaIndex].nota_interna = notaInterna
    }
    
    mostrarMensaje('Nota guardada', 'exito')
    return true
}

// ============================================================
// GUARDAR INFORME PARA CLIENTE
// ============================================================

export async function guardarInformeCliente(id, informe) {
    const { error } = await sb
        .from('tareas')
        .update({ nota_cliente: informe })
        .eq('id', id)
    
    if (error) {
        mostrarMensaje('Error al guardar informe', 'error')
        return false
    }
    
    // Actualizar caché
    const tareaIndex = todasTareas.findIndex(t => t.id === id)
    if (tareaIndex !== -1) {
        todasTareas[tareaIndex].nota_cliente = informe
    }
    
    mostrarMensaje('Informe guardado', 'exito')
    return true
}

// ============================================================
// MARCAR COMO LEÍDA
// ============================================================

export async function marcarComoLeida(id) {
    const { error } = await sb
        .from('tareas')
        .update({ leida: true })
        .eq('id', id)
    
    if (error) return false
    
    const tareaIndex = todasTareas.findIndex(t => t.id === id)
    if (tareaIndex !== -1) {
        todasTareas[tareaIndex].leida = true
    }
    
    return true
}

// ============================================================
// RENDERIZADO DE TAREAS (para UI)
// ============================================================

export function renderizarTareaCard(tarea, tipo) {
    const clienteNombre = tarea.empresas?.nombre_empresa || 'Cliente'
    
    let botonTexto = ''
    if (tipo === 'nueva') {
        botonTexto = '👁️ Leer y aceptar'
    } else if (tarea.estado === 'en_progreso') {
        botonTexto = '🚗 Iniciar desplazamiento'
    } else {
        botonTexto = '🔧 Continuar trabajo'
    }
    
    return `
        <div class="card-tarea prioridad-${tarea.prioridad?.toLowerCase() || 'media'}">
            <div class="card-header-tarea">
                <span class="badge tipo-${tarea.prioridad?.toLowerCase() || 'media'}">
                    ${tarea.prioridad || 'MEDIA'}
                </span>
                <span class="badge estado-${tarea.estado?.toLowerCase() || 'pendiente'}">
                    ${tarea.estado || 'PENDIENTE'}
                </span>
            </div>
            <div class="tarea-cliente">${escapeHtml(clienteNombre)}</div>
            <div class="tarea-direccion">📅 Asignada: ${formatearFecha(tarea.fecha_asignacion)}</div>
            <button class="btn-leer" data-id="${tarea.id}" data-tipo="${tipo}">
                ${botonTexto}
            </button>
        </div>
    `
}