// gerente/js/modules/clientes.js
// Gestión de clientes del gerente (tabla clientes, con códigos de acceso)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, mostrarModalCarga, cerrarModalCarga } from './utils.js'

let clientesLista = []

// ============================================================
// GENERAR CÓDIGO DE ACCESO (formato: LLL NNNN)
// ============================================================

export function generarCodigoAcceso() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const letra1 = letras[Math.floor(Math.random() * letras.length)]
    const letra2 = letras[Math.floor(Math.random() * letras.length)]
    const letra3 = letras[Math.floor(Math.random() * letras.length)]
    const numeros = Math.floor(Math.random() * 9000 + 1000)
    return `${letra1}${letra2}${letra3} ${numeros}`
}

// ============================================================
// CARGAR CLIENTES DEL GERENTE
// ============================================================

export async function cargarClientes(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('clientes')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
            .limit(100)
        
        if (error) throw error
        clientesLista = data || []
        return clientesLista
        
    } catch (error) {
        console.error('Error cargando clientes:', error)
        mostrarMensaje('Error al cargar clientes', 'error')
        return []
    }
}

// ============================================================
// CREAR NUEVO CLIENTE CON CÓDIGO DE ACCESO
// ============================================================

export async function crearCliente(datos, empresaId) {
    mostrarModalCarga('Creando cliente...')
    
    try {
        let codigo = generarCodigoAcceso()
        let esUnico = false
        let intentos = 0
        
        while (!esUnico && intentos < 5) {
            const { data: existente } = await sb
                .from('clientes')
                .select('id')
                .eq('codigo_acceso', codigo)
                .maybeSingle()
            
            if (!existente) {
                esUnico = true
            } else {
                codigo = generarCodigoAcceso()
                intentos++
            }
        }
        
        const { data, error } = await sb
            .from('clientes')
            .insert({
                empresa_id: empresaId,
                nombre: datos.nombre,
                nif_cif: datos.nifCif,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                provincia: datos.provincia,
                codigo_acceso: codigo,
                acceso_activo: true
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Cliente ${datos.nombre} creado. Código: ${codigo}`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando cliente:', error)
        mostrarMensaje('Error al crear cliente', 'error')
        return null
    }
}

// ============================================================
// ACTUALIZAR CLIENTE
// ============================================================

export async function actualizarCliente(id, datos) {
    mostrarModalCarga('Actualizando cliente...')
    
    try {
        const { error } = await sb
            .from('clientes')
            .update({
                nombre: datos.nombre,
                nif_cif: datos.nifCif,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                provincia: datos.provincia
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Cliente actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando cliente:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

// ============================================================
// REGENERAR CÓDIGO DE ACCESO
// ============================================================

export async function regenerarCodigoAcceso(id) {
    mostrarModalCarga('Regenerando código...')
    
    try {
        let codigo = generarCodigoAcceso()
        let esUnico = false
        let intentos = 0
        
        while (!esUnico && intentos < 5) {
            const { data: existente } = await sb
                .from('clientes')
                .select('id')
                .eq('codigo_acceso', codigo)
                .maybeSingle()
            
            if (!existente) {
                esUnico = true
            } else {
                codigo = generarCodigoAcceso()
                intentos++
            }
        }
        
        const { error } = await sb
            .from('clientes')
            .update({ codigo_acceso: codigo })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Nuevo código: ${codigo}`, 'exito')
        return codigo
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error regenerando código:', error)
        mostrarMensaje('Error al regenerar código', 'error')
        return null
    }
}

// ============================================================
// ACTIVAR/DESACTIVAR ACCESO DE CLIENTE
// ============================================================

export async function toggleAccesoCliente(id, activo) {
    mostrarModalCarga('Actualizando...')
    
    try {
        const { error } = await sb
            .from('clientes')
            .update({ acceso_activo: activo })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(activo ? '✅ Acceso activado' : '🔒 Acceso desactivado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando acceso:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

// ============================================================
// DAR DE BAJA CLIENTE
// ============================================================

export async function darBajaCliente(id, motivo) {
    mostrarModalCarga('Dando de baja...')
    
    try {
        const { error } = await sb
            .from('clientes')
            .update({ 
                activo: false,
                motivo_baja: motivo,
                fecha_baja: new Date().toISOString()
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Cliente dado de baja', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error dando de baja:', error)
        mostrarMensaje('Error al dar de baja', 'error')
        return false
    }
}

// ============================================================
// CARGAR ACTIVOS DEL CLIENTE
// ============================================================

export async function cargarActivos(clienteId) {
    if (!clienteId) return []
    
    try {
        const { data, error } = await sb
            .from('activos')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('nombre')
        
        if (error) throw error
        return data || []
        
    } catch (error) {
        console.error('Error cargando activos:', error)
        return []
    }
}

// ============================================================
// CREAR ACTIVO PARA CLIENTE
// ============================================================

export async function crearActivo(datos, clienteId) {
    mostrarModalCarga('Creando activo...')
    
    try {
        const { data, error } = await sb
            .from('activos')
            .insert({
                cliente_id: clienteId,
                nombre: datos.nombre,
                tipo_acceso: datos.tipoAcceso || 'libre',
                // ubicacion: datos.ubicacion || null,
                contacto: datos.contacto || null,
                hora_apertura: datos.horaApertura || null,
                hora_cierre: datos.horaCierre || null,
                direccion: datos.direccion || null,
                localidad: datos.localidad || null,
                codigo_postal: datos.codigoPostal || null,
                instrucciones_acceso: datos.instrucciones || null,
                latitud: datos.latitud || null,
                longitud: datos.longitud || null,
                datos_tecnicos: datos.datosTecnicos || null
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Activo ${datos.nombre} creado`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando activo:', error)
        mostrarMensaje('Error al crear activo', 'error')
        return null
    }
}

// ============================================================
// ACTUALIZAR ACTIVO
// ============================================================

export async function actualizarActivo(id, datos) {
    mostrarModalCarga('Actualizando activo...')
    
    try {
        const { error } = await sb
            .from('activos')
            .update({
                nombre: datos.nombre,
                tipo_acceso: datos.tipoAcceso,
                ubicacion: datos.ubicacion,
                contacto: datos.contacto,
                hora_apertura: datos.horaApertura,
                hora_cierre: datos.horaCierre,
                direccion: datos.direccion,
                localidad: datos.localidad,
                codigo_postal: datos.codigoPostal,
                instrucciones_acceso: datos.instrucciones,
                latitud: datos.latitud || null,
                longitud: datos.longitud || null,
                datos_tecnicos: datos.datosTecnicos || null
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Activo actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando activo:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

// ============================================================
// ELIMINAR ACTIVO
// ============================================================

export async function eliminarActivo(id) {
    mostrarModalCarga('Eliminando activo...')
    
    try {
        const { error } = await sb
            .from('activos')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Activo eliminado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error eliminando activo:', error)
        mostrarMensaje('Error al eliminar activo', 'error')
        return false
    }
}

// ============================================================
// RENDERIZAR LISTA DE CLIENTES (SIN botón duplicado)
// ============================================================

export function renderizarListaClientes(clientes, onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos) {
    window.todosClientes = clientes
    
    const html = `
        <div class="card" style="margin-top:16px;">
            
            
            <div class="filtros-bar" style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 2;">
                    <input type="text" id="buscarCliente" placeholder="🔍 Buscar por nombre, NIF, email, teléfono o código..." 
                           style="width: 100%; padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
                </div>
                <select id="filtroEstadoCliente" style="padding: 10px; border-radius: 20px; border: 1px solid var(--ios-border);">
                    <option value="todos">📌 Todos</option>
                    <option value="activo">✅ Activos</option>
                    <option value="inactivo">🔒 Inactivos</option>
                </select>
                <button id="btnLimpiarFiltros" class="btn-sm" style="background: #6b7280; color: white;">🗑️ Limpiar</button>
            </div>
            
            <div id="clientesListaContainer">
                ${renderizarTablaClientes(clientes, onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos)}
            </div>
        </div>
    `
    
    setTimeout(() => {
        const inputBuscar = document.getElementById('buscarCliente')
        const filtroEstado = document.getElementById('filtroEstadoCliente')
        const btnLimpiar = document.getElementById('btnLimpiarFiltros')
        const btnAlta = document.getElementById('btnAltaCliente')
        
        if (inputBuscar) {
            inputBuscar.addEventListener('input', () => aplicarFiltrosClientes(onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos))
        }
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => aplicarFiltrosClientes(onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos))
        }
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                if (inputBuscar) inputBuscar.value = ''
                if (filtroEstado) filtroEstado.value = 'todos'
                aplicarFiltrosClientes(onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos)
            })
        }
        if (btnAlta) {
            btnAlta.addEventListener('click', () => onVerActivos('nuevo'))
        }
    }, 50)
    
    return html
}

// ============================================================
// RENDERIZAR TABLA DE CLIENTES (SIN botón "Agregar")
// ============================================================

function renderizarTablaClientes(clientes, onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos, pagina = 1, itemsPorPagina = 10) {
    if (!clientes || clientes.length === 0) {
        return `<div class="text-center" style="padding: 40px;">🏢 No hay clientes registrados</div>`
    }
    
    const inicio = (pagina - 1) * itemsPorPagina
    const fin = inicio + itemsPorPagina
    const clientesPagina = clientes.slice(inicio, fin)
    const totalPaginas = Math.ceil(clientes.length / itemsPorPagina)
    
    let html = `<div style="overflow-x: auto;"><table class="data-table"><thead><tr><th>Cliente</th><th>NIF/CIF</th><th>Contacto</th><th>Código acceso</th><th>Estado</th><th>Activos</th><th>Acciones</th></tr></thead><tbody>`
    
    for (const c of clientesPagina) {
        html += `
            <tr>
                <td><strong>${escapeHtml(c.nombre)}</strong><br><small>${escapeHtml(c.direccion || '-')}</small></td>
                <td>${escapeHtml(c.nif_cif || '-')}</td>
                <td>${escapeHtml(c.email || '-')}<br>${escapeHtml(c.telefono || '-')}</td>
                <td><span class="badge badge-activo" style="font-family: monospace;">${escapeHtml(c.codigo_acceso || '-')}</span></td>
                <td>${c.acceso_activo ? '<span class="badge badge-activo">✅ Activo</span>' : '<span class="badge badge-inactivo">🔒 Inactivo</span>'}</td>
                <td><button class="btn-sm ver-activos" data-id="${c.id}" style="background:#0284c7;">🏗️ Ver</button></td>
                <td>
                    <button class="btn-sm editar-cliente" data-id="${c.id}" style="background:#e67e22;">✏️</button>
                    <button class="btn-sm regenerar-codigo" data-id="${c.id}" style="background:#0284c7;">🔄</button>
                    <button class="btn-sm toggle-acceso" data-id="${c.id}" data-activo="${c.acceso_activo}" style="background:${c.acceso_activo ? '#dc2626' : '#2c7a4d'};">${c.acceso_activo ? '🔒' : '✅'}</button>
                </td>
            </tr>
        `
    }
    
    html += `</tbody></table></div>`
    
    if (totalPaginas > 1) {
        html += `<div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">`
        if (pagina > 1) html += `<button class="btn-sm pagina-cliente" data-pagina="${pagina - 1}" style="background: #64748b; color: white;">◀ Anterior</button>`
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="btn-sm pagina-cliente ${i === pagina ? 'active' : ''}" data-pagina="${i}" style="${i === pagina ? 'background: #2c7a4d; color: white;' : 'background: #e2e8f0;'}">${i}</button>`
        }
        if (pagina < totalPaginas) html += `<button class="btn-sm pagina-cliente" data-pagina="${pagina + 1}" style="background: #64748b; color: white;">Siguiente ▶</button>`
        html += `</div>`
    }
    
    return html
}

// ============================================================
// APLICAR FILTROS A CLIENTES
// ============================================================

function aplicarFiltrosClientes(onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos) {
    if (!window.todosClientes) return
    
    const busqueda = (document.getElementById('buscarCliente')?.value || '').toLowerCase()
    const filtroEstado = document.getElementById('filtroEstadoCliente')?.value || 'todos'
    
    let filtrados = window.todosClientes
    
    if (busqueda) {
        filtrados = filtrados.filter(c => 
            c.nombre?.toLowerCase().includes(busqueda) ||
            c.nif_cif?.toLowerCase().includes(busqueda) ||
            c.email?.toLowerCase().includes(busqueda) ||
            c.telefono?.toLowerCase().includes(busqueda) ||
            c.codigo_acceso?.toLowerCase().includes(busqueda) ||
            c.direccion?.toLowerCase().includes(busqueda)
        )
    }
    
    if (filtroEstado === 'activo') {
        filtrados = filtrados.filter(c => c.acceso_activo === true)
    } else if (filtroEstado === 'inactivo') {
        filtrados = filtrados.filter(c => c.acceso_activo === false)
    }
    
    const container = document.getElementById('clientesListaContainer')
    if (container) {
        container.innerHTML = renderizarTablaClientes(filtrados, onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos, 1)
        
        document.querySelectorAll('.ver-activos').forEach(btn => btn.addEventListener('click', () => onVerActivos(btn.dataset.id)))
        document.querySelectorAll('.editar-cliente').forEach(btn => btn.addEventListener('click', () => onEditar(btn.dataset.id)))
        document.querySelectorAll('.regenerar-codigo').forEach(btn => btn.addEventListener('click', () => onRegenerarCodigo(btn.dataset.id)))
        document.querySelectorAll('.toggle-acceso').forEach(btn => btn.addEventListener('click', () => onToggleAcceso(btn.dataset.id, btn.dataset.activo === 'true')))
        
        document.querySelectorAll('.pagina-cliente').forEach(btn => {
            btn.addEventListener('click', () => {
                const pagina = parseInt(btn.dataset.pagina)
                const containerTabla = document.getElementById('clientesListaContainer')
                if (containerTabla) {
                    containerTabla.innerHTML = renderizarTablaClientes(filtrados, onEditar, onRegenerarCodigo, onToggleAcceso, onVerActivos, pagina)
                    setTimeout(() => {
                        document.querySelectorAll('.ver-activos').forEach(btn2 => btn2.addEventListener('click', () => onVerActivos(btn2.dataset.id)))
                        document.querySelectorAll('.editar-cliente').forEach(btn2 => btn2.addEventListener('click', () => onEditar(btn2.dataset.id)))
                        document.querySelectorAll('.regenerar-codigo').forEach(btn2 => btn2.addEventListener('click', () => onRegenerarCodigo(btn2.dataset.id)))
                        document.querySelectorAll('.toggle-acceso').forEach(btn2 => btn2.addEventListener('click', () => onToggleAcceso(btn2.dataset.id, btn2.dataset.activo === 'true')))
                        document.querySelectorAll('.pagina-cliente').forEach(btn2 => btn2.addEventListener('click', () => btn2.click()))
                    }, 50)
                }
            })
        })
    }
}

// ============================================================
// RENDERIZAR FORMULARIO CREAR CLIENTE
// ============================================================

export function renderizarFormularioCrearCliente() {
    return `
        <div class="card">
            <div class="card-header">➕ Nuevo Cliente</div>
            
            <div class="row-flex">
                <div class="grupo"><label>🏢 Nombre *</label><input type="text" id="cliNombre" class="full-width" placeholder="Razón social"></div>
                <div class="grupo"><label>📋 NIF/CIF</label><input type="text" id="cliNif" class="full-width" placeholder="B12345678"></div>
            </div>
            <div class="row-flex">
                <div class="grupo"><label>📧 Email</label><input type="email" id="cliEmail" class="full-width" placeholder="email@ejemplo.com"></div>
                <div class="grupo"><label>📞 Teléfono</label><input type="tel" id="cliTelefono" class="full-width" placeholder="Teléfono"></div>
            </div>
            <div class="row-flex">
                <div class="grupo"><label>📍 Dirección</label><input type="text" id="cliDireccion" class="full-width" placeholder="Calle, número"></div>
            </div>
            <div class="row-flex">
                <div class="grupo"><label>🏙️ Ciudad</label><input type="text" id="cliCiudad" class="full-width" placeholder="Ciudad"></div>
                <div class="grupo"><label>📌 Provincia</label>
                    <select id="cliProvincia" class="full-width">
                        <option value="">-- Seleccionar --</option>
                        <option>Álava</option><option>Albacete</option><option>Alicante</option><option>Almería</option><option>Asturias</option><option>Ávila</option>
                        <option>Badajoz</option><option>Barcelona</option><option>Burgos</option><option>Cáceres</option><option>Cádiz</option><option>Cantabria</option>
                        <option>Castellón</option><option>Ciudad Real</option><option>Córdoba</option><option>Cuenca</option><option>Gerona</option><option>Granada</option>
                        <option>Guadalajara</option><option>Guipúzcoa</option><option>Huelva</option><option>Huesca</option><option>Islas Baleares</option><option>Jaén</option>
                        <option>La Coruña</option><option>La Rioja</option><option>Las Palmas</option><option>León</option><option>Lérida</option><option>Lugo</option>
                        <option>Madrid</option><option>Málaga</option><option>Murcia</option><option>Navarra</option><option>Orense</option><option>Palencia</option>
                        <option>Pontevedra</option><option>Salamanca</option><option>Santa Cruz de Tenerife</option><option>Segovia</option><option>Sevilla</option>
                        <option>Soria</option><option>Tarragona</option><option>Teruel</option><option>Toledo</option><option>Valencia</option><option>Valladolid</option>
                        <option>Vizcaya</option><option>Zamora</option><option>Zaragoza</option>
                    </select>
                </div>
            </div>
            
            <div class="alert-info" style="background: #dbeafe; padding: 12px; border-radius: 12px; margin-top: 16px;">
                <small>🔑 El código de acceso se generará automáticamente al guardar.</small>
            </div>
            
            <div class="btn-group" style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="btnGuardarCliente" class="btn-success">💾 Guardar cliente</button>
                <button id="btnCancelarCliente" class="btn-danger">✖ Cancelar</button>
            </div>
        </div>
        <style>.full-width{width:100%;padding:10px;border-radius:8px;border:1px solid var(--ios-border);}</style>
    `
}

// ============================================================
// RENDERIZAR ACTIVOS DE UN CLIENTE (con botón mapa)
// ============================================================

// ============================================================
// RENDERIZAR ACTIVOS DE UN CLIENTE (con botón mapa mejorado)
// ============================================================

export function renderizarActivosCliente(activos, clienteNombre, onEditar, onEliminar) {
    if (!activos || activos.length === 0) {
        return `
            <div class="card" style="margin-top:16px;">
                <div class="card-header">🏗️ Activos de ${escapeHtml(clienteNombre)}</div>
                <div class="text-center" style="padding: 20px;">
                    <p>No hay activos registrados</p>
                    <button id="btnAgregarActivo" class="btn-success">➕ Agregar activo</button>
                </div>
            </div>
        `
    }
    
    let html = `
        <div class="card" style="margin-top:16px;">
            <div class="card-header">🏗️ Activos de ${escapeHtml(clienteNombre)}
                <button id="btnAgregarActivo" class="btn-success btn-sm" style="float:right;">➕ Agregar</button>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Horario</th>
                            <th>Tipo acceso</th>
                            <th>Contacto</th>
                            <th>Mapa</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
    `
    
    for (const a of activos) {
        const horario = `${a.hora_apertura || '--:--'} - ${a.hora_cierre || '--:--'}`
        const tieneCoordenadas = a.latitud && a.longitud
        
        // Botón mapa mejorado con detección de móvil
        const mapaBtn = tieneCoordenadas 
            ? `<button class="btn-sm ver-mapa" 
                data-lat="${a.latitud}" 
                data-lon="${a.longitud}" 
                data-nombre="${escapeHtml(a.nombre)}" 
                style="background:#0284c7; color:white; font-size:12px;">
                🗺️ Ver
            </button>`
            : `<span class="badge badge-inactivo" style="font-size: 10px;">❌ Sin mapa</span>`
        
        html += `
            <tr>
                <td><strong>${escapeHtml(a.nombre)}</strong><br><small>${escapeHtml(a.direccion || '')}</small></td>
                <td>${horario}</td>
                <td>${escapeHtml(a.tipo_acceso || 'libre')}</td>
                <td>${escapeHtml(a.contacto || '-')}</td>
                <td>${mapaBtn}</td>
                <td>
                    <button class="btn-sm editar-activo" data-id="${a.id}" style="background:#e67e22;">✏️</button>
                    <button class="btn-sm eliminar-activo" data-id="${a.id}" style="background:#dc2626;">🗑️</button>
                </td>
            </tr>
        `
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `
    
    return html
}

export default {
    cargarClientes,
    crearCliente,
    actualizarCliente,
    regenerarCodigoAcceso,
    toggleAccesoCliente,
    darBajaCliente,
    cargarActivos,
    crearActivo,
    actualizarActivo,
    eliminarActivo,
    renderizarListaClientes,
    renderizarFormularioCrearCliente,
    renderizarActivosCliente,
    generarCodigoAcceso
}