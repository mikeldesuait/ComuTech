// tecnico/js/modules/seguimiento.js
import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { actualizarEstadoTarea } from './tareas.js'
import { mostrarMensaje, getNowLocalISO, formatearFecha } from '../utils/utils.js'

export async function registrarEvento(tareaId, evento, motivo = null) {
    const tecnicoId = getCurrentTecnicoId()
    if (!tecnicoId) { mostrarMensaje('No hay sesión activa', 'error'); return false }
    const ahoraISO = getNowLocalISO()
    try {
        let eventoAnterior = null
        if (evento === 'LLEGADA') {
            const { data } = await sb.from('seguimiento_tareas').select('*').eq('tarea_id', tareaId).eq('evento', 'INICIO_DESPLAZAMIENTO').is('fin', null).maybeSingle()
            eventoAnterior = data
        } else if (evento === 'FIN_TRABAJO' || evento === 'SUSPENSION') {
            const { data } = await sb.from('seguimiento_tareas').select('*').eq('tarea_id', tareaId).eq('evento', 'INICIO_TRABAJO').is('fin', null).maybeSingle()
            eventoAnterior = data
        }
        if (eventoAnterior && eventoAnterior.inicio) {
            const duracion = Math.max(1, Math.floor((new Date(ahoraISO) - new Date(eventoAnterior.inicio)) / 60000))
            await sb.from('seguimiento_tareas').update({ fin: ahoraISO, duracion_minutos: duracion }).eq('id', eventoAnterior.id)
        }
        const { error } = await sb.from('seguimiento_tareas').insert({ tarea_id: tareaId, tecnico_id: tecnicoId, evento, inicio: ahoraISO, motivo })
        if (error) throw error
        const estadoMap = { 'INICIO_DESPLAZAMIENTO': 'en_desplazamiento', 'LLEGADA': 'trabajando_onsite', 'FIN_TRABAJO': 'terminada', 'SUSPENSION': 'suspendida' }
        if (estadoMap[evento]) await actualizarEstadoTarea(tareaId, estadoMap[evento])
        mostrarMensaje(`✅ ${getEventoTexto(evento)} registrado`, 'exito')
        return true
    } catch (error) { console.error(error); mostrarMensaje('Error al registrar evento', 'error'); return false }
}

export async function suspenderTarea(tareaId, motivo = 'Fin de jornada') {
    return registrarEvento(tareaId, 'SUSPENSION', motivo)
}

export async function finalizarTrabajo(tareaId) {
    return registrarEvento(tareaId, 'FIN_TRABAJO')
}

export async function getSeguimientoTarea(tareaId) {
    const { data, error } = await sb.from('seguimiento_tareas').select('*').eq('tarea_id', tareaId).order('inicio', { ascending: true })
    if (error) { console.error(error); return [] }
    return data || []
}

export function calcularTiemposTotales(seguimiento) {
    let tiempoDesplazamiento = 0, tiempoTrabajo = 0
    for (const ev of seguimiento) {
        if (ev.evento === 'LLEGADA' && ev.duracion_minutos) tiempoDesplazamiento += ev.duracion_minutos
        if (ev.evento === 'FIN_TRABAJO' && ev.duracion_minutos) tiempoTrabajo += ev.duracion_minutos
    }
    return { tiempoDesplazamiento, tiempoTrabajo }
}

function getEventoTexto(evento) {
    const textos = { 'INICIO_DESPLAZAMIENTO': 'inicio de desplazamiento', 'LLEGADA': 'llegada', 'INICIO_TRABAJO': 'inicio de trabajo', 'SUSPENSION': 'suspensión', 'REANUDACION': 'reanudación', 'FIN_TRABAJO': 'fin de trabajo' }
    return textos[evento] || evento
}