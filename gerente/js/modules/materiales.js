// gerente/js/modules/materiales.js
// Gestión de stock de materiales y gastos

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion } from './utils.js'

let stockMateriales = []
let gastosMateriales = []

// ============================================================
// STOCK DE MATERIALES - CRUD
// ============================================================

export async function cargarStockMateriales(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('stock_materiales')
            .select('*')
            .order('nombre')
        
        if (error) throw error
        
        stockMateriales = data || []
        return stockMateriales
        
    } catch (error) {
        console.error('Error cargando stock:', error)
        mostrarMensaje('Error al cargar stock', 'error')
        return []
    }
}

export async function crearMaterial(datos, empresaId) {
    mostrarModalCarga('Creando material...')
    
    try {
        const { data, error } = await sb
            .from('stock_materiales')
            .insert({
                nombre: datos.nombre,
                cantidad: datos.cantidad || 0,
                precio_unitario: datos.precio,
                proveedor: datos.proveedor,
                ubicacion: datos.ubicacion,
                stock_minimo: datos.stockMinimo || 0
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Material ${datos.nombre} creado`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando material:', error)
        mostrarMensaje('Error al crear material', 'error')
        return null
    }
}

export async function actualizarMaterial(id, datos) {
    mostrarModalCarga('Actualizando material...')
    
    try {
        const { error } = await sb
            .from('stock_materiales')
            .update({
                nombre: datos.nombre,
                cantidad: datos.cantidad,
                precio_unitario: datos.precio,
                proveedor: datos.proveedor,
                ubicacion: datos.ubicacion,
                stock_minimo: datos.stockMinimo
            })
            .eq('id', id)
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Material actualizado', 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error actualizando material:', error)
        mostrarMensaje('Error al actualizar', 'error')
        return false
    }
}

export async function eliminarMaterial(id) {
    mostrarModalConfirmacion(
        '¿Eliminar este material del inventario?',
        async () => {
            mostrarModalCarga('Eliminando...')
            
            try {
                const { error } = await sb
                    .from('stock_materiales')
                    .delete()
                    .eq('id', id)
                
                if (error) throw error
                
                cerrarModalCarga()
                mostrarMensaje('✅ Material eliminado', 'exito')
                return true
                
            } catch (error) {
                cerrarModalCarga()
                console.error('Error eliminando material:', error)
                mostrarMensaje('Error al eliminar', 'error')
                return false
            }
        }
    )
}

export async function ajustarStock(id, cantidad, motivo) {
    mostrarModalCarga('Ajustando stock...')
    
    try {
        const material = stockMateriales.find(m => m.id === id)
        if (!material) throw new Error('Material no encontrado')
        
        const nuevaCantidad = material.cantidad + cantidad
        
        const { error } = await sb
            .from('stock_materiales')
            .update({ cantidad: nuevaCantidad })
            .eq('id', id)
        
        if (error) throw error
        
        // Registrar movimiento
        await sb.from('movimientos_stock').insert({
            material_id: id,
            cantidad: cantidad,
            tipo: cantidad > 0 ? 'entrada' : 'salida',
            observaciones: motivo
        })
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Stock ajustado: ${cantidad > 0 ? '+' : ''}${cantidad} unidades`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error ajustando stock:', error)
        mostrarMensaje('Error al ajustar stock', 'error')
        return false
    }
}

// ============================================================
// GASTOS DE MATERIALES
// ============================================================

export async function cargarGastosMateriales(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('facturas_gastos')
            .select('*')
            .order('fecha', { ascending: false })
        
        if (error) throw error
        
        gastosMateriales = data || []
        return gastosMateriales
        
    } catch (error) {
        console.error('Error cargando gastos:', error)
        mostrarMensaje('Error al cargar gastos', 'error')
        return []
    }
}

export async function registrarGasto(datos) {
    mostrarModalCarga('Registrando gasto...')
    
    try {
        const { data, error } = await sb
            .from('facturas_gastos')
            .insert({
                proveedor: datos.proveedor,
                numero_factura: datos.numeroFactura,
                fecha: datos.fecha,
                importe_total: datos.importe,
                iva: datos.iva || (datos.importe * 0.21),
                categoria: datos.categoria,
                pdf_url: datos.pdfUrl || null
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje('✅ Gasto registrado', 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error registrando gasto:', error)
        mostrarMensaje('Error al registrar gasto', 'error')
        return null
    }
}

// ============================================================
// RENDERIZADO DE INTERFAZ
// ============================================================

export function renderizarStockMateriales(materiales, onEditar, onAjustar, onEliminar) {
    if (!materiales || materiales.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                📦 No hay materiales en stock
                <br><br>
                <button class="btn-success" id="btnAgregarMaterial">➕ Agregar material</button>
            </div>
        `
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Cantidad</th>
                        <th>Precio unitario</th>
                        <th>Proveedor</th>
                        <th>Ubicación</th>
                        <th>Stock mínimo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const m of materiales) {
        const stockBajo = m.cantidad <= m.stock_minimo
        const stockClass = stockBajo ? 'badge-inactivo' : 'badge-activo'
        
        html += `
            <tr>
                <td><strong>${escapeHtml(m.nombre)}</strong></td>
                <td><span class="badge ${stockClass}">${m.cantidad} uds</span></td>
                <td>${formatMoney(m.precio_unitario || 0)}€</td>
                <td>${escapeHtml(m.proveedor || '-')}</td>
                <td>${escapeHtml(m.ubicacion || '-')}</td>
                <td>${m.stock_minimo || 0} uds</td>
                <td>
                    <button class="btn-sm editar-material" data-id="${m.id}" style="background:#e67e22; color:white;">✏️ Editar</button>
                    <button class="btn-sm ajustar-stock" data-id="${m.id}" style="background:#0284c7; color:white;">📦 Ajustar</button>
                    <button class="btn-sm eliminar-material" data-id="${m.id}" style="background:#dc2626; color:white;">🗑️ Eliminar</button>
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnAgregarMaterial">➕ Agregar material</button>
        </div>
    `
    
    return html
}

export function renderizarGastosMateriales(gastos) {
    if (!gastos || gastos.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                💰 No hay gastos registrados
                <br><br>
                <button class="btn-success" id="btnRegistrarGasto">➕ Registrar gasto</button>
            </div>
        `
    }
    
    let totalGastos = 0
    let totalIva = 0
    
    for (const g of gastos) {
        totalGastos += g.importe_total || 0
        totalIva += g.iva || 0
    }
    
    let html = `
        <div class="card" style="margin-bottom: 16px; background: #f0fdf4;">
            <div class="card-header">📊 Resumen de gastos</div>
            <div style="display: flex; gap: 20px; justify-content: space-around;">
                <div><strong>Total gastos:</strong> ${formatMoney(totalGastos)}€</div>
                <div><strong>Total IVA:</strong> ${formatMoney(totalIva)}€</div>
                <div><strong>Total + IVA:</strong> ${formatMoney(totalGastos + totalIva)}€</div>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Nº Factura</th>
                        <th>Fecha</th>
                        <th>Importe</th>
                        <th>IVA</th>
                        <th>Total</th>
                        <th>Categoría</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const g of gastos) {
        const total = (g.importe_total || 0) + (g.iva || 0)
        html += `
            <tr>
                <td>${escapeHtml(g.proveedor)}</td>
                <td>${escapeHtml(g.numero_factura || '-')}</td>
                <td>${formatearFecha(g.fecha)}</td>
                <td>${formatMoney(g.importe_total)}€</td>
                <td>${formatMoney(g.iva || 0)}€</td>
                <td><strong>${formatMoney(total)}€</strong></td>
                <td>${escapeHtml(g.categoria || '-')}</td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnRegistrarGasto">➕ Registrar gasto</button>
        </div>
    `
    
    return html
}

// ============================================================
// FORMULARIOS MODALES
// ============================================================

export function renderizarModalAgregarMaterial() {
    return `
        <div class="row-flex">
            <div class="grupo">
                <label>📦 Nombre del material *</label>
                <input type="text" id="matNombre" placeholder="Ej: Cloro granulado">
            </div>
            <div class="grupo">
                <label>📊 Cantidad inicial</label>
                <input type="number" id="matCantidad" value="0" step="1">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>💰 Precio unitario (€)</label>
                <input type="number" id="matPrecio" step="0.01" placeholder="0.00">
            </div>
            <div class="grupo">
                <label>🏭 Proveedor</label>
                <input type="text" id="matProveedor" placeholder="Nombre del proveedor">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📍 Ubicación</label>
                <input type="text" id="matUbicacion" placeholder="Estantería, almacén...">
            </div>
            <div class="grupo">
                <label>⚠️ Stock mínimo</label>
                <input type="number" id="matStockMinimo" value="0" step="1">
            </div>
        </div>
    `
}

export function renderizarModalAjustarStock(material) {
    return `
        <div class="form-group">
            <label>📦 Material: <strong>${escapeHtml(material.nombre)}</strong></label>
            <p>Stock actual: <strong>${material.cantidad}</strong> unidades</p>
        </div>
        <div class="form-group">
            <label>📊 Cantidad a ajustar</label>
            <input type="number" id="ajusteCantidad" step="1" placeholder="Ej: +5 o -3">
            <small>Usa + para añadir, - para restar</small>
        </div>
        <div class="form-group">
            <label>📝 Motivo del ajuste</label>
            <textarea id="ajusteMotivo" rows="2" placeholder="Ej: Compra de proveedor, rotura, etc."></textarea>
        </div>
    `
}

export function renderizarModalRegistrarGasto() {
    return `
        <div class="row-flex">
            <div class="grupo">
                <label>🏭 Proveedor *</label>
                <input type="text" id="gastoProveedor" placeholder="Nombre del proveedor">
            </div>
            <div class="grupo">
                <label>📄 Nº Factura</label>
                <input type="text" id="gastoNumeroFactura" placeholder="Factura número">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📅 Fecha *</label>
                <input type="date" id="gastoFecha">
            </div>
            <div class="grupo">
                <label>💰 Importe (sin IVA) *</label>
                <input type="number" id="gastoImporte" step="0.01" placeholder="0.00">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>🧾 IVA (21%)</label>
                <input type="number" id="gastoIva" step="0.01" placeholder="Calculado automáticamente" readonly>
            </div>
            <div class="grupo">
                <label>📂 Categoría</label>
                <select id="gastoCategoria">
                    <option value="materiales">📦 Materiales</option>
                    <option value="herramientas">🔧 Herramientas</option>
                    <option value="suministros">📋 Suministros</option>
                    <option value="otros">📌 Otros</option>
                </select>
            </div>
        </div>
        <script>
            document.getElementById('gastoImporte')?.addEventListener('input', function() {
                const importe = parseFloat(this.value) || 0;
                const iva = importe * 0.21;
                document.getElementById('gastoIva').value = iva.toFixed(2);
            });
        </script>
    `
}