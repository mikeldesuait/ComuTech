// gerente/js/modules/tareas.js
// Gestión de tareas para el panel gerente - VERSIÓN CON SERVICIOS Y TIPOS DE TAREA

import { sb } from '../config/supabase.js'
import { 
    mostrarMensaje, formatearFecha,formatearFechaHora, escapeHtml, 
    getEstadoBadge, getPrioridadBadge, 
    mostrarModalCarga, cerrarModalCarga, 
    mostrarModalConfirmacion, mostrarModalInformativo 
} from './utils.js'

let todasTareas = []
let tecnicosDisponibles = []
let clientesDisponibles = []
let activosDisponibles = []
let serviciosDisponibles = []
let tiposTareaDisponibles = []
let plantillasDisponibles = []

// ============================================================
// CONSTANTES DE ESTADOS (NUEVO FLUJO)
// ============================================================

export const ESTADOS_TAREA = {
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

export const ESTADOS_FLUJO = [
    { value: 'pendiente_aceptacion', label: '⏳ Pendiente aceptación', color: 'badge-pendiente' },
    { value: 'vista', label: '👁️ Vista', color: 'badge-info' },
    { value: 'aceptada', label: '✅ Aceptada', color: 'badge-activo' },
    { value: 'rechazada', label: '❌ Rechazada', color: 'badge-inactivo' },
    { value: 'en_desplazamiento', label: '🚗 En desplazamiento', color: 'badge-warning' },
    { value: 'trabajando_onsite', label: '🔧 Trabajando OnSite', color: 'badge-info' },
    { value: 'terminada', label: '✅ Terminada', color: 'badge-completada' },
    { value: 'suspendida', label: '⏸️ Suspendida', color: 'badge-danger' },
    { value: 'cancelada', label: '❌ Cancelada', color: 'badge-cancelada' }
]

// ============================================================
// OBTENER EMPRESA_ID DEL GERENTE ACTUAL
// ============================================================

async function getEmpresaId() {
    try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return null
        
        const { data: perfil } = await sb
            .from('perfiles')
            .select('empresa_id')
            .eq('user_id', user.id)
            .single()
        
        return perfil?.empresa_id || null
    } catch (error) {
        console.error('Error obteniendo empresa_id:', error)
        return null
    }
}

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
                perfiles!perfil_id(id, nombre_razon_social, email, nick),
                cliente:clientes!cliente_id(id, nombre),
                activos!activo_id(id, nombre, direccion),
                servicio:servicios!servicio_id(id, nombre, icono),
                tipo_tarea:tipos_tarea!tipo_tarea_id(id, nombre, tiempo_estimado)
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
            .select('id, nombre_razon_social, email, telefono, nick')
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
// OBTENER CLIENTES DE LA EMPRESA (desde tabla clientes)
// ============================================================

export async function cargarClientesDeEmpresa(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('clientes')
            .select('id, nombre, nif_cif, email, telefono, direccion, ciudad, provincia')
            .eq('empresa_id', empresaId)
            .order('nombre')
        
        if (error) throw error
        
        clientesDisponibles = data || []
        return clientesDisponibles
        
    } catch (error) {
        console.error('Error cargando clientes:', error)
        return []
    }
}

// ============================================================
// OBTENER CLIENTES DE LA EMPRESA (legacy - mantener compatibilidad)
// ============================================================

export async function cargarClientes(empresaId) {
    return await cargarClientesDeEmpresa(empresaId)
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
            .eq('cliente_id', clienteId)
        
        if (error) throw error
        
        activosDisponibles = data || []
        return activosDisponibles
        
    } catch (error) {
        console.error('Error cargando activos:', error)
        return []
    }
}

// ============================================================
// OBTENER SERVICIOS
// ============================================================

export async function cargarServicios() {
    try {
        const { data, error } = await sb
            .from('servicios')
            .select('*')
            .eq('activo', true)
            .order('nombre')
        
        if (error) throw error
        
        serviciosDisponibles = data || []
        return serviciosDisponibles
        
    } catch (error) {
        console.error('Error cargando servicios:', error)
        return []
    }
}

// ============================================================
// OBTENER TIPOS DE TAREA POR SERVICIO
// ============================================================

export async function cargarTiposTarea(servicioId = null) {
    try {
        let query = sb
            .from('tipos_tarea')
            .select('*')
            .eq('activo', true)
            .order('nombre')
        
        if (servicioId) {
            query = query.eq('servicio_id', servicioId)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        tiposTareaDisponibles = data || []
        return tiposTareaDisponibles
        
    } catch (error) {
        console.error('Error cargando tipos de tarea:', error)
        return []
    }
}

// ============================================================
// OBTENER PLANTILLAS DE TAREA POR TIPO
// ============================================================

export async function cargarPlantillasTarea(empresaId, tipoTareaId = null) {
    if (!empresaId) return []
    
    try {
        let query = sb
            .from('plantillas_tarea')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('activo', true)
            .order('titulo')
        
        if (tipoTareaId) {
            query = query.eq('tipo_tarea_id', tipoTareaId)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        plantillasDisponibles = data || []
        return plantillasDisponibles
        
    } catch (error) {
        console.error('Error cargando plantillas:', error)
        return []
    }
}

// ============================================================
// CREAR NUEVA TAREA (CON NUEVO ESTADO INICIAL Y FORMATO TDDMMNNNN)
// ============================================================

export async function crearTarea(datos) {
    const { 
        clienteId, activoId, tecnicoId, servicioId, tipoTareaId, plantillaId,
        titulo, descripcion, prioridad, fechaLimite, tiempoEstimado
    } = datos
    
    if (!clienteId || !servicioId || !tipoTareaId || !titulo) {
        mostrarMensaje('Completa los campos obligatorios', 'error')
        return null
    }
    
    mostrarModalCarga('Creando tarea...')
    
    try {
        // ✅ Generar número de tarea: TDDMMNNNN
        const hoy = new Date()
        const dia = String(hoy.getDate()).padStart(2, '0')
        const mes = String(hoy.getMonth() + 1).padStart(2, '0')
        const fechaStr = `${dia}${mes}`
        
        const { data: ultimaTarea } = await sb
            .from('tareas')
            .select('numero_tarea')
            .like('numero_tarea', `T${fechaStr}%`)
            .order('created_at', { ascending: false })
            .limit(1)
        
        let secuencia = 1
        if (ultimaTarea && ultimaTarea.length > 0) {
            const numStr = ultimaTarea[0].numero_tarea
            const ultimaSecuencia = parseInt(numStr.slice(-4))
            secuencia = ultimaSecuencia + 1
        }
        
        const numeroTarea = `T${fechaStr}${String(secuencia).padStart(4, '0')}`
        
        const empresaId = await getEmpresaId()
        if (!empresaId) {
            throw new Error('No se pudo obtener la empresa del gerente')
        }
        
        const estadoInicial = tecnicoId ? ESTADOS_TAREA.PENDIENTE_ACEPTACION : ESTADOS_TAREA.PENDIENTE_ACEPTACION
        
        const { data, error } = await sb
            .from('tareas')
            .insert({
                empresa_id: empresaId,
                cliente_id: clienteId,
                perfil_id: tecnicoId || null,
                activo_id: activoId || null,
                servicio_id: servicioId || null,
                tipo_tarea_id: tipoTareaId || null,
                plantilla_id: plantillaId || null,
                numero_tarea: numeroTarea,
                titulo: titulo,
                descripcion: descripcion || '',
                prioridad: prioridad || 'media',
                estado: estadoInicial,
                fecha_fin_prevista: fechaLimite || null,
                tiempo_estimado_minutos: tiempoEstimado || null,
                leida: false,
                fecha_asignacion: tecnicoId ? new Date() : null
            })
            .select()
            .single()
        
        if (error) {
            console.error('Error en insert:', error)
            throw error
        }
        
        await registrarCambioEstado(
            data.id,
            null,
            estadoInicial,
            'gerente',
            'Tarea creada'
        )
        
        if (tecnicoId) {
            await registrarHistorialAsignacion(data.id, tecnicoId, 'asignacion')
        }
        
        if (tecnicoId) {
            await crearNotificacion(
                tecnicoId,
                'Nueva tarea asignada',
                `Tienes una nueva tarea: ${titulo} (${numeroTarea})`,
                'tarea_nueva',
                data.id
            )
        }
        
        await crearNotificacionCliente(
            clienteId,
            'Nueva tarea pendiente',
            `Se ha creado una nueva tarea: ${titulo} (${numeroTarea})`,
            'tarea_pendiente',
            data.id
        )
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Tarea ${numeroTarea} creada correctamente`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando tarea:', error)
        mostrarMensaje('Error al crear tarea: ' + error.message, 'error')
        return null
    }
}

// ============================================================
// CAMBIAR ESTADO DE TAREA
// ============================================================

export async function cambiarEstadoTarea(tareaId, nuevoEstado, comentario = '', usuarioTipo = 'gerente') {
    mostrarModalCarga('Actualizando estado...')
    
    try {
        const { data: tareaActual, error: getError } = await sb
            .from('tareas')
            .select('*')
            .eq('id', tareaId)
            .single()
        
        if (getError) throw getError
        
        const estadoAnterior = tareaActual.estado
        
        const transicionValida = validarTransicionEstado(estadoAnterior, nuevoEstado)
        if (!transicionValida) {
            cerrarModalCarga()
            mostrarMensaje(`❌ No se puede pasar de ${estadoAnterior} a ${nuevoEstado}`, 'error')
            return false
        }
        
        const updateData = {
            estado: nuevoEstado,
            updated_at: new Date()
        }
        
        switch (nuevoEstado) {
            case ESTADOS_TAREA.ACEPTADA:
                updateData.fecha_aceptacion = new Date()
                updateData.aceptada_por = await getPerfilId()
                break
            case ESTADOS_TAREA.EN_DESPLAZAMIENTO:
                updateData.fecha_desplazamiento = new Date()
                break
            case ESTADOS_TAREA.TRABAJANDO_ONSITE:
                updateData.fecha_llegada = new Date()
                break
            case ESTADOS_TAREA.TERMINADA:
                updateData.fecha_fin_trabajo = new Date()
                if (tareaActual.fecha_desplazamiento) {
                    const inicio = new Date(tareaActual.fecha_desplazamiento)
                    const fin = new Date()
                    updateData.tiempo_real_minutos = Math.floor((fin - inicio) / 60000)
                }
                break
            case ESTADOS_TAREA.SUSPENDIDA:
                updateData.fecha_suspension = new Date()
                if (comentario) updateData.motivo_suspension = comentario
                break
        }
        
        const { data: tareaActualizada, error: updateError } = await sb
            .from('tareas')
            .update(updateData)
            .eq('id', tareaId)
            .select()
            .single()
        
        if (updateError) throw updateError
        
        await registrarCambioEstado(
            tareaId,
            estadoAnterior,
            nuevoEstado,
            usuarioTipo,
            comentario
        )
        
        await notificarCambioEstado(tareaActualizada, estadoAnterior, nuevoEstado)
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Estado actualizado a: ${getEstadoLabel(nuevoEstado)}`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error cambiando estado:', error)
        mostrarMensaje('Error al cambiar estado', 'error')
        return false
    }
}

// ============================================================
// REASIGNAR TAREA
// ============================================================

export async function reasignarTarea(tareaId, nuevoTecnicoId, motivo = '') {
    mostrarModalCarga('Reasignando tarea...')
    
    try {
        const { data: tareaActual, error: getError } = await sb
            .from('tareas')
            .select('*')
            .eq('id', tareaId)
            .single()
        
        if (getError) throw getError
        
        const estadosReseteables = [
            ESTADOS_TAREA.EN_DESPLAZAMIENTO,
            ESTADOS_TAREA.TRABAJANDO_ONSITE,
            ESTADOS_TAREA.SUSPENDIDA
        ]
        
        let nuevoEstado = tareaActual.estado
        if (estadosReseteables.includes(tareaActual.estado)) {
            nuevoEstado = ESTADOS_TAREA.PENDIENTE_ACEPTACION
        }
        
        const { data: tareaReasignada, error: updateError } = await sb
            .from('tareas')
            .update({
                perfil_id: nuevoTecnicoId,
                estado: nuevoEstado,
                leida: false,
                fecha_asignacion: new Date(),
                fecha_aceptacion: null,
                fecha_desplazamiento: null,
                fecha_llegada: null,
                fecha_fin_trabajo: null,
                aceptada_por: null,
                rechazada_por: null,
                fecha_rechazo: null,
                motivo_rechazo: null,
                motivo_suspension: null,
                updated_at: new Date()
            })
            .eq('id', tareaId)
            .select()
            .single()
        
        if (updateError) throw updateError
        
        // ✅ MEJOR - Con nombre del técnico
const nombreTecnico = await getNombreTecnico(nuevoTecnicoId)
await registrarCambioEstado(
    tareaId,
    tareaActual.estado,
    nuevoEstado,
    'gerente',
    `Reasignada a ${nombreTecnico} - ${motivo}`
)
async function getNombreTecnico(tecnicoId) {
    try {
        const { data } = await sb
            .from('perfiles')
            .select('nombre_razon_social')
            .eq('id', tecnicoId)
            .single()
        return data?.nombre_razon_social || 'técnico'
    } catch {
        return 'técnico'
    }
}
        
        await registrarHistorialAsignacion(tareaId, nuevoTecnicoId, 'reasignacion', motivo)
        
        await crearNotificacion(
            nuevoTecnicoId,
            'Tarea reasignada',
            `Se te ha reasignado la tarea: ${tareaActual.titulo} (${tareaActual.numero_tarea})`,
            'tarea_reasignada',
            tareaId
        )
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Tarea reasignada correctamente`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error reasignando tarea:', error)
        mostrarMensaje('Error al reasignar tarea', 'error')
        return false
    }
}

// ============================================================
// ASIGNAR/REASIGNAR TAREA (LEGACY)
// ============================================================

export async function asignarTarea(tareaId, tecnicoId, motivo = null) {
    return await reasignarTarea(tareaId, tecnicoId, motivo)
}

// ============================================================
// VALIDAR TRANSICIÓN DE ESTADOS
// ============================================================

function validarTransicionEstado(estadoActual, nuevoEstado) {
    const transiciones = {
        [ESTADOS_TAREA.PENDIENTE_ACEPTACION]: [ESTADOS_TAREA.VISTA, ESTADOS_TAREA.RECHAZADA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.VISTA]: [ESTADOS_TAREA.ACEPTADA, ESTADOS_TAREA.RECHAZADA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.ACEPTADA]: [ESTADOS_TAREA.EN_DESPLAZAMIENTO, ESTADOS_TAREA.SUSPENDIDA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.EN_DESPLAZAMIENTO]: [ESTADOS_TAREA.TRABAJANDO_ONSITE, ESTADOS_TAREA.SUSPENDIDA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.TRABAJANDO_ONSITE]: [ESTADOS_TAREA.TERMINADA, ESTADOS_TAREA.SUSPENDIDA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.SUSPENDIDA]: [ESTADOS_TAREA.ACEPTADA, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.RECHAZADA]: [ESTADOS_TAREA.PENDIENTE_ACEPTACION, ESTADOS_TAREA.CANCELADA],
        [ESTADOS_TAREA.TERMINADA]: [],
        [ESTADOS_TAREA.CANCELADA]: []
    }
    
    return transiciones[estadoActual]?.includes(nuevoEstado) || false
}

// ============================================================
// REGISTRAR CAMBIO DE ESTADO EN historial_estados_tareas
// ============================================================

async function registrarCambioEstado(tareaId, estadoAnterior, estadoNuevo, usuarioTipo, comentario = '') {
    try {
        const { error } = await sb
            .from('historial_estados_tareas')
            .insert({
                tarea_id: tareaId,
                estado_anterior: estadoAnterior,
                estado_nuevo: estadoNuevo,
                usuario_tipo: usuarioTipo,
                perfil_id: await getPerfilId(),
                comentario: comentario,
                fecha: new Date().toISOString()  // ✅ Guarda fecha y hora
            })
        
        if (error) console.error('Error registrando historial:', error)
    } catch (error) {
        console.error('Error en registrarCambioEstado:', error)
    }
}

// ============================================================
// CREAR NOTIFICACIÓN PARA TÉCNICO
// ============================================================

async function crearNotificacion(perfilId, titulo, mensaje, tipo, tareaId) {
    try {
        const { error } = await sb
            .from('notificaciones')
            .insert({
                perfil_id: perfilId,
                titulo: titulo,
                mensaje: mensaje,
                tipo: tipo,
                tarea_id: tareaId,
                leida: false,
                fecha: new Date()
            })
        
        if (error) console.error('Error creando notificación:', error)
    } catch (error) {
        console.error('Error en crearNotificacion:', error)
    }
}

// ============================================================
// CREAR NOTIFICACIÓN PARA CLIENTE
// ============================================================

async function crearNotificacionCliente(clienteId, titulo, mensaje, tipo, tareaId) {
    try {
        const { data: clientePerfil } = await sb
            .from('clientes')
            .select('id')
            .eq('id', clienteId)
            .single()
        
        if (clientePerfil) {
            await crearNotificacion(clientePerfil.id, titulo, mensaje, tipo, tareaId)
        }
    } catch (error) {
        console.error('Error en crearNotificacionCliente:', error)
    }
}


// ============================================================
// REGISTRAR HISTORIAL DE ASIGNACIONES (CORREGIDO - OPCIÓN 1)
// ============================================================

async function registrarHistorialAsignacion(tareaId, tecnicoId, tipo, motivo = null) {
    try {
        // ✅ Obtener el usuario actual
        const { data: { user } } = await sb.auth.getUser()
        if (!user) {
            console.error('No hay usuario autenticado')
            return
        }
        
        // ✅ Buscar el perfil del usuario
        const { data: perfil, error: perfilError } = await sb
            .from('perfiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
        
        if (perfilError || !perfil) {
            console.error('Perfil no encontrado para el usuario:', user.id)
            return
        }
        
        const { error } = await sb
            .from('historial_asignaciones')
            .insert({
                tarea_id: tareaId,
                tecnico_id: tecnicoId,
                asignado_por: perfil.id,  // ✅ AHORA ES perfil.id
                tipo: tipo,
                motivo: motivo
            })
        
        if (error) {
            console.error('Error registrando historial:', error)
        }
    } catch (error) {
        console.error('Error en registrarHistorialAsignacion:', error)
    }
}

// ============================================================
// NOTIFICAR CAMBIO DE ESTADO
// ============================================================

async function notificarCambioEstado(tarea, estadoAnterior, estadoNuevo) {
    const mensajes = {
        [ESTADOS_TAREA.PENDIENTE_ACEPTACION]: {
            tecnico: `Nueva tarea pendiente de aceptación: ${tarea.titulo}`,
            cliente: `Tarea creada, pendiente de aceptación: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.VISTA]: {
            tecnico: null,
            cliente: `El técnico ha visto tu tarea: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.ACEPTADA]: {
            tecnico: null,
            cliente: `Tarea aceptada por el técnico: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.EN_DESPLAZAMIENTO]: {
            tecnico: null,
            cliente: `Técnico en camino a tu ubicación: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.TRABAJANDO_ONSITE]: {
            tecnico: null,
            cliente: `Técnico trabajando en tu ubicación: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.TERMINADA]: {
            tecnico: `Tarea completada: ${tarea.titulo}`,
            cliente: `Tarea completada: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.SUSPENDIDA]: {
            tecnico: `Tarea suspendida: ${tarea.titulo}`,
            cliente: `Tarea suspendida: ${tarea.titulo}`
        },
        [ESTADOS_TAREA.RECHAZADA]: {
            tecnico: `Tarea rechazada: ${tarea.titulo}`,
            cliente: `Tarea rechazada: ${tarea.titulo}`
        }
    }
    
    const mensaje = mensajes[estadoNuevo]
    if (!mensaje) return
    
    if (tarea.perfil_id && mensaje.tecnico) {
        await crearNotificacion(
            tarea.perfil_id,
            `Estado actualizado: ${getEstadoLabel(estadoNuevo)}`,
            mensaje.tecnico,
            'tarea_estado',
            tarea.id
        )
    }
    
    if (tarea.empresa_id && mensaje.cliente) {
        await crearNotificacionCliente(
            tarea.empresa_id,
            `Estado actualizado: ${getEstadoLabel(estadoNuevo)}`,
            mensaje.cliente,
            'tarea_estado',
            tarea.id
        )
    }
}

// ============================================================
// OBTENER HISTORIAL DE ESTADOS
// ============================================================

export async function getHistorialEstados(tareaId) {
    try {
        const { data, error } = await sb
            .from('historial_estados_tareas')
            .select('*, fecha_hora')  // ✅ FORZAR fecha_hora
            .eq('tarea_id', tareaId)
            .order('fecha', { ascending: false })
        
        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error obteniendo historial de estados:', error)
        return []
    }
}

// ============================================================
// OBTENER HISTORIAL DE ASIGNACIONES (CORREGIDO)
// ============================================================

export async function getHistorialAsignaciones(tareaId) {
    const { data, error } = await sb
        .from('historial_asignaciones')
        .select(`
            *,
            tecnico:perfiles!tecnico_id(id, nombre_razon_social),
            asignador:perfiles!asignado_por(id, nombre_razon_social)
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
// OBTENER LABEL DE ESTADO
// ============================================================

export function getEstadoLabel(estado) {
    const estados = {
        'pendiente_aceptacion': 'Pendiente aceptación',
        'vista': 'Vista',
        'aceptada': 'Aceptada',
        'rechazada': 'Rechazada',
        'en_desplazamiento': 'En desplazamiento',
        'trabajando_onsite': 'Trabajando OnSite',
        'terminada': 'Terminada',
        'suspendida': 'Suspendida',
        'cancelada': 'Cancelada',
        'pendiente': 'Pendiente',
        'en_progreso': 'En progreso',
        'completada': 'Completada'
    }
    return estados[estado] || estado || 'Desconocido'
}

// ============================================================
// OBTENER PERFIL ID ACTUAL
// ============================================================

async function getPerfilId() {
    try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return null
        
        const { data: perfil } = await sb
            .from('perfiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
        
        return perfil?.id || null
    } catch (error) {
        console.error('Error obteniendo perfil ID:', error)
        return null
    }
}

// ============================================================
// OBTENER ESTADOS DISPONIBLES PARA UN ESTADO ACTUAL
// ============================================================

export function getEstadosDisponibles(estadoActual) {
    const transiciones = {
        'pendiente_aceptacion': [
            { value: 'vista', label: '👁️ Marcar como vista' },
            { value: 'rechazada', label: '❌ Rechazar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'vista': [
            { value: 'aceptada', label: '✅ Aceptar tarea' },
            { value: 'rechazada', label: '❌ Rechazar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'aceptada': [
            { value: 'en_desplazamiento', label: '🚗 Iniciar desplazamiento' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'en_desplazamiento': [
            { value: 'trabajando_onsite', label: '🔧 Llegada al sitio' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'trabajando_onsite': [
            { value: 'terminada', label: '✅ Finalizar tarea' },
            { value: 'suspendida', label: '⏸️ Suspender tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'suspendida': [
            { value: 'aceptada', label: '▶️ Reactivar tarea' },
            { value: 'cancelada', label: '❌ Cancelar tarea' }
        ],
        'rechazada': [
            { value: 'pendiente_aceptacion', label: '🔄 Reasignar y reiniciar' },
            { value: 'cancelada', label: '❌ Cancelar definitivamente' }
        ],
        'terminada': [],
        'cancelada': []
    }
    
    return transiciones[estadoActual] || []
}

// ============================================================
// RENDERIZAR LISTA DE TAREAS
// ============================================================

export function renderizarListaTareas(tareas, onVerDetalle, onAsignar, tecnicos, clientes, activos) {
    const estadisticas = generarEstadisticas(tareas, tecnicos)
    
    if (!tareas || tareas.length === 0) {
        return `
            ${renderizarResumenTareas(estadisticas)}
            ${renderizarFiltrosTareas(tareas, tecnicos, clientes, activos)}
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                📭 No hay tareas creadas
            </div>
        `
    }
    
    let html = `
        ${renderizarResumenTareas(estadisticas)}
        ${renderizarFiltrosTareas(tareas, tecnicos, clientes, activos)}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 4px;">
            <span style="font-size:13px; color:var(--ios-gray);">
                📊 <span id="contadorResultados">${tareas.length}</span> tareas encontradas
            </span>
        </div>
        
        <div style="overflow-x: auto;" id="tablaTareasContainer">
            ${renderizarTablaTareas(tareas)}
        </div>
    `
    
    return html
}

// ============================================================
// RENDERIZAR TABLA DE TAREAS (para filtros dinámicos)
// ============================================================

function renderizarTablaTareas(tareas) {
    if (!tareas || tareas.length === 0) {
        return `<div class="text-center" style="padding:30px; color:var(--ios-gray);">🔍 No hay tareas que coincidan con los filtros</div>`
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nº Tarea</th>
                    <th>Título</th>
                    <th>Cliente / Activo</th>
                    <th>Técnico</th>
                    <th>Servicio</th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha límite</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `
    
    for (const tarea of tareas) {
        const tecnicoNombre = tarea.perfiles?.nombre_razon_social || 'Sin asignar'
        const clienteNombre = tarea.cliente?.nombre || '-'
        const activoNombre = tarea.activos?.nombre || ''
        const activoDireccion = tarea.activos?.direccion || ''
        const servicioNombre = tarea.servicio?.nombre || '-'
        const servicioIcono = tarea.servicio?.icono || ''
        const tipoNombre = tarea.tipo_tarea?.nombre || '-'
        
        const puedeReasignar = !['terminada', 'cancelada'].includes(tarea.estado)
        
        let clienteActivo = clienteNombre
        if (activoNombre) {
            clienteActivo += `<br><small style="color:var(--ios-gray);">🏗️ ${escapeHtml(activoNombre)}`
            if (activoDireccion) {
                clienteActivo += ` - ${escapeHtml(activoDireccion)}`
            }
            clienteActivo += `</small>`
        }
        
        html += `
            <tr>
                <td><strong>${escapeHtml(tarea.numero_tarea)}</strong></td>
                <td>${escapeHtml(tarea.titulo)}</td>
                <td>${clienteActivo}</td>
                <td>${escapeHtml(tecnicoNombre)}</td>
                <td>${servicioIcono} ${escapeHtml(servicioNombre)}</td>
                <td>${escapeHtml(tipoNombre)}</td>
                <td>${getPrioridadBadge(tarea.prioridad)}</td>
                <td>${getEstadoBadge(tarea.estado)}</td>
                <td style="font-size:12px;">${formatearFecha(tarea.fecha_fin_prevista) || '-'}</td>
                <td>
                    <button class="btn-sm ver-tarea" data-id="${tarea.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                    ${puedeReasignar ? 
                        `<button class="btn-sm asignar-tarea" data-id="${tarea.id}" style="background:#e67e22; color:white;">🔄</button>` : ''}
                </td>
            </tr>
        `
    }
    
    html += `
            </tbody>
        </table>
    `
    
    return html
}

// ============================================================
// RENDERIZAR FORMULARIO CREAR TAREA (CON SERVICIOS Y TIPOS)
// ============================================================

// ============================================================
// RENDERIZAR FORMULARIO CREAR TAREA (SIMPLIFICADO)
// ============================================================

export function renderizarFormularioCrear(clientes, tecnicos, servicios, tiposTarea, plantillas, onGuardar, onCancelar) {
    const clientesOptions = clientes.map(c => 
        `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`
    ).join('')
    
    const tecnicosOptions = `
        <option value="">-- Sin asignar --</option>
        ${tecnicos.map(t => 
            `<option value="${t.id}">${escapeHtml(t.nombre_razon_social)}</option>`
        ).join('')}
    `
    
    const serviciosOptions = `
        <option value="">-- Seleccionar servicio --</option>
        ${servicios.map(s => 
            `<option value="${s.id}" data-icon="${s.icono || '📋'}">${s.icono || '📋'} ${escapeHtml(s.nombre)}</option>`
        ).join('')}
    `
    
    const tiposOptions = `
        <option value="">-- Seleccionar tipo --</option>
        ${tiposTarea.map(t => 
            `<option value="${t.id}" data-servicio="${t.servicio_id}">${escapeHtml(t.nombre)}</option>`
        ).join('')}
    `
    
    const plantillasOptions = `
        <option value="">-- Seleccionar plantilla --</option>
        ${plantillas.map(p => 
            `<option value="${p.id}" data-tipo="${p.tipo_tarea_id}">${escapeHtml(p.titulo)}</option>`
        ).join('')}
    `
    
    return `
        <div class="card">
            <div class="card-header">➕ Crear nueva tarea</div>
            
            <!-- Servicio y Tipo -->
            <div class="row-flex">
                <div class="grupo">
                    <label>🏗️ Servicio *</label>
                    <select id="tareaServicio" required>
                        ${serviciosOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>📋 Tipo de tarea *</label>
                    <select id="tareaTipo" required>
                        ${tiposOptions}
                    </select>
                </div>
            </div>
            
            <!-- Plantilla -->
            <div class="row-flex" id="plantillaContainer" style="display:none;">
                <div class="grupo">
                    <label>📄 Plantilla</label>
                    <select id="tareaPlantilla">
                        ${plantillasOptions}
                    </select>
                </div>
            </div>
            
            <!-- Cliente y Activo -->
            <div class="row-flex">
                <div class="grupo">
                    <label>🏢 Cliente *</label>
                    <select id="tareaCliente" required>
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
            
            <!-- Técnico y Prioridad -->
            <div class="row-flex">
                <div class="grupo">
                    <label>👨‍🔧 Técnico</label>
                    <select id="tareaTecnico">
                        ${tecnicosOptions}
                    </select>
                    <small>La tarea se creará en estado "Pendiente de aceptación"</small>
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
            
            <!-- Tiempo estimado y Fecha límite -->
            <div class="row-flex">
                <div class="grupo">
                    <label>⏱️ Tiempo estimado (minutos)</label>
                    <input type="number" id="tareaTiempoEstimado" placeholder="60" min="1">
                </div>
                <div class="grupo">
                    <label>📅 Fecha límite</label>
                    <input type="date" id="tareaFechaLimite">
                </div>
            </div>
            
            <!-- Descripción / Instrucciones -->
<div class="grupo">
    <label>📋 Descripción / Instrucciones</label>
    <div id="editTareaDescripcion" contenteditable="true" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--ios-border); font-size:14px; min-height:300px; background:white; overflow-y:auto; line-height:1.6;">
        ${tarea.descripcion || ''}
    </div>
    <small style="color:var(--ios-gray);">Puedes editar el contenido directamente. Usa Ctrl+B para negrita, Ctrl+I para cursiva.</small>
</div>
            
            <!-- Botones -->
            <div class="btn-group" style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="btnGuardarTarea" class="btn-success">💾 Guardar tarea</button>
                <button id="btnCancelarTarea" class="btn-danger">✖ Cancelar</button>
            </div>
        </div>
    `
}

// ============================================================
// RENDERIZAR FORMULARIO EDITAR TAREA (CON DATOS CARGADOS)
// ============================================================

export function renderizarFormularioEditar(tarea, clientes, tecnicos, servicios, tiposTarea, plantillas) {
    const clientesOptions = clientes.map(c => 
        `<option value="${c.id}" ${c.id === tarea.cliente_id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
    ).join('')
    
    const tecnicosOptions = `
        <option value="">-- Sin asignar --</option>
        ${tecnicos.map(t => 
            `<option value="${t.id}" ${t.id === tarea.perfil_id ? 'selected' : ''}>${escapeHtml(t.nombre_razon_social)}</option>`
        ).join('')}
    `
    
    const serviciosOptions = `
        <option value="">-- Seleccionar servicio --</option>
        ${servicios.map(s => 
            `<option value="${s.id}" ${s.id === tarea.servicio_id ? 'selected' : ''} data-icon="${s.icono || '📋'}">${s.icono || '📋'} ${escapeHtml(s.nombre)}</option>`
        ).join('')}
    `
    
    const tiposOptions = `
        <option value="">-- Seleccionar tipo --</option>
        ${tiposTarea.map(t => 
            `<option value="${t.id}" ${t.id === tarea.tipo_tarea_id ? 'selected' : ''} data-servicio="${t.servicio_id}">${escapeHtml(t.nombre)}</option>`
        ).join('')}
    `
    
    const plantillasOptions = `
        <option value="">-- Seleccionar plantilla --</option>
        ${plantillas.map(p => 
            `<option value="${p.id}" ${p.id === tarea.plantilla_id ? 'selected' : ''} data-tipo="${p.tipo_tarea_id}">${escapeHtml(p.titulo)}</option>`
        ).join('')}
    `
    
    return `
        <div class="card">
            <div class="card-header">✏️ Editar tarea</div>
            <input type="hidden" id="editTareaId" value="${tarea.id}">
            
            <!-- Servicio y Tipo -->
            <div class="row-flex">
                <div class="grupo">
                    <label>🏗️ Servicio *</label>
                    <select id="editTareaServicio" required>
                        ${serviciosOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>📋 Tipo de tarea *</label>
                    <select id="editTareaTipo" required>
                        ${tiposOptions}
                    </select>
                </div>
            </div>
            
            <!-- Plantilla -->
            <div class="row-flex" id="editPlantillaContainer" style="display:${tarea.plantilla_id ? 'flex' : 'none'};">
                <div class="grupo">
                    <label>📄 Plantilla</label>
                    <select id="editTareaPlantilla">
                        ${plantillasOptions}
                    </select>
                </div>
            </div>
            
            <!-- Cliente y Activo -->
            <div class="row-flex">
                <div class="grupo">
                    <label>🏢 Cliente *</label>
                    <select id="editTareaCliente" required>
                        <option value="">-- Seleccionar cliente --</option>
                        ${clientesOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>🏗️ Activo</label>
                    <select id="editTareaActivo">
                        <option value="">-- Seleccionar activo --</option>
                    </select>
                </div>
            </div>
            
            <!-- Técnico y Prioridad -->
            <div class="row-flex">
                <div class="grupo">
                    <label>👨‍🔧 Técnico</label>
                    <select id="editTareaTecnico">
                        ${tecnicosOptions}
                    </select>
                </div>
                <div class="grupo">
                    <label>⭐ Prioridad</label>
                    <select id="editTareaPrioridad">
                        <option value="baja" ${tarea.prioridad === 'baja' ? 'selected' : ''}>🟢 Baja</option>
                        <option value="media" ${tarea.prioridad === 'media' ? 'selected' : ''}>🟡 Media</option>
                        <option value="alta" ${tarea.prioridad === 'alta' ? 'selected' : ''}>🔴 Alta</option>
                        <option value="urgente" ${tarea.prioridad === 'urgente' ? 'selected' : ''}>🔥 Urgente</option>
                    </select>
                </div>
            </div>
            
            <!-- Tiempo estimado y Fecha límite -->
            <div class="row-flex">
                <div class="grupo">
                    <label>⏱️ Tiempo estimado (minutos)</label>
                    <input type="number" id="editTareaTiempoEstimado" placeholder="60" min="1" value="${tarea.tiempo_estimado_minutos || ''}">
                </div>
                <div class="grupo">
                    <label>📅 Fecha límite</label>
                    <input type="date" id="editTareaFechaLimite" value="${tarea.fecha_fin_prevista || ''}">
                </div>
            </div>
            
            <!-- Título -->
            <div class="grupo">
                <label>📝 Título *</label>
                <input type="text" id="editTareaTitulo" value="${escapeHtml(tarea.titulo || '')}" placeholder="Título de la tarea">
            </div>
            
            <!-- Descripción / Instrucciones (contentEditable) -->
            <div class="grupo">
                <label>📋 Descripción / Instrucciones</label>
                <div id="editTareaDescripcion" contenteditable="true" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--ios-border); font-size:14px; min-height:300px; background:white; overflow-y:auto; line-height:1.6;">
                    ${tarea.descripcion || ''}
                </div>
            </div>
            
            <!-- Estado -->
            <div class="row-flex">
                <div class="grupo">
                    <label>📌 Estado</label>
                    <select id="editTareaEstado">
                        <option value="pendiente_aceptacion" ${tarea.estado === 'pendiente_aceptacion' ? 'selected' : ''}>⏳ Pendiente aceptación</option>
                        <option value="vista" ${tarea.estado === 'vista' ? 'selected' : ''}>👁️ Vista</option>
                        <option value="aceptada" ${tarea.estado === 'aceptada' ? 'selected' : ''}>✅ Aceptada</option>
                        <option value="rechazada" ${tarea.estado === 'rechazada' ? 'selected' : ''}>❌ Rechazada</option>
                        <option value="en_desplazamiento" ${tarea.estado === 'en_desplazamiento' ? 'selected' : ''}>🚗 En desplazamiento</option>
                        <option value="trabajando_onsite" ${tarea.estado === 'trabajando_onsite' ? 'selected' : ''}>🔧 Trabajando OnSite</option>
                        <option value="terminada" ${tarea.estado === 'terminada' ? 'selected' : ''}>✅ Terminada</option>
                        <option value="suspendida" ${tarea.estado === 'suspendida' ? 'selected' : ''}>⏸️ Suspendida</option>
                        <option value="cancelada" ${tarea.estado === 'cancelada' ? 'selected' : ''}>❌ Cancelada</option>
                    </select>
                </div>
            </div>
            
            <!-- Botones -->
            <div class="btn-group" style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
                <button id="btnGuardarEdicionTarea" class="btn-success">💾 Guardar cambios</button>
                <button id="btnCancelarEdicionTarea" class="btn-danger">✖ Cancelar</button>
                <button id="btnRegenerarDescEditar" class="btn-info" style="background:#8b5cf6;">🔄 Regenerar con IA</button>
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
    
    const estadoActual = getEstadoLabel(tarea.estado)
    
    return `
        <div class="form-group">
            <label>📋 Tarea: <strong>${escapeHtml(tarea.titulo)}</strong></label>
            <p>Estado actual: <strong>${estadoActual}</strong></p>
            <p>${tarea.perfil_id ? `Técnico actual: ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}` : 'Sin técnico asignado'}</p>
        </div>
        <div class="form-group">
            <label>👨‍🔧 Nuevo técnico</label>
            <select id="asignarTecnico" style="width:100%; padding:12px; border-radius:12px;">
                <option value="">-- Seleccionar --</option>
                ${tecnicosOptions}
            </select>
        </div>
        <div class="form-group">
            <label>📝 Motivo de reasignación</label>
            <textarea id="asignarMotivo" rows="2" placeholder="Motivo del cambio de asignación..."></textarea>
        </div>
        <div class="alert-info" style="background: #fef3c7; padding: 12px; border-radius: 12px; margin-top: 8px;">
            <small>⚠️ Al reasignar, la tarea volverá al estado <strong>"Pendiente de aceptación"</strong></small>
        </div>
    `
}

// ============================================================
// RENDERIZAR DETALLE DE TAREA CON ESTADOS
// ============================================================

export async function renderizarDetalleTarea(tarea, onCambiarEstado, onReasignar) {
    const historialEstados = await getHistorialEstados(tarea.id)
    const historialAsignaciones = await getHistorialAsignaciones(tarea.id)
    const estadosDisponibles = getEstadosDisponibles(tarea.estado)
    
    let html = `
        <div class="card">
            <div class="card-header">
                📋 ${escapeHtml(tarea.numero_tarea)} - ${escapeHtml(tarea.titulo)}
                <div style="float:right;">
                    <button class="btn-sm btn-reasignar" data-id="${tarea.id}" style="background:#e67e22; color:white;">🔄 Reasignar</button>
                </div>
            </div>
            
            <div style="background:var(--ios-bg); padding:16px; border-radius:12px;">
                <div class="row-flex">
                    <div class="grupo"><strong>Cliente:</strong> ${escapeHtml(tarea.cliente?.nombre || '-')}</div>
                    <div class="grupo"><strong>Técnico:</strong> ${escapeHtml(tarea.perfiles?.nombre_razon_social || 'Sin asignar')}</div>
                </div>
                <div class="row-flex">
                    <div class="grupo"><strong>Servicio:</strong> ${tarea.servicio?.icono || ''} ${escapeHtml(tarea.servicio?.nombre || '-')}</div>
                    <div class="grupo"><strong>Tipo:</strong> ${escapeHtml(tarea.tipo_tarea?.nombre || '-')}</div>
                </div>
                <div class="row-flex">
                    <div class="grupo"><strong>Prioridad:</strong> ${getPrioridadBadge(tarea.prioridad)}</div>
                    <div class="grupo"><strong>Estado:</strong> ${getEstadoBadge(tarea.estado)}</div>
                </div>
                <div class="row-flex">
                    <div class="grupo"><strong>Fecha creación:</strong> ${formatearFecha(tarea.created_at)}</div>
                    <div class="grupo"><strong>Fecha límite:</strong> ${formatearFecha(tarea.fecha_fin_prevista) || 'Sin fecha'}</div>
                </div>
                ${tarea.fecha_aceptacion ? `<div class="row-flex"><div class="grupo"><strong>Fecha aceptación:</strong> ${formatearFecha(tarea.fecha_aceptacion)}</div></div>` : ''}
                ${tarea.fecha_desplazamiento ? `<div class="row-flex"><div class="grupo"><strong>Inicio desplazamiento:</strong> ${formatearFecha(tarea.fecha_desplazamiento)}</div></div>` : ''}
                ${tarea.fecha_llegada ? `<div class="row-flex"><div class="grupo"><strong>Llegada al sitio:</strong> ${formatearFecha(tarea.fecha_llegada)}</div></div>` : ''}
                ${tarea.fecha_fin_trabajo ? `<div class="row-flex"><div class="grupo"><strong>Finalización:</strong> ${formatearFecha(tarea.fecha_fin_trabajo)}</div></div>` : ''}
                ${tarea.tiempo_estimado_minutos ? `<div class="row-flex"><div class="grupo"><strong>Tiempo estimado:</strong> ${tarea.tiempo_estimado_minutos} min</div></div>` : ''}
                ${tarea.tiempo_real_minutos ? `<div class="row-flex"><div class="grupo"><strong>Tiempo real:</strong> ${tarea.tiempo_real_minutos} min</div></div>` : ''}
                ${tarea.motivo_suspension ? `<div class="row-flex"><div class="grupo"><strong>Motivo suspensión:</strong> ${escapeHtml(tarea.motivo_suspension)}</div></div>` : ''}
                ${tarea.motivo_rechazo ? `<div class="row-flex"><div class="grupo"><strong>Motivo rechazo:</strong> ${escapeHtml(tarea.motivo_rechazo)}</div></div>` : ''}
                
                <div style="margin-top:12px;">
                    <strong>Descripción:</strong><br>
                    ${escapeHtml(tarea.descripcion || '-')}
                </div>
                ${tarea.orden_trabajo ? `
                <div style="margin-top:12px;">
                    <strong>📋 Orden de trabajo:</strong><br>
                    <div style="background:white; padding:12px; border-radius:8px;">${escapeHtml(tarea.orden_trabajo)}</div>
                </div>` : ''}
                ${tarea.nota_interna ? `
                <div style="margin-top:12px; background:#f1f5f9; padding:12px; border-radius:8px;">
                    <strong>📝 Nota interna:</strong><br>
                    ${escapeHtml(tarea.nota_interna)}
                </div>` : ''}
                ${tarea.nota_cliente ? `
                <div style="margin-top:12px; background:#dbeafe; padding:12px; border-radius:8px;">
                    <strong>📝 Nota para cliente:</strong><br>
                    ${escapeHtml(tarea.nota_cliente)}
                </div>` : ''}
            </div>
            
            ${estadosDisponibles.length > 0 ? `
            <div style="margin-top:16px; padding:16px; background:#f8fafc; border-radius:12px;">
                <strong>🔄 Cambiar estado:</strong>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                    ${estadosDisponibles.map(e => `
                        <button class="btn-sm btn-cambiar-estado" 
                                data-estado="${e.value}" 
                                style="background:#2c7a4d; color:white;">
                            ${e.label}
                        </button>
                    `).join('')}
                </div>
            </div>` : ''}
            
</div>

`
    
    return html
}

// ============================================================
// OBTENER CLASE CSS PARA BADGE DE ESTADO
// ============================================================

function getEstadoBadgeClass(estado) {
    const clases = {
        'pendiente_aceptacion': 'badge-pendiente',
        'vista': 'badge-info',
        'aceptada': 'badge-activo',
        'rechazada': 'badge-inactivo',
        'en_desplazamiento': 'badge-warning',
        'trabajando_onsite': 'badge-info',
        'terminada': 'badge-completada',
        'suspendida': 'badge-danger',
        'cancelada': 'badge-cancelada'
    }
    return clases[estado] || 'badge-pendiente'
}

// ============================================================
// ACTUALIZAR TAREA
// ============================================================

export async function actualizarTarea(tareaId, datos) {
    try {
        const updateData = {}
        
        if (datos.titulo) updateData.titulo = datos.titulo
        if (datos.descripcion) updateData.descripcion = datos.descripcion
        if (datos.prioridad) updateData.prioridad = datos.prioridad
        if (datos.fecha_fin_prevista) updateData.fecha_fin_prevista = datos.fecha_fin_prevista
        if (datos.tiempo_estimado_minutos) updateData.tiempo_estimado_minutos = datos.tiempo_estimado_minutos
        
        updateData.updated_at = new Date()
        
        const { error } = await sb
            .from('tareas')
            .update(updateData)
            .eq('id', tareaId)
        
        if (error) throw error
        
        return true
    } catch (error) {
        console.error('Error actualizando tarea:', error)
        return false
    }
}

// ============================================================
// FUNCIONES PARA NOTIFICACIONES
// ============================================================

export async function getNotificaciones(perfilId, leidas = false) {
    try {
        const { data, error } = await sb
            .from('notificaciones')
            .select('*')
            .eq('perfil_id', perfilId)
            .eq('leida', leidas)
            .order('fecha', { ascending: false })
            .limit(50)
        
        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error)
        return []
    }
}

export async function marcarNotificacionLeida(notificacionId) {
    try {
        const { error } = await sb
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', notificacionId)
        
        if (error) throw error
        return true
    } catch (error) {
        console.error('Error marcando notificación:', error)
        return false
    }
}

export async function marcarTodasNotificacionesLeidas(perfilId) {
    try {
        const { error } = await sb
            .from('notificaciones')
            .update({ leida: true })
            .eq('perfil_id', perfilId)
            .eq('leida', false)
        
        if (error) throw error
        return true
    } catch (error) {
        console.error('Error marcando notificaciones:', error)
        return false
    }
}

// ============================================================
// GENERAR ESTADÍSTICAS DE TAREAS
// ============================================================

export function generarEstadisticas(tareas, tecnicos) {
    if (!tareas || tareas.length === 0) {
        return {
            total: 0,
            porEstado: {},
            porPrioridad: {},
            tecnicosActivos: tecnicos?.length || 0,
            tareasSinAsignar: 0,
            tareasUrgentes: 0,
            tareasAtrasadas: 0,
            tareasHoy: 0
        }
    }
    
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    const estadisticas = {
        total: tareas.length,
        porEstado: {},
        porPrioridad: {},
        tecnicosActivos: tecnicos?.filter(t => t.activo !== false).length || 0,
        tareasSinAsignar: 0,
        tareasUrgentes: 0,
        tareasAtrasadas: 0,
        tareasHoy: 0
    }
    
    for (const tarea of tareas) {
        const estado = tarea.estado || 'pendiente'
        estadisticas.porEstado[estado] = (estadisticas.porEstado[estado] || 0) + 1
        
        const prioridad = tarea.prioridad || 'media'
        estadisticas.porPrioridad[prioridad] = (estadisticas.porPrioridad[prioridad] || 0) + 1
        
        if (!tarea.perfil_id) {
            estadisticas.tareasSinAsignar++
        }
        
        if (prioridad === 'urgente' && !['terminada', 'cancelada'].includes(estado)) {
            estadisticas.tareasUrgentes++
        }
        
        if (tarea.fecha_fin_prevista && !['terminada', 'cancelada'].includes(estado)) {
            const fechaLimite = new Date(tarea.fecha_fin_prevista)
            if (fechaLimite < hoy) {
                estadisticas.tareasAtrasadas++
            }
        }
        
        if (tarea.fecha_fin_prevista) {
            const fechaLimite = new Date(tarea.fecha_fin_prevista)
            if (fechaLimite.toDateString() === hoy.toDateString()) {
                estadisticas.tareasHoy++
            }
        }
    }
    
    return estadisticas
}

// ============================================================
// RENDERIZAR RESUMEN DE TAREAS (CIRCULITOS)
// ============================================================

export function renderizarResumenTareas(estadisticas) {
    if (!estadisticas || estadisticas.total === 0) {
        return `
            <div class="resumen-tareas" style="display:flex; gap:16px; flex-wrap:wrap; background:var(--ios-card); padding:16px; border-radius:16px; margin-bottom:16px; border:0.5px solid var(--ios-border);">
                <div style="text-align:center; padding:8px 16px; flex:1; min-width:80px;">
                    <div style="font-size:28px; font-weight:700; color:var(--ios-gray);">0</div>
                    <div style="font-size:11px; color:var(--ios-gray);">📋 Total</div>
                </div>
                <div style="text-align:center; padding:8px 16px; flex:1; min-width:80px;">
                    <div style="font-size:24px; color:var(--ios-gray);">📭</div>
                    <div style="font-size:11px; color:var(--ios-gray);">Sin tareas</div>
                </div>
            </div>
        `
    }
    
    const estadosOrden = [
        { key: 'pendiente_aceptacion', label: '⏳ Pendientes', color: '#fef3c7', textColor: '#92400e' },
        { key: 'vista', label: '👁️ Vistas', color: '#dbeafe', textColor: '#1e40af' },
        { key: 'aceptada', label: '✅ Aceptadas', color: '#d4edda', textColor: '#155724' },
        { key: 'en_desplazamiento', label: '🚗 En desplazamiento', color: '#fef3c7', textColor: '#92400e' },
        { key: 'trabajando_onsite', label: '🔧 OnSite', color: '#d1ecf1', textColor: '#0c5460' },
        { key: 'suspendida', label: '⏸️ Suspendidas', color: '#f8d7da', textColor: '#721c24' },
        { key: 'rechazada', label: '❌ Rechazadas', color: '#f8d7da', textColor: '#721c24' },
        { key: 'terminada', label: '✅ Terminadas', color: '#d4edda', textColor: '#155724' },
        { key: 'cancelada', label: '❌ Canceladas', color: '#e2e3e5', textColor: '#383d41' },
        { key: 'pendiente', label: '⏳ Pendientes (legacy)', color: '#fef3c7', textColor: '#92400e' }
    ]
    
    const estadosActivos = estadosOrden.filter(e => estadisticas.porEstado[e.key] > 0)
    
    let html = `
        <div class="resumen-tareas" style="display:flex; gap:12px; flex-wrap:wrap; background:var(--ios-card); padding:16px; border-radius:16px; margin-bottom:16px; border:0.5px solid var(--ios-border); align-items:center;">
            
            <div style="text-align:center; padding:4px 12px; min-width:70px;">
                <div style="font-size:28px; font-weight:700; color:#1e4663;">${estadisticas.total}</div>
                <div style="font-size:11px; color:var(--ios-gray);">📋 Total</div>
            </div>
            
            <div style="width:1px; height:40px; background:var(--ios-border);"></div>
            
            <div style="text-align:center; padding:4px 12px; min-width:60px;">
                <div style="font-size:24px; font-weight:700; color:#2c7a4d;">${estadisticas.tecnicosActivos}</div>
                <div style="font-size:11px; color:var(--ios-gray);">👨‍🔧 Técnicos</div>
            </div>
            
            ${estadisticas.tareasUrgentes > 0 ? `
            <div style="text-align:center; padding:4px 12px; min-width:60px;">
                <div style="font-size:24px; font-weight:700; color:#dc2626;">${estadisticas.tareasUrgentes}</div>
                <div style="font-size:11px; color:var(--ios-gray);">🔥 Urgentes</div>
            </div>` : ''}
            
            ${estadisticas.tareasAtrasadas > 0 ? `
            <div style="text-align:center; padding:4px 12px; min-width:60px;">
                <div style="font-size:24px; font-weight:700; color:#dc2626;">${estadisticas.tareasAtrasadas}</div>
                <div style="font-size:11px; color:var(--ios-gray);">⏰ Atrasadas</div>
            </div>` : ''}
            
            ${estadisticas.tareasSinAsignar > 0 ? `
            <div style="text-align:center; padding:4px 12px; min-width:60px;">
                <div style="font-size:24px; font-weight:700; color:#e67e22;">${estadisticas.tareasSinAsignar}</div>
                <div style="font-size:11px; color:var(--ios-gray);">📌 Sin asignar</div>
            </div>` : ''}
            
            ${estadisticas.tareasHoy > 0 ? `
            <div style="text-align:center; padding:4px 12px; min-width:60px;">
                <div style="font-size:24px; font-weight:700; color:#0284c7;">${estadisticas.tareasHoy}</div>
                <div style="font-size:11px; color:var(--ios-gray);">📅 Hoy</div>
            </div>` : ''}
            
            <div style="width:1px; height:40px; background:var(--ios-border);"></div>
            
            <div style="display:flex; gap:8px; flex-wrap:wrap; flex:1;">
                ${estadosActivos.map(e => `
                    <div style="display:flex; align-items:center; gap:4px; background:${e.color}; padding:4px 10px 4px 6px; border-radius:20px; font-size:12px; color:${e.textColor};">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${e.textColor};"></span>
                        <span>${estadisticas.porEstado[e.key]}</span>
                        <span style="font-size:10px; opacity:0.7;">${e.label.replace(/[^\w\s]/g, '').trim()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `
    
    return html
}

// ============================================================
// RENDERIZAR BUSCADOR Y FILTROS DE TAREAS
// ============================================================

export function renderizarFiltrosTareas(tareas, tecnicos, clientes, activos) {
    const estadosUnicos = [...new Set(tareas.map(t => t.estado || 'pendiente'))]
    const tecnicosUnicos = tecnicos || []
    const clientesUnicos = clientes || []
    
    const estadoOptions = estadosUnicos.map(e => `
        <option value="${e}">${getEstadoLabel(e)}</option>
    `).join('')
    
    const tecnicoOptions = tecnicosUnicos.map(t => `
        <option value="${t.id}">${escapeHtml(t.nombre_razon_social)}</option>
    `).join('')
    
    const clienteOptions = clientesUnicos.map(c => `
        <option value="${c.id}">${escapeHtml(c.nombre)}</option>
    `).join('')
    
    const prioridadOptions = `
        <option value="baja">🟢 Baja</option>
        <option value="media">🟡 Media</option>
        <option value="alta">🔴 Alta</option>
        <option value="urgente">🔥 Urgente</option>
    `
    
    return `
        <div class="filtros-tareas" style="background:var(--ios-card); padding:16px; border-radius:16px; margin-bottom:16px; border:0.5px solid var(--ios-border);">
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
                <div style="flex:3; min-width:200px; position:relative;">
                    <input type="text" id="buscarTarea" 
                           placeholder="🔍 Buscar por título, número, cliente, técnico, dirección..." 
                           style="width:100%; padding:10px 16px; border-radius:30px; border:1px solid var(--ios-border); font-size:14px; background:var(--ios-bg);">
                    <span id="resultadosBusqueda" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); font-size:12px; color:var(--ios-gray);"></span>
                </div>
                <button id="btnCrearTareaLista" class="btn-success" style="padding:10px 20px; white-space:nowrap;">➕ Nueva tarea</button>
            </div>
            
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <div style="flex:1; min-width:130px;">
                    <select id="filtroEstadoTarea" style="width:100%; padding:8px 12px; border-radius:20px; border:1px solid var(--ios-border); font-size:13px; background:var(--ios-bg);">
                        <option value="todos">📌 Todos los estados</option>
                        ${estadoOptions}
                    </select>
                </div>
                <div style="flex:1; min-width:130px;">
                    <select id="filtroTecnicoTarea" style="width:100%; padding:8px 12px; border-radius:20px; border:1px solid var(--ios-border); font-size:13px; background:var(--ios-bg);">
                        <option value="todos">👨‍🔧 Todos los técnicos</option>
                        ${tecnicoOptions}
                    </select>
                </div>
                <div style="flex:1; min-width:130px;">
                    <select id="filtroClienteTarea" style="width:100%; padding:8px 12px; border-radius:20px; border:1px solid var(--ios-border); font-size:13px; background:var(--ios-bg);">
                        <option value="todos">🏢 Todos los clientes</option>
                        ${clienteOptions}
                    </select>
                </div>
                <div style="flex:1; min-width:120px;">
                    <select id="filtroPrioridadTarea" style="width:100%; padding:8px 12px; border-radius:20px; border:1px solid var(--ios-border); font-size:13px; background:var(--ios-bg);">
                        <option value="todos">⭐ Todas las prioridades</option>
                        ${prioridadOptions}
                    </select>
                </div>
                <div style="flex:1; min-width:100px;">
                    <select id="filtroFechaTarea" style="width:100%; padding:8px 12px; border-radius:20px; border:1px solid var(--ios-border); font-size:13px; background:var(--ios-bg);">
                        <option value="todos">📅 Todas las fechas</option>
                        <option value="hoy">📅 Hoy</option>
                        <option value="semana">📅 Esta semana</option>
                        <option value="mes">📅 Este mes</option>
                        <option value="atrasadas">⏰ Atrasadas</option>
                    </select>
                </div>
                <button id="btnLimpiarFiltrosTareas" class="btn-sm" style="background:#6b7280; color:white; padding:8px 16px; border-radius:20px; border:none; cursor:pointer;">
                    🗑️ Limpiar
                </button>
            </div>
            
            <div id="filtrosActivos" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; min-height:24px;"></div>
        </div>
    `
}

// ============================================================
// APLICAR FILTROS A LAS TAREAS
// ============================================================

export function aplicarFiltrosTareas(tareas, filtros) {
    let resultado = [...tareas]
    
    if (filtros.busqueda && filtros.busqueda.trim()) {
        const busqueda = filtros.busqueda.trim().toLowerCase()
        resultado = resultado.filter(t => 
            t.titulo?.toLowerCase().includes(busqueda) ||
            t.numero_tarea?.toLowerCase().includes(busqueda) ||
            t.descripcion?.toLowerCase().includes(busqueda) ||
            t.perfiles?.nombre_razon_social?.toLowerCase().includes(busqueda) ||
            t.cliente?.nombre?.toLowerCase().includes(busqueda) ||
            t.activos?.nombre?.toLowerCase().includes(busqueda) ||
            t.activos?.direccion?.toLowerCase().includes(busqueda) ||
            t.activos?.localidad?.toLowerCase().includes(busqueda) ||
            t.servicio?.nombre?.toLowerCase().includes(busqueda) ||
            t.tipo_tarea?.nombre?.toLowerCase().includes(busqueda)
        )
    }
    
    if (filtros.estado && filtros.estado !== 'todos') {
        resultado = resultado.filter(t => t.estado === filtros.estado)
    }
    
    if (filtros.tecnico && filtros.tecnico !== 'todos') {
        resultado = resultado.filter(t => t.perfil_id === filtros.tecnico)
    }
    
    if (filtros.cliente && filtros.cliente !== 'todos') {
        resultado = resultado.filter(t => t.cliente_id === filtros.cliente)
    }
    
    if (filtros.prioridad && filtros.prioridad !== 'todos') {
        resultado = resultado.filter(t => t.prioridad === filtros.prioridad)
    }
    
    if (filtros.fecha && filtros.fecha !== 'todos') {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        
        if (filtros.fecha === 'hoy') {
            resultado = resultado.filter(t => {
                if (!t.fecha_fin_prevista) return false
                const fechaLimite = new Date(t.fecha_fin_prevista)
                return fechaLimite.toDateString() === hoy.toDateString()
            })
        } else if (filtros.fecha === 'semana') {
            const finSemana = new Date(hoy)
            finSemana.setDate(finSemana.getDate() + 7)
            resultado = resultado.filter(t => {
                if (!t.fecha_fin_prevista) return false
                const fechaLimite = new Date(t.fecha_fin_prevista)
                return fechaLimite >= hoy && fechaLimite <= finSemana
            })
        } else if (filtros.fecha === 'mes') {
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            resultado = resultado.filter(t => {
                if (!t.fecha_fin_prevista) return false
                const fechaLimite = new Date(t.fecha_fin_prevista)
                return fechaLimite >= hoy && fechaLimite <= finMes
            })
        } else if (filtros.fecha === 'atrasadas') {
            resultado = resultado.filter(t => {
                if (!t.fecha_fin_prevista) return false
                if (['terminada', 'cancelada'].includes(t.estado)) return false
                const fechaLimite = new Date(t.fecha_fin_prevista)
                return fechaLimite < hoy
            })
        }
    }
    
    return resultado
}

// ============================================================
// EXPORTAR MÓDULO
// ============================================================

export default {
    cargarTareas,
    cargarTecnicos,
    cargarClientes,
    cargarClientesDeEmpresa,
    cargarActivos,
    cargarServicios,
    cargarTiposTarea,
    cargarPlantillasTarea,
    crearTarea,
    asignarTarea,
    reasignarTarea,
    cambiarEstadoTarea,
    getHistorialAsignaciones,
    getHistorialEstados,
    getEstadosDisponibles,
    getEstadoLabel,
    renderizarListaTareas,
    renderizarTablaTareas,
    renderizarFiltrosTareas,
    aplicarFiltrosTareas,
    renderizarFormularioCrear,
    renderizarFormularioEditar,  // ✅ NUEVA
    renderizarModalAsignar,
    renderizarDetalleTarea,
    getNotificaciones,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    ESTADOS_TAREA,
    ESTADOS_FLUJO
}