// tecnico/js/modules/tareas.js
import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { mostrarMensaje, formatearFecha, escapeHtml, getEstadoBadge, getPrioridadBadge, getEstadoLabel } from '../utils/utils.js'

let todasTareas = []
let tareasPendientes = []
let tareasActivas = []
let tareasCompletadas = []

// ESTADOS
export const ESTADOS = {
    PENDIENTE_ACEPTACION: 'pendiente_aceptacion',
    VISTA: 'vista',
    ACEPTADA: 'aceptada',
    RECHAZADA: 'rechazada',
    EN_DESPLAZAMIENTO: 'en_desplazamiento',
    TRABAJANDO_ONSITE: 'trabajando_onsite',
    TERMINADA: 'terminada',
    SUSPENDIDA: 'suspendida',
    CANCELADA: 'cancelada'
}

// BOTÓN INTELIGENTE POR ESTADO
export function getBotonInteligente(tarea) {
    const config = {
        'pendiente_aceptacion': { texto: '👁️ Leer y aceptar', clase: 'btn-info', accion: 'leer' },
        'vista': { texto: '✅ Aceptar / ❌ Rechazar', clase: 'btn-success', accion: 'aceptar' },
        'aceptada': { texto: '🚗 Iniciar desplazamiento', clase: 'btn-info', accion: 'desplazamiento' },
        'en_desplazamiento': { texto: '📍 Registrar llegada', clase: 'btn-warning', accion: 'llegada' },
        'trabajando_onsite': { texto: '🔧 Continuar trabajo', clase: 'btn-success', accion: 'trabajar' },
        'suspendida': { texto: '▶️ Reactivar', clase: 'btn-warning', accion: 'reactivar' },
        'terminada': { texto: '📋 Ver detalle', clase: 'btn-info', accion: 'detalle' },
        'rechazada': { texto: '📋 Ver detalle', clase: 'btn-info', accion: 'detalle' },
        'cancelada': { texto: '📋 Ver detalle', clase: 'btn-info', accion: 'detalle' }
    }
    return config[tarea.estado] || { texto: '👁️ Ver', clase: 'btn-info', accion: 'detalle' }
}

export async function cargarTareas() {
    const tecnicoId = getCurrentTecnicoId()
    if (!tecnicoId) return false
    try {
        const { data, error } = await sb.from('tareas')
            .select(`*, empresas:empresas!empresa_id(id, nombre_empresa), activos:activos!activo_id(id, nombre, direccion, localidad, contacto)`)
            .eq('perfil_id', tecnicoId).order('fecha_asignacion', { ascending: false })
        if (error) throw error
        todasTareas = data || []
        tareasPendientes = todasTareas.filter(t => t.estado === 'pendiente_aceptacion' || t.estado === 'vista')
        tareasActivas = todasTareas.filter(t => ['aceptada', 'en_desplazamiento', 'trabajando_onsite', 'suspendida'].includes(t.estado))
        tareasCompletadas = todasTareas.filter(t => ['terminada', 'rechazada', 'cancelada'].includes(t.estado))
        return true
    } catch (error) {
        console.error('Error cargando tareas:', error)
        mostrarMensaje('Error al cargar tareas', 'error')
        return false
    }
}

export function getTareasPendientes() { return [...tareasPendientes] }
export function getTareasActivas() { return [...tareasActivas] }
export function getTareasCompletadas() { return [...tareasCompletadas] }
export function getTodasTareas() { return [...todasTareas] }

export function getContadores() {
    return { pendientes: tareasPendientes.length, activas: tareasActivas.length, completadas: tareasCompletadas.length }
}

export async function getTareaById(id) {
    const cached = todasTareas.find(t => t.id === id)
    if (cached) return cached
    const { data, error } = await sb.from('tareas').select(`*, cliente:clientes!cliente_id(id, nombre), activos:activos!activo_id(*), empresas:empresas!empresa_id(id, nombre_empresa)`).eq('id', id).single()
    if (error) { console.error('Error:', error); return null }
    return data
}

export async function actualizarEstadoTarea(id, estado, datosAdicionales = {}) {
    const updateData = { estado, updated_at: new Date().toISOString() }
    if (estado === 'vista') updateData.leida = true
    if (estado === 'aceptada') { updateData.fecha_aceptacion = new Date().toISOString(); updateData.leida = true }
    if (estado === 'en_desplazamiento') updateData.fecha_desplazamiento = new Date().toISOString()
    if (estado === 'trabajando_onsite') updateData.fecha_llegada = new Date().toISOString()
    if (estado === 'terminada') { updateData.fecha_fin_trabajo = new Date().toISOString(); updateData.completada_en = new Date().toISOString() }
    if (estado === 'suspendida') updateData.fecha_suspension = new Date().toISOString()
    if (estado === 'cancelada') updateData.motivo_cancelacion = datosAdicionales.motivo_cancelacion || 'Cancelada por el técnico'
    if (datosAdicionales.fecha_propuesta) updateData.fecha_propuesta = datosAdicionales.fecha_propuesta
    if (datosAdicionales.hora_propuesta) updateData.hora_propuesta = datosAdicionales.hora_propuesta
    if (datosAdicionales.leida !== undefined) updateData.leida = datosAdicionales.leida
    if (datosAdicionales.nota_interna) updateData.nota_interna = datosAdicionales.nota_interna
    if (datosAdicionales.nota_cliente) updateData.nota_cliente = datosAdicionales.nota_cliente
    const { error } = await sb.from('tareas').update(updateData).eq('id', id)
    if (error) { mostrarMensaje('Error al actualizar estado', 'error'); return false }
    const tareaIndex = todasTareas.findIndex(t => t.id === id)
    if (tareaIndex !== -1) { todasTareas[tareaIndex].estado = estado; Object.assign(todasTareas[tareaIndex], updateData) }
    return true
}