// gerente/js/modules/facturacion.js
// Gestión de ingresos (facturación a clientes) y pagos (a técnicos/proveedores)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, mostrarModalConfirmacion } from './utils.js'

let facturasIngresos = []
let pagosRealizados = []

// ============================================================
// INGRESOS (Facturas a clientes)
// ============================================================

export async function cargarIngresos(empresaId) {
    if (!empresaId) return []
    
    try {
        const { data, error } = await sb
            .from('facturas')
            .select(`
                *,
                empresas!empresa_id(id, nombre_empresa)
            `)
            .order('fecha_expedicion', { ascending: false })
        
        if (error) throw error
        
        facturasIngresos = data || []
        return facturasIngresos
        
    } catch (error) {
        console.error('Error cargando ingresos:', error)
        mostrarMensaje('Error al cargar ingresos', 'error')
        return []
    }
}

export async function crearFacturaIngreso(datos, empresaId) {
    mostrarModalCarga('Creando factura...')
    
    try {
        // Generar número de factura
        const { data: ultimaFactura } = await sb
            .from('facturas')
            .select('numero_factura')
            .order('created_at', { ascending: false })
            .limit(1)
        
        let numeroFactura = 'F20260001'
        if (ultimaFactura && ultimaFactura.length > 0) {
            const ultimoNumero = parseInt(ultimaFactura[0].numero_factura.slice(-4))
            numeroFactura = `F2026${String(ultimoNumero + 1).padStart(4, '0')}`
        }
        
        const { data, error } = await sb
            .from('facturas')
            .insert({
                empresa_id: datos.clienteId,
                numero_factura: numeroFactura,
                fecha_expedicion: datos.fecha,
                fecha_vencimiento: datos.fechaVencimiento,
                cliente_nif: datos.clienteNif,
                cliente_nombre: datos.clienteNombre,
                subtotal: datos.subtotal,
                iva_total: datos.iva,
                importe_total: datos.total,
                estado: datos.estado || 'pendiente'
            })
            .select()
            .single()
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Factura ${numeroFactura} creada`, 'exito')
        return data
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error creando factura:', error)
        mostrarMensaje('Error al crear factura', 'error')
        return null
    }
}

export async function registrarCobro(facturaId, importe, formaPago, fechaCobro) {
    mostrarModalCarga('Registrando cobro...')
    
    try {
        const { data: factura } = await sb
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single()
        
        if (!factura) throw new Error('Factura no encontrada')
        
        const totalCobradoActual = factura.total_cobrado || 0
        const nuevoTotalCobrado = totalCobradoActual + importe
        const nuevoEstado = nuevoTotalCobrado >= factura.importe_total ? 'pagada' : 'parcial'
        
        // Actualizar factura
        const { error } = await sb
            .from('facturas')
            .update({
                total_cobrado: nuevoTotalCobrado,
                saldo_cobro: factura.importe_total - nuevoTotalCobrado,
                estado_cobro: nuevoEstado === 'pagada' ? 'cobrado' : 'parcial',
                estado: nuevoEstado
            })
            .eq('id', facturaId)
        
        if (error) throw error
        
        // Registrar cobro
        await sb.from('cobros_clientes').insert({
            factura_id: facturaId,
            empresa_id: factura.empresa_id,
            importe: importe,
            fecha_cobro: fechaCobro,
            forma_pago: formaPago
        })
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Cobro de ${formatMoney(importe)}€ registrado`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error registrando cobro:', error)
        mostrarMensaje('Error al registrar cobro', 'error')
        return false
    }
}

// ============================================================
// PAGOS (a técnicos y proveedores)
// ============================================================

export async function cargarPagos(empresaId) {
    if (!empresaId) return []
    
    try {
        // Pagos a técnicos (facturas_externas)
        const { data: pagosTecnicos } = await sb
            .from('facturas_externas')
            .select(`
                *,
                tecnicos!tecnico_id(id, nombre)
            `)
            .order('created_at', { ascending: false })
        
        // Gastos a proveedores (facturas_gastos)
        const { data: pagosProveedores } = await sb
            .from('facturas_gastos')
            .select('*')
            .order('fecha', { ascending: false })
        
        pagosRealizados = [
            ...(pagosTecnicos || []).map(p => ({ ...p, tipo: 'tecnico' })),
            ...(pagosProveedores || []).map(p => ({ ...p, tipo: 'proveedor' }))
        ]
        
        return pagosRealizados
        
    } catch (error) {
        console.error('Error cargando pagos:', error)
        mostrarMensaje('Error al cargar pagos', 'error')
        return []
    }
}

export async function registrarPagoTecnico(datos) {
    mostrarModalCarga('Registrando pago...')
    
    try {
        const { error } = await sb
            .from('pagos_tecnicos')
            .insert({
                tecnico_id: datos.tecnicoId,
                importe: datos.importe,
                fecha_pago: datos.fecha,
                concepto: datos.concepto,
                metodo: datos.metodo,
                referencia: datos.referencia
            })
        
        if (error) throw error
        
        cerrarModalCarga()
        mostrarMensaje(`✅ Pago a técnico registrado`, 'exito')
        return true
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error registrando pago:', error)
        mostrarMensaje('Error al registrar pago', 'error')
        return false
    }
}

// ============================================================
// RENDERIZADO DE INTERFAZ
// ============================================================

export function renderizarIngresos(facturas, onVer, onCobrar) {
    if (!facturas || facturas.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                📈 No hay facturas de ingresos
                <br><br>
                <button class="btn-success" id="btnNuevaFactura">➕ Nueva factura</button>
            </div>
        `
    }
    
    let totalFacturado = 0
    let totalCobrado = 0
    let totalPendiente = 0
    
    for (const f of facturas) {
        totalFacturado += f.importe_total
        totalCobrado += f.total_cobrado || 0
        totalPendiente += (f.importe_total - (f.total_cobrado || 0))
    }
    
    let html = `
        <div class="card" style="margin-bottom: 16px; background: #f0fdf4;">
            <div class="card-header">📊 Resumen de ingresos</div>
            <div style="display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap;">
                <div><strong>💰 Total facturado:</strong> ${formatMoney(totalFacturado)}€</div>
                <div><strong>✅ Total cobrado:</strong> ${formatMoney(totalCobrado)}€</div>
                <div><strong>⏳ Pendiente de cobro:</strong> ${formatMoney(totalPendiente)}€</div>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nº Factura</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Importe</th>
                        <th>Cobrado</th>
                        <th>Pendiente</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const f of facturas) {
        const cobrado = f.total_cobrado || 0
        const pendiente = f.importe_total - cobrado
        const estadoTexto = f.estado === 'pagada' ? 'Pagada' : (f.estado === 'parcial' ? 'Parcial' : 'Pendiente')
        const estadoClass = f.estado === 'pagada' ? 'badge-activo' : (f.estado === 'parcial' ? 'badge-pendiente' : 'badge-inactivo')
        
        html += `
            <tr>
                <td><strong>${escapeHtml(f.numero_factura)}</strong></td>
                <td>${escapeHtml(f.cliente_nombre || '-')}</td>
                <td>${formatearFecha(f.fecha_expedicion)}</td>
                <td>${formatMoney(f.importe_total)}€</td>
                <td>${formatMoney(cobrado)}€</td>
                <td>${formatMoney(pendiente)}€</td>
                <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                <td>
                    <button class="btn-sm ver-factura" data-id="${f.id}" style="background:#0284c7; color:white;">👁️ Ver</button>
                    ${pendiente > 0 ? `<button class="btn-sm cobrar-factura" data-id="${f.id}" style="background:#2c7a4d; color:white;">💰 Cobrar</button>` : ''}
                </td>
            </tr>
        `
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 16px; text-align: right;">
            <button class="btn-success" id="btnNuevaFactura">➕ Nueva factura</button>
        </div>
    `
    
    return html
}

export function renderizarPagos(pagos, onVer) {
    if (!pagos || pagos.length === 0) {
        return `
            <div class="text-center" style="padding: 40px; color: var(--ios-gray);">
                💳 No hay pagos registrados
            </div>
        `
    }
    
    let totalPagos = 0
    
    for (const p of pagos) {
        totalPagos += p.importe_total || p.importe || 0
    }
    
    let html = `
        <div class="card" style="margin-bottom: 16px; background: #fef3c7;">
            <div class="card-header">📊 Resumen de pagos</div>
            <div><strong>💰 Total pagado:</strong> ${formatMoney(totalPagos)}€</div>
        </div>
        
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Beneficiario</th>
                        <th>Fecha</th>
                        <th>Importe</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    for (const p of pagos) {
        let concepto = ''
        let beneficiario = ''
        let fecha = ''
        let importe = 0
        
        if (p.tipo === 'tecnico') {
            concepto = 'Pago a técnico'
            beneficiario = p.tecnicos?.nombre || 'Técnico'
            fecha = p.created_at
            importe = p.total_general || 0
        } else {
            concepto = 'Compra a proveedor'
            beneficiario = p.proveedor
            fecha = p.fecha
            importe = (p.importe_total || 0) + (p.iva || 0)
        }
        
        html += `
            <tr>
                <td>${escapeHtml(concepto)}</td>
                <td>${escapeHtml(beneficiario)}</td>
                <td>${formatearFecha(fecha)}</td>
                <td><strong>${formatMoney(importe)}€</strong></td>
                <td>
                    <button class="btn-sm ver-pago" data-id="${p.id}" data-tipo="${p.tipo}" style="background:#0284c7; color:white;">👁️ Ver</button>
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
// FORMULARIOS MODALES
// ============================================================

export function renderizarModalNuevaFactura(clientes) {
    const clienteOptions = clientes.map(c => 
        `<option value="${c.id}" data-nif="${escapeHtml(c.nif_cif || '')}" data-nombre="${escapeHtml(c.nombre_empresa)}">${escapeHtml(c.nombre_empresa)}</option>`
    ).join('')
    
    return `
        <div class="form-group">
            <label>🏢 Cliente *</label>
            <select id="facturaCliente">
                <option value="">-- Seleccionar cliente --</option>
                ${clienteOptions}
            </select>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📅 Fecha *</label>
                <input type="date" id="facturaFecha" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="grupo">
                <label>📅 Fecha vencimiento</label>
                <input type="date" id="facturaVencimiento">
            </div>
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>💰 Subtotal (sin IVA)</label>
                <input type="number" id="facturaSubtotal" step="0.01" placeholder="0.00">
            </div>
            <div class="grupo">
                <label>🧾 IVA (21%)</label>
                <input type="number" id="facturaIva" step="0.01" readonly>
            </div>
            <div class="grupo">
                <label>💶 Total</label>
                <input type="number" id="facturaTotal" step="0.01" readonly>
            </div>
        </div>
        <div class="form-group">
            <label>📋 Concepto</label>
            <textarea id="facturaConcepto" rows="3" placeholder="Descripción de los servicios..."></textarea>
        </div>
        <div class="form-group">
            <label>📌 Estado</label>
            <select id="facturaEstado">
                <option value="pendiente">Pendiente de cobro</option>
                <option value="pagada">Pagada</option>
                <option value="parcial">Cobro parcial</option>
            </select>
        </div>
        <script>
            function calcularTotalFactura() {
                const subtotal = parseFloat(document.getElementById('facturaSubtotal')?.value) || 0;
                const iva = subtotal * 0.21;
                const total = subtotal + iva;
                const ivaInput = document.getElementById('facturaIva');
                const totalInput = document.getElementById('facturaTotal');
                if (ivaInput) ivaInput.value = iva.toFixed(2);
                if (totalInput) totalInput.value = total.toFixed(2);
            }
            document.getElementById('facturaSubtotal')?.addEventListener('input', calcularTotalFactura);
        </script>
    `
}

export function renderizarModalCobrar(factura) {
    const pendiente = factura.importe_total - (factura.total_cobrado || 0)
    
    return `
        <div class="form-group">
            <label>📄 Factura: <strong>${escapeHtml(factura.numero_factura)}</strong></label>
            <p>Total: ${formatMoney(factura.importe_total)}€</p>
            <p>Pendiente: ${formatMoney(pendiente)}€</p>
        </div>
        <div class="form-group">
            <label>💰 Importe a cobrar *</label>
            <input type="number" id="cobroImporte" step="0.01" max="${pendiente}" placeholder="0.00">
        </div>
        <div class="row-flex">
            <div class="grupo">
                <label>📅 Fecha de cobro *</label>
                <input type="date" id="cobroFecha" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="grupo">
                <label>💳 Forma de pago</label>
                <select id="cobroFormaPago">
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="tarjeta">Tarjeta de crédito/débito</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="bizum">Bizum</option>
                </select>
            </div>
        </div>
    `
}