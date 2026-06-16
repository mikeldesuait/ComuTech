// gerente/js/modules/clientes.js
// Gestión de clientes del gerente (alta, baja, códigos de acceso)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, mostrarModalCarga, cerrarModalCarga } from './utils.js'

let clientesLista = []

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
// GENERAR CÓDIGO DE ACCESO (formato: LLL NNNN)
// ============================================================

export function generarCodigoAcceso() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Sin Ñ ni vocales para evitar confusiones
    const letra1 = letras[Math.floor(Math.random() * letras.length)]
    const letra2 = letras[Math.floor(Math.random() * letras.length)]
    const letra3 = letras[Math.floor(Math.random() * letras.length)]
    const numeros = Math.floor(Math.random() * 9000 + 1000) // 4 dígitos
    return `${letra1}${letra2}${letra3} ${numeros}`
}

// ============================================================
// CREAR NUEVO CLIENTE CON CÓDIGO
// ============================================================

export async function crearCliente(datos, empresaId) {
    mostrarModalCarga('Creando cliente...')
    
    try {
        // Generar código único (hasta 3 intentos)
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
// RENDERIZAR LISTA DE CLIENTES
// ============================================================

export function renderizarListaClientes(clientes, onEditar, onRegenerarCodigo, onToggleAcceso) {
    if (!clientes || clientes.length === 0) {
        return `
            <div class="text-center" style="padding: 40px;">
                <p>🏢 No hay clientes registrados</p>
                <button id="btnAgregarCliente" class="btn-success">➕ Agregar cliente</button>
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
                        <th>Contacto</th>
                        <th>Código acceso</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const c of clientes) {
        html += `
            <tr>
                <td><strong>${escapeHtml(c.nombre)}</strong><br><small>${escapeHtml(c.direccion || '-')}</small></td>
                <td>${escapeHtml(c.nif_cif || '-')}</td>
                <td>${escapeHtml(c.email || '-')}<br>${escapeHtml(c.telefono || '-')}</td>
                <td><span class="badge badge-activo" style="font-family: monospace; font-size: 14px;">${escapeHtml(c.codigo_acceso || '-')}</span></td>
                <td>${c.acceso_activo ? '<span class="badge badge-activo">✅ Activo</span>' : '<span class="badge badge-inactivo">🔒 Inactivo</span>'}</td>
                <td>
                    <button class="btn-sm editar-cliente" data-id="${c.id}" style="background:#e67e22;">✏️</button>
                    <button class="btn-sm regenerar-codigo" data-id="${c.id}" style="background:#0284c7;">🔄 Código</button>
                    <button class="btn-sm toggle-acceso" data-id="${c.id}" data-activo="${c.acceso_activo}" style="background:${c.acceso_activo ? '#dc2626' : '#2c7a4d'};">${c.acceso_activo ? '🔒 Desactivar' : '✅ Activar'}</button>
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button id="btnAgregarCliente" class="btn-success">➕ Agregar cliente</button>
        </div>
    `
    
    return html
}

// ============================================================
// RENDERIZAR FORMULARIO CREAR CLIENTE
// ============================================================

export function renderizarFormularioCrearCliente() {
    return `
        <div class="card">
            <div class="card-header">➕ Nuevo Cliente</div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>🏢 Nombre *</label>
                    <input type="text" id="cliNombre" class="full-width" placeholder="Razón social">
                </div>
                <div class="grupo">
                    <label>📋 NIF/CIF</label>
                    <input type="text" id="cliNif" class="full-width" placeholder="B12345678">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📧 Email</label>
                    <input type="email" id="cliEmail" class="full-width" placeholder="email@ejemplo.com">
                </div>
                <div class="grupo">
                    <label>📞 Teléfono</label>
                    <input type="tel" id="cliTelefono" class="full-width" placeholder="Teléfono">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>📍 Dirección</label>
                    <input type="text" id="cliDireccion" class="full-width" placeholder="Calle, número">
                </div>
            </div>
            
            <div class="row-flex">
                <div class="grupo">
                    <label>🏙️ Ciudad</label>
                    <input type="text" id="cliCiudad" class="full-width" placeholder="Ciudad">
                </div>
                <div class="grupo">
                    <label>📌 Provincia</label>
                    <input type="text" id="cliProvincia" class="full-width" placeholder="Provincia">
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
        
        <style>
            .full-width {
                width: 100%;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid var(--ios-border);
            }
        </style>
    `
}