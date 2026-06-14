// tecnico/js/modules/seguimiento.js
// Registro de eventos de seguimiento (desplazamiento, llegada, trabajo)

import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { actualizarEstadoTarea } from './tareas.js'
import { mostrarMensaje, getNowLocalISO } from './utils.js'

// ============================================================
// REGISTRAR EVENTO DE SEGUIMIENTO
// ============================================================

export async function registrarEvento(tareaId, evento, motivo = null) {
    const tecnicoId = getCurrentTecnicoId()
    if (!tecnicoId) {
        mostrarMensaje('No hay sesión activa', 'error')
        return false
    }
    
    const ahoraISO = getNowLocalISO()
    
    try {
        let eventoAnterior = null
        
        // Buscar evento anterior para cerrar duración
        if (evento === 'LLEGADA') {
            const { data } = await sb
                .from('seguimiento_tareas')
                .select('*')
                .eq('tarea_id', tareaId)
                .eq('evento', 'INICIO_DESPLAZAMIENTO')
                .is('fin', null)
                .maybeSingle()
            eventoAnterior = data
        } else if (evento === 'FIN_TRABAJO' || evento === 'SUSPENSION') {
            const { data } = await sb
                .from('seguimiento_tareas')
                .select('*')
                .eq('tarea_id', tareaId)
                .eq('evento', 'INICIO_TRABAJO')
                .is('fin', null)
                .maybeSingle()
            eventoAnterior = data
        }
        
        // Cerrar evento anterior si existe
        if (eventoAnterior && eventoAnterior.inicio) {
            const duracion = Math.max(1, Math.floor(
                (new Date(ahoraISO) - new Date(eventoAnterior.inicio)) / 1000 / 60
            ))
            await sb
                .from('seguimiento_tareas')
                .update({ fin: ahoraISO, duracion_minutos: duracion })
                .eq('id', eventoAnterior.id)
        }
        
        // Registrar nuevo evento
        const { error } = await sb
            .from('seguimiento_tareas')
            .insert({
                tarea_id: tareaId,
                tecnico_id: tecnicoId,
                evento: evento,
                inicio: ahoraISO,
                motivo: motivo
            })
        
        if (error) throw error
        
        // Actualizar estado de la tarea según evento (SOLO estados permitidos)
        if (evento === 'INICIO_DESPLAZAMIENTO') {
            await actualizarEstadoTarea(tareaId, 'en_progreso')
        } else if (evento === 'LLEGADA') {
            await actualizarEstadoTarea(tareaId, 'en_progreso')
        } else if (evento === 'FIN_TRABAJO') {
            await actualizarEstadoTarea(tareaId, 'completada', { completada_en: ahoraISO })
        } else if (evento === 'SUSPENSION') {
            await actualizarEstadoTarea(tareaId, 'suspendida')
        } else if (evento === 'REANUDACION') {
            await actualizarEstadoTarea(tareaId, 'en_progreso')
        }
        
        mostrarMensaje(`✅ ${getEventoTexto(evento)} registrado`, 'exito')
        return true
        
    } catch (error) {
        console.error('Error registrando evento:', error)
        mostrarMensaje(`❌ Error al registrar ${getEventoTexto(evento)}`, 'error')
        return false
    }
}

// ============================================================
// ACCIONES RÁPIDAS
// ============================================================

export async function iniciarDesplazamiento(tareaId) {
    return registrarEvento(tareaId, 'INICIO_DESPLAZAMIENTO')
}

export async function registrarLlegada(tareaId) {
    return registrarEvento(tareaId, 'LLEGADA')
}

export async function iniciarTrabajo(tareaId) {
    return registrarEvento(tareaId, 'INICIO_TRABAJO')
}

// ============================================================
// SUSPENDER Y REANUDAR TAREA
// ============================================================

export async function suspenderTarea(tareaId, motivo = 'Fin de jornada') {
    const tecnicoId = getCurrentTecnicoId()
    const ahoraISO = getNowLocalISO()
    
    try {
        // Cerrar trabajo activo si existe
        const { data: trabajoActivo } = await sb
            .from('seguimiento_tareas')
            .select('*')
            .eq('tarea_id', tareaId)
            .eq('evento', 'INICIO_TRABAJO')
            .is('fin', null)
            .maybeSingle()
        
        if (trabajoActivo) {
            const duracion = Math.max(1, Math.floor(
                (new Date(ahoraISO) - new Date(trabajoActivo.inicio)) / 1000 / 60
            ))
            await sb
                .from('seguimiento_tareas')
                .update({ fin: ahoraISO, duracion_minutos: duracion })
                .eq('id', trabajoActivo.id)
        }
        
        // Registrar suspensión
        await sb
            .from('seguimiento_tareas')
            .insert({
                tarea_id: tareaId,
                tecnico_id: tecnicoId,
                evento: 'SUSPENSION',
                inicio: ahoraISO,
                motivo: motivo
            })
        
        // Actualizar estado de tarea
        await actualizarEstadoTarea(tareaId, 'suspendida')
        
        mostrarMensaje('⏸️ Tarea suspendida', 'exito')
        return true
        
    } catch (error) {
        console.error(error)
        mostrarMensaje('❌ Error al suspender', 'error')
        return false
    }
}

export async function reanudarTarea(tareaId) {
    const tecnicoId = getCurrentTecnicoId()
    const ahoraISO = getNowLocalISO()
    
    try {
        // Registrar reanudación
        await sb
            .from('seguimiento_tareas')
            .insert({
                tarea_id: tareaId,
                tecnico_id: tecnicoId,
                evento: 'REANUDACION',
                inicio: ahoraISO,
                motivo: 'Nueva jornada'
            })
        
        // Cambiar estado a en_progreso
        await actualizarEstadoTarea(tareaId, 'en_progreso')
        
        mostrarMensaje('✅ Tarea reanudada', 'exito')
        return true
        
    } catch (error) {
        console.error(error)
        mostrarMensaje('❌ Error al reanudar', 'error')
        return false
    }
}

// ============================================================
// FINALIZAR TRABAJO
// ============================================================

export async function finalizarTrabajo(tareaId, medicionesTemp = [], guardarMedicionesFn = null) {
    const tecnicoId = getCurrentTecnicoId()
    const ahoraISO = getNowLocalISO()
    
    try {
        // Cerrar trabajo activo
        const { data: trabajo } = await sb
            .from('seguimiento_tareas')
            .select('*')
            .eq('tarea_id', tareaId)
            .eq('evento', 'INICIO_TRABAJO')
            .is('fin', null)
            .maybeSingle()
        
        if (trabajo && trabajo.inicio) {
            const duracion = Math.max(1, Math.floor(
                (new Date(ahoraISO) - new Date(trabajo.inicio)) / 1000 / 60
            ))
            await sb
                .from('seguimiento_tareas')
                .update({ fin: ahoraISO, duracion_minutos: duracion })
                .eq('id', trabajo.id)
        }
        
        // Registrar FIN_TRABAJO
        await sb
            .from('seguimiento_tareas')
            .insert({
                tarea_id: tareaId,
                tecnico_id: tecnicoId,
                evento: 'FIN_TRABAJO',
                inicio: ahoraISO
            })
        
        // Guardar mediciones pendientes
        if (guardarMedicionesFn && medicionesTemp.length > 0) {
            for (const med of medicionesTemp) {
                await guardarMedicionesFn(tareaId, med)
            }
        }
        
        // Actualizar estado a completada
        await actualizarEstadoTarea(tareaId, 'completada', { completada_en: ahoraISO })
        
        mostrarMensaje('✅ Trabajo finalizado', 'exito')
        return true
        
    } catch (error) {
        console.error(error)
        mostrarMensaje('❌ Error al finalizar', 'error')
        return false
    }
}

// ============================================================
// OBTENER SEGUIMIENTO DE TAREA
// ============================================================

export async function getSeguimientoTarea(tareaId) {
    const { data, error } = await sb
        .from('seguimiento_tareas')
        .select('*')
        .eq('tarea_id', tareaId)
        .order('inicio', { ascending: true })
    
    if (error) {
        console.error(error)
        return []
    }
    
    return data || []
}

// ============================================================
// CALCULAR TIEMPOS TOTALES
// ============================================================

export function calcularTiemposTotales(seguimiento) {
    let tiempoDesplazamiento = 0
    let tiempoTrabajo = 0
    
    for (const ev of seguimiento) {
        if (ev.evento === 'LLEGADA' && ev.duracion_minutos) {
            tiempoDesplazamiento += ev.duracion_minutos
        }
        if (ev.evento === 'FIN_TRABAJO' && ev.duracion_minutos) {
            tiempoTrabajo += ev.duracion_minutos
        }
    }
    
    return { tiempoDesplazamiento, tiempoTrabajo }
}

// ============================================================
// TEXTO DEL EVENTO
// ============================================================

function getEventoTexto(evento) {
    const textos = {
        'INICIO_DESPLAZAMIENTO': 'inicio de desplazamiento',
        'LLEGADA': 'llegada',
        'INICIO_TRABAJO': 'inicio de trabajo',
        'SUSPENSION': 'suspensión',
        'REANUDACION': 'reanudación',
        'FIN_TRABAJO': 'fin de trabajo'
    }
    return textos[evento] || evento
}