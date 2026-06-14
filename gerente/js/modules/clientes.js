// gerente/js/modules/clientes.js
// Gestión de clientes (altas, bajas, activos)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion } from './utils.js'

let clientesLista = []
let activosLista = []

// ============================================================
// CLIENTES - CRUD
// ============================================================

export async function cargarClientes(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .order('nombre_empresa')
        
        if (error) throw error
        
        clientesLista = data || []
        return clientesLista
        
    } catch (error) {
        console.error('Error cargando clientes:', error)
        mostrarMensaje('Error al cargar clientes', 'error')
        return []
    }
}

export async function crearCliente(datos, empresaId) {
    mostrarModalCarga('Creando cliente...')
    
    try {
        const { data, error } = await sb
            .from('empresas')
            .insert({
                nombre_empresa: datos.nombre,
                nif_cif: datos.nif,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                provincia: datos.provincia,
                activo: true
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Cliente ${datos.nombre} creado`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando cliente:', error)
        mostrarMensaje('Error al crear cliente', 'error')
        return null
    }
}

export async function actualizarCliente(id, datos) {
    mostrarModalCarga('Actualizando cliente...')
    
    try {
        const { error } = await sb
            .from('empresas')
            .update({
                nombre_empresa: datos.nombre,
                nif_cif: datos.nif,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                provincia: datos.provincia,
                activo: datos.activo
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

export async function darBajaCliente(id, motivo) {
    mostrarModalConfirmacion(
        `¿Dar de baja este cliente?<br><small>Motivo: ${motivo}</small>`,
        async () => {
            mostrarModalCarga('Procesando...')
            
            try {
                const { error } = await sb
                    .from('empresas')
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
                console.error('Error dando baja:', error)
                mostrarMensaje('Error al dar de baja', 'error')
                return false
            }
        }
    )
}

// ============================================================
// ACTIVOS (propiedades/instalaciones del cliente)
// ============================================================

export async function cargarActivos(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('activos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nombre')
        
        if (error) throw error
        
        activosLista = data || []
        return activosLista
        
    } catch (error) {
        console.error('Error cargando activos:', error)
        mostrarMensaje('Error al cargar activos', 'error')
        return []
    }
}

export async function crearActivo(datos, empresaId) {
    mostrarModalCarga('Creando activo...')
    
    try {
        const { data, error } = await sb
            .from('activos')
            .insert({
                empresa_id: empresaId,
                nombre: datos.nombre,
                direccion: datos.direccion,
                localidad: datos.localidad,
                instrucciones_acceso: datos.instrucciones
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

export async function actualizarActivo(id, datos) {
    mostrarModalCarga('Actualizando activo...')
    
    try {
        const { error } = await sb
            .from('activos')
            .update({
                nombre: datos.nombre,
                direccion: datos.direccion,
                localidad: datos.localidad,
                instrucciones_acceso: datos.instrucciones
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

export async function eliminarActivo(id) {
    mostrarModalConfirmacion(
        '¿Eliminar este activo?<br><small>Se eliminarán también las tareas asociadas.</small>',
        async () => {
            mostrarModalCarga('Eliminando...')
            
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
                mostrarMensaje('Error al eliminar', 'error')
                return false
            }
        }
    )
}

// ============================================================
// RENDERIZADO DE INTERFAZ
// ============================================================

export function renderizarListaClientes(clientes, onVer, onEditar, onBaja) {
    if (!clientes || clientes.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                🏢 No hay clientes
                <br><br>
                <button class="btn-success" id="btnAgregarCliente">➕ Agregar cliente</button>
            </div>
        `
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>NIF/CIF</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const c of clientes) {
        html += `
            <tr>
                <td><strong>${escapeHtml(c.nombre_empresa)}</strong></td>
                <td>${escapeHtml(c.nif_cif || '-')}</td>
                <td>${escapeHtml(c.email || '-')}</td>
                <td>${escapeHtml(c.telefono || '-')}</td>
                <td>${c.activo ? '<span class="badge badge-activo">✅ Activo</span>' : '<span class="badge badge-inactivo">❌ Inactivo</span>'}</td>
                <td>
                    <button class="btn-sm ver-cliente" data-id="${c.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                    <button class="btn-sm editar-cliente" data-id="${c.id}" style="background:#e67e22; color:white;">✏️ Editar</button>
                    ${c.activo ? `<button class="btn-sm baja-cliente" data-id="${c.id}" data-nombre="${escapeHtml(c.nombre_empresa)}" style="background:#dc2626; color:white;">➖ Baja</button>` : ''}
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnAgregarCliente">➕ Agregar cliente</button>
        </div>
    `
    
    return html
}

export function renderizarListaActivos(activos, onVer, onEditar, onEliminar) {
    if (!activos || activos.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                🏗️ No hay activos registrados
                <br><br>
                <button class="btn-success" id="btnAgregarActivo">➕ Agregar activo</button>
            </div>
        `
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Dirección</th>
                        <th>Localidad</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const a of activos) {
        html += `
            <tr>
                <td><strong>${escapeHtml(a.nombre)}</strong></td>
                <td>${escapeHtml(a.direccion || '-')}</td>
                <td>${escapeHtml(a.localidad || '-')}</td>
                <td>
                    <button class="btn-sm ver-activo" data-id="${a.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                    <button class="btn-sm editar-activo" data-id="${a.id}" style="background:#e67e22; color:white;">✏️ Editar</button>
                    <button class="btn-sm eliminar-activo" data-id="${a.id}" style="background:#dc2626; color:white;">🗑️ Eliminar</button>
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnAgregarActivo">➕ Agregar activo</button>
        </div>
    `
    
    return html
}

// ============================================================
// FORMULARIOS MODALES
// ============================================================

export function renderizarModalAgregarCliente() {
    return `
        <div class="row-flex">
            <div class="grupo">
                <label>🏢 Razón Social *</label>
                <input type="text" id="cliNombre" placeholder="Nombre de la empresa">
            </div>
            <div class="grupo">
                <label>📋 NIF/CIF</label>
                <input type="text" id="cliNif" placeholder="B12345678">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📧 Email *</label>
                <input type="email" id="cliEmail" placeholder="email@empresa.com">
            </div>
            <div class="grupo">
                <label>📞 Teléfono</label>
                <input type="tel" id="cliTelefono" placeholder="Teléfono">
            </div>
        </div>
        <div class="form-group">
            <label>📍 Dirección</label>
            <input type="text" id="cliDireccion" placeholder="Calle, número">
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>🏙️ Ciudad</label>
                <input type="text" id="cliCiudad" placeholder="Ciudad">
            </div>
            <div class="grupo">
                <label>📌 Provincia</label>
                <input type="text" id="cliProvincia" placeholder="Provincia">
            </div>
        </div>
    `
}

export function renderizarModalAgregarActivo() {
    return `
        <div class="form-group">
            <label>🏗️ Nombre del activo *</label>
            <input type="text" id="actNombre" placeholder="Ej: Piscina comunitaria">
        </div>
        <div class="form-group">
            <label>📍 Dirección</label>
            <input type="text" id="actDireccion" placeholder="Calle, número">
        </div>
        <div class="form-group">
            <label>🏙️ Localidad</label>
            <input type="text" id="actLocalidad" placeholder="Ciudad/Municipio">
        </div>
        <div class="form-group">
            <label>📝 Instrucciones de acceso</label>
            <textarea id="actInstrucciones" rows="3" placeholder="Código de puerta, contacto, etc."></textarea>
        </div>
    `
}