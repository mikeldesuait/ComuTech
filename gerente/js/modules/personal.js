// gerente/js/modules/personal.js
// Gestión de personal (técnicos internos, externos, vacaciones, nóminas, ausencias)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion, mostrarModalInformativo } from './utils.js'

let tecnicosInternos = []
let tecnicosExternos = []
let vacacionesPendientes = []
let ausenciasRegistradas = []

// ============================================================
// TÉCNICOS INTERNOS - CRUD
// ============================================================

export async function cargarTecnicosInternos(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('tecnicos')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('tipo', 'interno')
            .order('nombre')
        
        if (error) throw error
        
        tecnicosInternos = data || []
        return tecnicosInternos
        
    } catch (error) {
        console.error('Error cargando técnicos internos:', error)
        mostrarMensaje('Error al cargar técnicos', 'error')
        return []
    }
}

export async function crearTecnicoInterno(datos, empresaId) {
    mostrarModalCarga('Creando técnico...')
    
    try {
        const { data, error } = await sb
            .from('tecnicos')
            .insert({
                empresa_id: empresaId,
                tipo: 'interno',
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                especialidad: datos.especialidad,
                salario_hora: datos.salario_hora,
                activo: true
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Técnico ${datos.nombre} creado`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando técnico:', error)
        mostrarMensaje('Error al crear técnico', 'error')
        return null
    }
}

export async function actualizarTecnicoInterno(id, datos) {
    mostrarModalCarga('Actualizando...')
    
    try {
        const { error } = await sb
            .from('tecnicos')
            .update({
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                especialidad: datos.especialidad,
                salario_hora: datos.salario_hora,
                activo: datos.activo
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Técnico actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando técnico:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

// ============================================================
// TÉCNICOS EXTERNOS - CRUD
// ============================================================

export async function cargarTecnicosExternos(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('tecnicos')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('tipo', 'externo')
            .order('nombre')
        
        if (error) throw error
        
        tecnicosExternos = data || []
        return tecnicosExternos
        
    } catch (error) {
        console.error('Error cargando técnicos externos:', error)
        return []
    }
}

export async function crearTecnicoExterno(datos, empresaId) {
    mostrarModalCarga('Creando técnico externo...')
    
    try {
        const { data, error } = await sb
            .from('tecnicos')
            .insert({
                empresa_id: empresaId,
                tipo: 'externo',
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                especialidad: datos.especialidad,
                activo: true
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Técnico externo ${datos.nombre} creado`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando técnico externo:', error)
        mostrarMensaje('Error al crear técnico', 'error')
        return null
    }
}

// ============================================================
// VACACIONES
// ============================================================

export async function cargarVacaciones(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('vacaciones')
            .select(`
                *,
                tecnicos(id, nombre, email)
            `)
            .eq('tecnicos.empresa_id', empresaId)
            .order('fecha_inicio', { ascending: false })
        
        if (error) throw error
        
        vacacionesPendientes = data || []
        return vacacionesPendientes
        
    } catch (error) {
        console.error('Error cargando vacaciones:', error)
        return []
    }
}

export async function solicitarVacaciones(datos) {
    mostrarModalCarga('Guardando solicitud...')
    
    try {
        const { error } = await sb
            .from('vacaciones')
            .insert({
                tecnico_id: datos.tecnicoId,
                fecha_inicio: datos.fechaInicio,
                fecha_fin: datos.fechaFin,
                estado: 'pendiente',
                motivo: datos.motivo
            })
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Solicitud de vacaciones registrada', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error solicitando vacaciones:', error)
        mostrarMensaje('Error al solicitar vacaciones', 'error')
        return false
    }
}

export async function aprobarVacaciones(id, estado, aprobadoPor) {
    mostrarModalCarga('Procesando...')
    
    try {
        const { error } = await sb
            .from('vacaciones')
            .update({
                estado: estado,
                aprobada_por: aprobadoPor
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Vacaciones ${estado === 'aprobada' ? 'aprobadas' : 'rechazadas'}`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error aprobando vacaciones:', error)
        mostrarMensaje('Error al procesar', 'error')
        return false
    }
}

// ============================================================
// AUSENCIAS
// ============================================================

export async function cargarAusencias(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('ausencias')
            .select(`
                *,
                tecnicos(id, nombre, email)
            `)
            .eq('tecnicos.empresa_id', empresaId)
            .order('fecha', { ascending: false })
        
        if (error) throw error
        
        ausenciasRegistradas = data || []
        return ausenciasRegistradas
        
    } catch (error) {
        console.error('Error cargando ausencias:', error)
        return []
    }
}

export async function registrarAusencia(datos) {
    mostrarModalCarga('Registrando ausencia...')
    
    try {
        const { error } = await sb
            .from('ausencias')
            .insert({
                tecnico_id: datos.tecnicoId,
                fecha: datos.fecha,
                tipo: datos.tipo,
                motivo: datos.motivo,
                justificante_url: datos.justificanteUrl || null
            })
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Ausencia registrada', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error registrando ausencia:', error)
        mostrarMensaje('Error al registrar ausencia', 'error')
        return false
    }
}

// ============================================================
// NÓMINAS (simplificado)
// ============================================================

export async function calcularNomina(tecnicoId, mes, año) {
    mostrarModalCarga('Calculando nómina...')
    
    try {
        // Obtener horas trabajadas del técnico en el mes
        const inicioMes = `${año}-${String(mes).padStart(2, '0')}-01`
        const finMes = new Date(año, mes, 0).toISOString().split('T')[0]
        
        const { data: seguimiento, error } = await sb
            .from('seguimiento_tareas')
            .select(`
                *,
                tareas!inner(perfil_id)
            `)
            .eq('tareas.perfil_id', tecnicoId)
            .gte('inicio', inicioMes)
            .lte('inicio', finMes)
            .eq('evento', 'FIN_TRABAJO')
        
        if (error) throw error
        
        const totalMinutos = seguimiento.reduce((sum, s) => sum + (s.duracion_minutos || 0), 0)
        const totalHoras = totalMinutos / 60
        
        // Obtener salario del técnico
        const { data: tecnico } = await sb
            .from('tecnicos')
            .select('salario_hora')
            .eq('id', tecnicoId)
            .single()
        
        const salarioHora = tecnico?.salario_hora || 15
        const totalBruto = totalHoras * salarioHora
        
        cerrarModalCarga()
        
        return {
            tecnicoId,
            mes,
            año,
            totalHoras: totalHoras.toFixed(2),
            salarioHora,
            totalBruto: totalBruto.toFixed(2),
            irpf: (totalBruto * 0.15).toFixed(2),
            seguridadSocial: (totalBruto * 0.0635).toFixed(2),
            totalNeto: (totalBruto * 0.7865).toFixed(2)
        }
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error calculando nómina:', error)
        mostrarMensaje('Error al calcular nómina', 'error')
        return null
    }
}

// ============================================================
// RENDERIZADO DE INTERFAZ
// ============================================================

export function renderizarTecnicosInternos(tecnicos, onEditar, onEliminar) {
    if (!tecnicos || tecnicos.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                👨‍🔧 No hay técnicos internos
                <br><br>
                <button class="btn-success" id="btnAgregarTecnicoInterno">➕ Agregar técnico</button>
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
                        <th>€/hora</th>
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
                <td>${formatMoney(t.salario_hora || 0)}€</td>
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
            <button class="btn-success" id="btnAgregarTecnicoInterno">➕ Agregar técnico</button>
        </div>
    `
    
    return html
}

export function renderizarVacaciones(vacaciones, tecnicos, onAprobar) {
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

export function renderizarAusencias(ausencias, tecnicos) {
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

// ============================================================
// FORMULARIOS MODALES
// ============================================================

export function renderizarModalAgregarTecnico(tipo) {
    const titulo = tipo === 'interno' ? 'Agregar técnico interno' : 'Agregar técnico externo'
    
    return `
        <div class="form-group">
            <label>👤 Nombre *</label>
            <input type="text" id="tecNombre" placeholder="Nombre completo">
        </div>
        <div class="form-group">
            <label>📧 Email *</label>
            <input type="email" id="tecEmail" placeholder="email@ejemplo.com">
        </div>
        <div class="form-group">
            <label>📞 Teléfono</label>
            <input type="tel" id="tecTelefono" placeholder="Teléfono">
        </div>
        <div class="form-group">
            <label>🔧 Especialidad</label>
            <input type="text" id="tecEspecialidad" placeholder="Ej: Electricidad, Fontanería...">
        </div>
        ${tipo === 'interno' ? `
            <div class="form-group">
                <label>💰 Salario por hora (€)</label>
                <input type="number" id="tecSalario" step="0.01" placeholder="0.00">
            </div>
        ` : ''}
    `
}

export function renderizarModalSolicitarVacaciones(tecnicos) {
    const options = tecnicos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')
    
    return `
        <div class="form-group">
            <label>👨‍🔧 Técnico *</label>
            <select id="vacTecnicoId">${options}</select>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📅 Fecha inicio *</label>
                <input type="date" id="vacFechaInicio">
            </div>
            <div class="grupo">
                <label>📅 Fecha fin *</label>
                <input type="date" id="vacFechaFin">
            </div>
        </div>
        <div class="form-group">
            <label>📝 Motivo</label>
            <textarea id="vacMotivo" rows="2" placeholder="Motivo de las vacaciones..."></textarea>
        </div>
    `
}

export function renderizarModalRegistrarAusencia(tecnicos) {
    const options = tecnicos.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')
    
    return `
        <div class="form-group">
            <label>👨‍🔧 Técnico *</label>
            <select id="ausTecnicoId">${options}</select>
        </div>
        <div class="form-group">
            <label>📅 Fecha *</label>
            <input type="date" id="ausFecha">
        </div>
        <div class="form-group">
            <label>⚠️ Tipo *</label>
            <select id="ausTipo">
                <option value="baja_medica">🏥 Baja médica</option>
                <option value="permiso">📋 Permiso</option>
                <option value="formacion">📚 Formación</option>
                <option value="otros">📌 Otros</option>
            </select>
        </div>
        <div class="form-group">
            <label>📝 Motivo</label>
            <textarea id="ausMotivo" rows="2" placeholder="Descripción..."></textarea>
        </div>
    `
}