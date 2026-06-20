// gerente/js/modules/personal.js
// Gestión de personal (técnicos internos, externos, vacaciones, nóminas, ausencias)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion, mostrarModalInformativo } from './utils.js'

export const SUPABASE_URL = "https://idbdkxhhqeuarcqcaweo.supabase.co"

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
        // ✅ Filtrar por tipo = 'interno'
        const { data, error } = await sb
            .from('tecnicos')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('tipo', 'interno')
            .order('nombre')
        
        if (error) throw error
        
        tecnicosInternos = data || []
        console.log('✅ cargarTecnicosInternos devolvió:', tecnicosInternos.length, 'técnicos')
        return tecnicosInternos
        
    } catch (error) {
        console.error('Error cargando técnicos internos:', error)
        mostrarMensaje('Error al cargar técnicos', 'error')
        return []
    }
}

export async function crearTecnicoInterno(datos, empresaId, gerenteEmail) {
    mostrarModalCarga('Creando trabajador interno...')
    
    try {
        const { data: session } = await sb.auth.getSession()
        const response = await fetch(`${SUPABASE_URL}/functions/v1/crear-tecnico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                tipo: 'interno',
                nombre: datos.nombre,
                apellido: datos.apellido || '',
                dni: datos.dni || '',
                telefono: datos.telefono || '',
                emailPersonal: datos.email || null,
                fechaNacimiento: datos.fechaNacimiento || null,
                fechaAlta: datos.fechaAlta || null,
                fechaFin: datos.fechaFin || null,
                especialidad: datos.especialidad || '',
                seguridadSocial: datos.seguridadSocial || '',
                salario: datos.salario || 0,
                empresaId: empresaId,
                gerenteEmail: gerenteEmail
            })
        })
        
        const result = await response.json()
        
        if (!response.ok) throw new Error(result.error)
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Trabajador ${result.tecnico.nombre} creado. Nick: ${result.tecnico.nick} | Contraseña: ${result.tecnico.contraseña}`, 'exito')
        return result.tecnico
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando trabajador:', error)
        mostrarMensaje('Error al crear trabajador: ' + error.message, 'error')
        return null
    }
}

export async function actualizarTecnicoInterno(id, datos) {
    mostrarModalCarga('Actualizando trabajador...')
    
    try {
        const { error } = await sb
            .from('tecnicos')
            .update({
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                especialidad: datos.especialidad,
                salario_hora: datos.salario_hora || 0,
                activo: datos.activo,
                fecha_alta: datos.fechaAlta || null,
                fecha_fin: datos.fechaFin || null,
                seguridad_social: datos.seguridadSocial || null
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Trabajador actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando trabajador:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

export async function eliminarTecnico(id) {
    mostrarModalConfirmacion('¿Eliminar este trabajador? Esta acción eliminará todos sus datos de acceso.', async () => {
        mostrarModalCarga('Eliminando trabajador...')
        
        try {
            // 1. Obtener user_id del técnico
            const { data: tecnico, error: getError } = await sb
                .from('tecnicos')
                .select('user_id, email')
                .eq('id', id)
                .single()
            
            if (getError) throw getError
            
            // 2. Eliminar de tecnicos
            const { error: tecError } = await sb
                .from('tecnicos')
                .delete()
                .eq('id', id)
            
            if (tecError) throw tecError
            
            // 3. Eliminar de perfiles
            const { error: perfilError } = await sb
                .from('perfiles')
                .delete()
                .eq('user_id', tecnico.user_id)
            
            if (perfilError) throw perfilError
            
            // 4. Eliminar de auth.users (usando Edge Function)
            const { data: session } = await sb.auth.getSession()
            const response = await fetch(`${SUPABASE_URL}/functions/v1/eliminar-usuario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ user_id: tecnico.user_id })
            })
            
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            
            cerrarModalCarga()
            mostrarMensaje('✅ Trabajador eliminado correctamente', 'exito')
            return true
            
        } catch (error) {
            cerrarModalCarga()
            console.error('Error eliminando trabajador:', error)
            mostrarMensaje('Error al eliminar: ' + error.message, 'error')
            return false
        }
    })
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

export async function crearTecnicoExterno(datos, empresaId, gerenteEmail) {
    mostrarModalCarga('Creando trabajador externo...')
    
    try {
        const { data: session } = await sb.auth.getSession()
        const response = await fetch(`${SUPABASE_URL}/functions/v1/crear-tecnico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                tipo: 'externo',
                nombre: datos.nombre,
                apellido: datos.apellido || '',
                dni: datos.dni || '',
                telefono: datos.telefono || '',
                emailPersonal: datos.email || null,
                fechaNacimiento: datos.fechaNacimiento || null,
                fechaAlta: datos.fechaAlta || null,
                fechaFin: datos.fechaFin || null,
                especialidad: datos.especialidad || '',
                empresaExterna: datos.empresaExterna || '',
                empresaId: empresaId,
                gerenteEmail: gerenteEmail
            })
        })
        
        const result = await response.json()
        
        if (!response.ok) throw new Error(result.error)
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Trabajador externo ${result.tecnico.nombre} creado. Nick: ${result.tecnico.nick} | Contraseña: ${result.tecnico.contraseña}`, 'exito')
        return result.tecnico
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando trabajador externo:', error)
        mostrarMensaje('Error al crear trabajador externo: ' + error.message, 'error')
        return null
    }
}

export async function actualizarTecnicoExterno(id, datos) {
    mostrarModalCarga('Actualizando trabajador externo...')
    
    try {
        const { error } = await sb
            .from('tecnicos')
            .update({
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                especialidad: datos.especialidad,
                activo: datos.activo,
                fecha_alta: datos.fechaAlta || null,
                fecha_fin: datos.fechaFin || null,
                empresa_externa: datos.empresaExterna || null
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Trabajador externo actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando trabajador externo:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

export async function eliminarTecnicoExterno(id) {
    mostrarModalConfirmacion('¿Eliminar este trabajador externo? Esta acción eliminará todos sus datos de acceso.', async () => {
        mostrarModalCarga('Eliminando trabajador externo...')
        
        try {
            // 1. Obtener user_id del técnico externo
            const { data: tecnico, error: getError } = await sb
                .from('tecnicos')
                .select('user_id, email')
                .eq('id', id)
                .single()
            
            if (getError) throw getError
            
            // 2. Eliminar de tecnicos
            const { error: tecError } = await sb
                .from('tecnicos')
                .delete()
                .eq('id', id)
            
            if (tecError) throw tecError
            
            // 3. Eliminar de perfiles
            const { error: perfilError } = await sb
                .from('perfiles')
                .delete()
                .eq('user_id', tecnico.user_id)
            
            if (perfilError) throw perfilError
            
            // 4. Eliminar de auth.users (usando Edge Function)
            const { data: session } = await sb.auth.getSession()
            const response = await fetch(`${SUPABASE_URL}/functions/v1/eliminar-usuario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ user_id: tecnico.user_id })
            })
            
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            
            cerrarModalCarga()
            mostrarMensaje('✅ Trabajador externo eliminado correctamente', 'exito')
            return true
            
        } catch (error) {
            cerrarModalCarga()
            console.error('Error eliminando trabajador externo:', error)
            mostrarMensaje('Error al eliminar: ' + error.message, 'error')
            return false
        }
    })
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
// RENDERIZADO CON BÚSQUEDA Y PAGINACIÓN
// ============================================================

export function renderizarListaTecnicos(tecnicos, tipo, onEditar, onEliminar, onAgregar) {
    const titulo = tipo === 'interno' ? '👨‍🔧 Trabajadores Internos' : '🔌 Trabajadores Externos'
    
    let html = `
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 0.5px solid var(--ios-border);">
            <span style="font-size: 17px; font-weight: 600;">${titulo}</span>
            <button id="btnAgregarTecnico" class="btn-success btn-sm">➕ Agregar</button>
        </div>
        
        <div class="filtros-bar" style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 2;">
                <input type="text" id="buscarTecnico" placeholder="🔍 Buscar por nombre, email o especialidad..." 
                       style="width: 100%; padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
            </div>
            <select id="filtroEstadoTecnico" style="padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
                <option value="todos">📌 Todos</option>
                <option value="activo">✅ Activos</option>
                <option value="inactivo">🔒 Inactivos</option>
            </select>
            <button id="btnLimpiarFiltrosTecnicos" class="btn-sm" style="background: #6b7280; color: white;">🗑️ Limpiar</button>
        </div>
        
        <div id="tecnicosListaContainer">
            ${renderizarTablaTecnicos(tecnicos, tipo, onEditar, onEliminar)}
        </div>
    `
    
    setTimeout(() => {
        const inputBuscar = document.getElementById('buscarTecnico')
        const filtroEstado = document.getElementById('filtroEstadoTecnico')
        const btnLimpiar = document.getElementById('btnLimpiarFiltrosTecnicos')
        const btnAgregar = document.getElementById('btnAgregarTecnico')
        
        if (inputBuscar) {
            inputBuscar.addEventListener('input', () => {
                aplicarFiltrosTecnicos(tecnicos, tipo, onEditar, onEliminar)
            })
        }
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => {
                aplicarFiltrosTecnicos(tecnicos, tipo, onEditar, onEliminar)
            })
        }
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                if (inputBuscar) inputBuscar.value = ''
                if (filtroEstado) filtroEstado.value = 'todos'
                aplicarFiltrosTecnicos(tecnicos, tipo, onEditar, onEliminar)
            })
        }
        if (btnAgregar && onAgregar) {
            btnAgregar.onclick = onAgregar
        }
        
        // ============================================================
        // ASIGNAR EVENTOS DIRECTAMENTE A LOS BOTONES
        // ============================================================
        document.querySelectorAll('.editar-tecnico').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault()
                e.stopPropagation()
                const id = this.dataset.id
                console.log('✏️ Editando técnico ID:', id)
                if (onEditar) {
                    onEditar(id)
                }
            }
        })
        
        document.querySelectorAll('.eliminar-tecnico').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault()
                e.stopPropagation()
                const id = this.dataset.id
                console.log('🗑️ Eliminando técnico ID:', id)
                if (onEliminar) {
                    onEliminar(id)
                }
            }
        })
    }, 50)
    
    return html
}

function renderizarTablaTecnicos(tecnicos, tipo, onEditar, onEliminar, pagina = 1, itemsPorPagina = 10) {
    if (!tecnicos || tecnicos.length === 0) {
        return `<div class="text-center" style="padding: 30px; color: var(--ios-gray);">👨‍🔧 No hay trabajadores registrados</div>`
    }
    
    const inicio = (pagina - 1) * itemsPorPagina
    const fin = inicio + itemsPorPagina
    const tecnicosPagina = tecnicos.slice(inicio, fin)
    const totalPaginas = Math.ceil(tecnicos.length / itemsPorPagina)
    
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
    
    for (const t of tecnicosPagina) {
        html += `
            <tr>
                <td><strong>${escapeHtml(t.nombre)}</strong></td>
                <td>${escapeHtml(t.email)}</td>
                <td>${escapeHtml(t.telefono || '-')}</td>
                <td>${escapeHtml(t.especialidad || '-')}</td>
                ${tipo === 'interno' ? `<td>${formatMoney(t.salario_hora || 0)}€</td>` : ''}
                <td>${t.activo ? '<span class="badge badge-activo">✅ Activo</span>' : '<span class="badge badge-inactivo">❌ Inactivo</span>'}</td>
                <td>
                    <button class="btn-sm editar-tecnico" data-id="${t.id}" style="background:#e67e22;">✏️</button>
                    <button class="btn-sm eliminar-tecnico" data-id="${t.id}" style="background:#dc2626;">🗑️</button>
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `
    
    if (totalPaginas > 1) {
        html += `<div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">`
        if (pagina > 1) html += `<button class="btn-sm pagina-tecnico" data-pagina="${pagina - 1}" style="background: #64748b; color: white;">◀ Anterior</button>`
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="btn-sm pagina-tecnico ${i === pagina ? 'active' : ''}" data-pagina="${i}" style="${i === pagina ? 'background: #2c7a4d; color: white;' : 'background: #e2e8f0;'}">${i}</button>`
        }
        if (pagina < totalPaginas) html += `<button class="btn-sm pagina-tecnico" data-pagina="${pagina + 1}" style="background: #64748b; color: white;">Siguiente ▶</button>`
        html += `</div>`
    }
    
    // Devolver HTML con un contenedor para asignar eventos después
    return html
}

function aplicarFiltrosTecnicos(tecnicosOriginales, tipo, onEditar, onEliminar) {
    const busqueda = (document.getElementById('buscarTecnico')?.value || '').toLowerCase()
    const filtroEstado = document.getElementById('filtroEstadoTecnico')?.value || 'todos'
    
    let filtrados = tecnicosOriginales
    
    if (busqueda) {
        filtrados = filtrados.filter(t => 
            t.nombre?.toLowerCase().includes(busqueda) ||
            t.email?.toLowerCase().includes(busqueda) ||
            t.especialidad?.toLowerCase().includes(busqueda)
        )
    }
    
    if (filtroEstado === 'activo') {
        filtrados = filtrados.filter(t => t.activo === true)
    } else if (filtroEstado === 'inactivo') {
        filtrados = filtrados.filter(t => t.activo === false)
    }
    
    const container = document.getElementById('tecnicosListaContainer')
    if (container) {
        container.innerHTML = renderizarTablaTecnicos(filtrados, tipo, onEditar, onEliminar, 1)
        
        setTimeout(() => {
            document.querySelectorAll('.editar-tecnico').forEach(btn => {
                btn.onclick = function(e) {
                    e.preventDefault()
                    e.stopPropagation()
                    const id = this.dataset.id
                    if (onEditar) onEditar(id)
                }
            })
            document.querySelectorAll('.eliminar-tecnico').forEach(btn => {
                btn.onclick = function(e) {
                    e.preventDefault()
                    e.stopPropagation()
                    const id = this.dataset.id
                    if (onEliminar) onEliminar(id)
                }
            })
        }, 50)
    }
}

// ============================================================
// RENDERIZADO DE VACACIONES (con búsqueda)
// ============================================================

export function renderizarListaVacaciones(vacaciones, tecnicos, onAprobar, onRechazar) {
    if (!vacaciones || vacaciones.length === 0) {
        return `<div class="text-center" style="padding: 40px;">🌴 No hay solicitudes de vacaciones</div>`
    }
    
    let html = `
        <div class="filtros-bar" style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 2;">
                <input type="text" id="buscarVacacion" placeholder="🔍 Buscar por técnico..." 
                       style="width: 100%; padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
            </div>
            <select id="filtroEstadoVacacion" style="padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
                <option value="todos">📌 Todos</option>
                <option value="pendiente">⏳ Pendientes</option>
                <option value="aprobada">✅ Aprobadas</option>
                <option value="rechazada">❌ Rechazadas</option>
            </select>
            <button id="btnLimpiarFiltrosVacaciones" class="btn-sm" style="background: #6b7280; color: white;">🗑️ Limpiar</button>
        </div>
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
                        <button class="btn-sm aprobar-vac" data-id="${v.id}" style="background:#2c7a4d; color:white;">✅ Aprobar</button>
                        <button class="btn-sm rechazar-vac" data-id="${v.id}" style="background:#dc2626; color:white;">❌ Rechazar</button>
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

// ============================================================
// RENDERIZADO DE AUSENCIAS
// ============================================================

export function renderizarListaAusencias(ausencias, tecnicos) {
    if (!ausencias || ausencias.length === 0) {
        return `<div class="text-center" style="padding: 40px;">⚠️ No hay ausencias registradas</div>`
    }
    
    let html = `
        <div class="filtros-bar" style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 2;">
                <input type="text" id="buscarAusencia" placeholder="🔍 Buscar por técnico..." 
                       style="width: 100%; padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
            </div>
            <select id="filtroTipoAusencia" style="padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
                <option value="todos">📌 Todos</option>
                <option value="baja_medica">🏥 Baja médica</option>
                <option value="permiso">📋 Permiso</option>
                <option value="formacion">📚 Formación</option>
                <option value="otros">📌 Otros</option>
            </select>
            <button id="btnLimpiarFiltrosAusencias" class="btn-sm" style="background: #6b7280; color: white;">🗑️ Limpiar</button>
        </div>
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

export function renderizarModalAgregarTecnico(tipo = 'interno') {
    const titulo = tipo === 'interno' ? '➕ Alta de trabajador interno' : '➕ Alta de trabajador externo / subcontrata'
    
    return `
        <div style="max-width: 600px; width: 100%;">
            <!-- Tipo de trabajador -->
            <div class="form-group">
                <label>📋 Tipo de trabajador *</label>
                <select id="tecTipo" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--ios-border);">
                    <option value="interno" ${tipo === 'interno' ? 'selected' : ''}>👨‍🔧 Trabajador interno (contratado)</option>
                    <option value="externo" ${tipo === 'externo' ? 'selected' : ''}>🔌 Trabajador externo / subcontrata</option>
                </select>
            </div>
            
            <!-- Datos personales -->
            <div class="card-header" style="margin-top: 8px; font-size: 14px;">📋 Datos personales</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>👤 Nombre *</label>
                    <input type="text" id="tecNombre" placeholder="Nombre">
                </div>
                <div class="grupo">
                    <label>Apellido *</label>
                    <input type="text" id="tecApellido" placeholder="Apellido">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📋 DNI / NIE *</label>
                    <input type="text" id="tecDni" placeholder="12345678A">
                </div>
                <div class="grupo">
                    <label>📅 Fecha de nacimiento</label>
                    <input type="date" id="tecFechaNacimiento">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📞 Teléfono</label>
                    <input type="tel" id="tecTelefono" placeholder="Teléfono">
                </div>
                <div class="grupo">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="tecEmail" placeholder="email@personal.com">
                </div>
            </div>
            
            <!-- Datos laborales -->
            <div class="card-header" style="margin-top: 16px; font-size: 14px;">📋 Datos laborales</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📅 Fecha de alta</label>
                    <input type="date" id="tecFechaAlta" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="grupo">
                    <label>🔧 Especialidad</label>
                    <input type="text" id="tecEspecialidad" placeholder="Ej: Electricidad, Fontanería...">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📋 Nº Seguridad Social</label>
                    <input type="text" id="tecSeguridadSocial" placeholder="12/34567890/12">
                </div>
                <div class="grupo">
                    <label>📅 Fecha fin contrato (si aplica)</label>
                    <input type="date" id="tecFechaFin">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo" id="salarioContainer">
                    <label>💰 Salario por hora (€)</label>
                    <input type="number" id="tecSalario" step="0.01" placeholder="15.00">
                </div>
                <div class="grupo" id="empresaContainer" style="display: none;">
                    <label>🏢 Empresa subcontratada</label>
                    <input type="text" id="tecEmpresaExterna" placeholder="Nombre de la empresa externa">
                </div>
            </div>
            
            <!-- Credenciales de acceso -->
            <div class="card-header" style="margin-top: 16px; font-size: 14px;">🔐 Credenciales de acceso</div>
            
            <div class="alert-info" style="background: #dbeafe; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
                <small>🔑 <strong>Email:</strong> Se generará automáticamente con el dominio de tu empresa.</small>
                <br>
                <small>🔑 <strong>Nick:</strong> Se generará automáticamente a partir del nombre y apellido.</small>
                <br>
                <small>🔑 <strong>Contraseña inicial:</strong> <strong>Tecnico2026</strong> (el trabajador deberá cambiarla en su primer acceso).</small>
            </div>
            
            <div class="form-group">
                <label>📋 Resumen de credenciales</label>
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px;">
                    <div>📧 Email: <span id="previewEmail" style="color: #1e4663;">INT0001@dominio.es</span></div>
                    <div>👤 Nick: <span id="previewNick" style="color: #1e4663;">nombreapellido</span></div>
                    <div>🔑 Contraseña: <span id="previewPassword" style="color: #1e4663;">Tecnico2026</span></div>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button id="btnGuardarTecnico" class="btn-aceptar">💾 Dar de alta</button>
                <button id="btnCancelarTecnico" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `
}

// ============================================================
// MODAL EDITAR TÉCNICO
// ============================================================

export function renderizarModalEditarTecnico(tecnico, tipo) {
    return `
        <div style="max-width: 600px; width: 100%;">
            <input type="hidden" id="editTecnicoId" value="${tecnico.id}">
            <input type="hidden" id="editTecnicoTipo" value="${tipo}">
            
            <!-- Datos personales -->
            <div class="card-header" style="margin-top: 8px; font-size: 14px;">📋 Datos personales</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>👤 Nombre *</label>
                    <input type="text" id="editTecNombre" value="${escapeHtml(tecnico.nombre)}">
                </div>
                <div class="grupo">
                    <label>📧 Email</label>
                    <input type="email" id="editTecEmail" value="${escapeHtml(tecnico.email)}" readonly style="background:#f1f5f9;">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>👤 Nick (usuario para login)</label>
                    <input type="text" id="editTecNick" value="${escapeHtml(tecnico.nick)}">
                    <small style="color: #6b7280;">El técnico usará este nick para acceder</small>
                </div>
                <div class="grupo">
                    <label>🔑 Nueva contraseña</label>
                    <input type="password" id="editTecPassword" placeholder="Dejar vacío para no cambiar">
                    <small style="color: #6b7280;">Mínimo 6 caracteres</small>
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📞 Teléfono</label>
                    <input type="tel" id="editTecTelefono" value="${escapeHtml(tecnico.telefono || '')}">
                </div>
                <div class="grupo">
                    <label>🔧 Especialidad</label>
                    <input type="text" id="editTecEspecialidad" value="${escapeHtml(tecnico.especialidad || '')}">
                </div>
            </div>
            
            <!-- Datos laborales -->
            <div class="card-header" style="margin-top: 16px; font-size: 14px;">📋 Datos laborales</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📅 Fecha de alta</label>
                    <input type="date" id="editTecFechaAlta" value="${tecnico.fecha_alta || ''}">
                </div>
                <div class="grupo">
                    <label>📅 Fecha fin contrato</label>
                    <input type="date" id="editTecFechaFin" value="${tecnico.fecha_fin || ''}">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📋 Nº Seguridad Social</label>
                    <input type="text" id="editTecSeguridadSocial" value="${escapeHtml(tecnico.seguridad_social || '')}">
                </div>
                <div class="grupo">
                    <label>✅ Estado</label>
                    <select id="editTecActivo" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--ios-border);">
                        <option value="true" ${tecnico.activo ? 'selected' : ''}>✅ Activo</option>
                        <option value="false" ${!tecnico.activo ? 'selected' : ''}>❌ Inactivo</option>
                    </select>
                </div>
            </div>
            
            ${tipo === 'interno' ? `
            <div class="row-flex">
                <div class="grupo">
                    <label>💰 Salario por hora (€)</label>
                    <input type="number" id="editTecSalario" step="0.01" value="${tecnico.salario_hora || 0}">
                </div>
            </div>
            ` : `
            <div class="row-flex">
                <div class="grupo">
                    <label>🏢 Empresa subcontratada</label>
                    <input type="text" id="editTecEmpresaExterna" value="${escapeHtml(tecnico.empresa_externa || '')}">
                </div>
            </div>
            `}
            
            <div class="alert-info" style="background: #fef3c7; padding: 12px; border-radius: 12px; margin-top: 16px;">
                <small>⚠️ Si cambias el nick, el técnico deberá usar el nuevo nick para acceder.</small>
            </div>
            
            <div class="modal-buttons">
                <button id="btnGuardarEdicionTecnico" class="btn-aceptar">💾 Guardar cambios</button>
                <button id="btnCancelarEdicionTecnico" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `
}

export async function actualizarNickTecnico(userId, nuevoNick) {
    try {
        // Actualizar nick en perfiles
        const { error: perfilError } = await sb
            .from('perfiles')
            .update({ nick: nuevoNick })
            .eq('user_id', userId)
        
        if (perfilError) throw perfilError
        
        // Actualizar nick en tecnicos
        const { error: tecError } = await sb
            .from('tecnicos')
            .update({ nick: nuevoNick })
            .eq('user_id', userId)
        
        if (tecError) throw tecError
        
        return true
    } catch (error) {
        console.error('Error actualizando nick:', error)
        return false
    }
}

export async function actualizarPasswordTecnico(userId, nuevaPassword) {
    try {
        // Usar admin API para actualizar contraseña
        const { data: session } = await sb.auth.getSession()
        const response = await fetch(`${SUPABASE_URL}/functions/v1/actualizar-password-tecnico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                user_id: userId,
                nueva_password: nuevaPassword
            })
        })
        
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        
        return true
    } catch (error) {
        console.error('Error actualizando password:', error)
        return false
    }
}

// ============================================================
// FORMULARIOS MODALES (VACACIONES Y AUSENCIAS)
// ============================================================

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

export default {
    cargarTecnicosInternos,
    crearTecnicoInterno,
    actualizarTecnicoInterno,
    eliminarTecnico,
    cargarTecnicosExternos,
    crearTecnicoExterno,
    actualizarTecnicoExterno,
    eliminarTecnicoExterno,
    cargarVacaciones,
    solicitarVacaciones,
    aprobarVacaciones,
    cargarAusencias,
    registrarAusencia,
    renderizarListaTecnicos,
    renderizarListaVacaciones,
    renderizarListaAusencias,
    renderizarModalAgregarTecnico,
    renderizarModalEditarTecnico,
    renderizarModalSolicitarVacaciones,
    renderizarModalRegistrarAusencia,
    calcularNomina
}