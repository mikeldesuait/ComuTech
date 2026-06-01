// super-user/js/modules/facturacion.js
// 💰 MÓDULO DE FACTURACIÓN

import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney } from './utils.js';
import { mostrarModalCarga, cerrarModalCarga } from './modales/modalesGenerales.js';

let facturas = [];
let facturasFiltradas = [];
let paginaActual = 1;
const registrosPorPagina = 15;

let productosDisponibles = [];
let productosSeleccionados = [];

// ============================================================
// INICIALIZAR MÓDULO
// ============================================================

export async function iniciar() {
    console.log('💰 Iniciando módulo de facturación');
    await cargarFacturas();
    await cargarProductos();
    renderizarVistaFacturacion();
    setupEventosFacturacion();
}

// ============================================================
// CARGAR DATOS
// ============================================================

async function cargarFacturas() {
    try {
        const { data, error } = await sb
            .from('facturas')
            .select('*')
            .order('fecha_expedicion', { ascending: false });
        
        if (error) throw error;
        
        facturas = data || [];
        facturasFiltradas = [...facturas];
        
    } catch (error) {
        console.error('Error cargando facturas:', error);
        mostrarMensaje('Error cargando facturas: ' + error.message, 'error');
    }
}

async function cargarProductos() {
    try {
        const { data, error } = await sb
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('nombre_producto');
        
        if (error) throw error;
        
        productosDisponibles = data || [];
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        productosDisponibles = [];
    }
}

async function cargarClientesParaSelect() {
    try {
        const { data, error } = await sb
            .from('empresas')
            .select('id, nombre_empresa, nif_cif')
            .eq('activo', true)
            .order('nombre_empresa');
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando clientes:', error);
        return [];
    }
}

// ============================================================
// RENDERIZAR VISTA PRINCIPAL
// ============================================================

function renderizarVistaFacturacion() {
    const container = document.getElementById('moduloContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="facturacion-container">
            <div class="facturacion-header">
                <h2>💰 Facturación</h2>
                <button id="btnNuevaFactura" class="btn-primario">➕ Nueva Factura</button>
            </div>
            
            <div class="filtros-facturacion">
                <input type="text" id="filtroFactura" placeholder="🔍 Buscar factura (nº, cliente, NIF)...">
                <select id="filtroEstadoFactura">
                    <option value="">Todos los estados</option>
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="pagada">✅ Pagada</option>
                    <option value="vencida">⚠️ Vencida</option>
                    <option value="anulada">❌ Anulada</option>
                </select>
                <select id="filtroClienteFactura">
                    <option value="">Todos los clientes</option>
                </select>
            </div>
            
            <div id="facturasContent">
                ${renderizarTablaFacturas()}
            </div>
        </div>
    `;
    
    // Cargar opciones de clientes en el filtro
    cargarClientesEnFiltro();
}

async function cargarClientesEnFiltro() {
    const clientes = await cargarClientesParaSelect();
    const selectFiltro = document.getElementById('filtroClienteFactura');
    if (!selectFiltro) return;
    
    // Obtener clientes únicos de las facturas
    const clientesUnicos = [...new Map(facturas.map(f => [f.cliente_nif, {
        nombre: f.cliente_nombre,
        nif: f.cliente_nif
    }])).values()];
    
    selectFiltro.innerHTML = '<option value="">Todos los clientes</option>' +
        clientesUnicos.map(c => `
            <option value="${escapeHtml(c.nif)}">${escapeHtml(c.nombre)} (${escapeHtml(c.nif)})</option>
        `).join('');
}

function renderizarTablaFacturas() {
    if (facturasFiltradas.length === 0) {
        return '<div class="empty-state">📭 No hay facturas</div>';
    }
    
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const paginadas = facturasFiltradas.slice(inicio, inicio + registrosPorPagina);
    
    return `
        <table class="tabla-facturas">
            <thead>
                <tr>
                    <th>Nº Factura</th>
                    <th>Cliente</th>
                    <th>NIF</th>
                    <th>Fecha</th>
                    <th>Vencimiento</th>
                    <th>Base</th>
                    <th>IVA</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${paginadas.map(factura => `
                    <tr class="estado-${factura.estado}">
                        <td><strong>${escapeHtml(factura.numero_factura)}</strong></td>
                        <td>${escapeHtml(factura.cliente_nombre)}</td>
                        <td>${escapeHtml(factura.cliente_nif)}</td>
                        <td>${new Date(factura.fecha_expedicion).toLocaleDateString()}</td>
                        <td>${new Date(factura.fecha_vencimiento).toLocaleDateString()}</td>
                        <td>${formatMoney(factura.subtotal)} €</td>
                        <td>${formatMoney(factura.iva_total)} €</td>
                        <td><strong>${formatMoney(factura.importe_total)} €</strong></td>
                        <td>${getBadgeEstadoFactura(factura.estado)}</td>
                        <td class="acciones">
                            <button class="btn-sm ver-factura" data-id="${factura.id}">👁️ Ver</button>
                            <button class="btn-sm pdf-factura" data-id="${factura.id}">📄 PDF</button>
                            ${factura.estado === 'pendiente' ? 
                                `<button class="btn-sm pagar-factura" data-id="${factura.id}">💰 Pagar</button>` : ''}
                            ${factura.estado === 'pendiente' ? 
                                `<button class="btn-sm enviar-factura" data-id="${factura.id}">📧 Enviar</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${renderizarPaginacion()}
    `;
}

function renderizarPaginacion() {
    const totalPaginas = Math.ceil(facturasFiltradas.length / registrosPorPagina);
    if (totalPaginas <= 1) return '';
    
    let html = '<div class="paginacion">';
    for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="${i === paginaActual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
    }
    html += '</div>';
    return html;
}

function getBadgeEstadoFactura(estado) {
    const badges = {
        'pagada': '<span class="badge badge-exito">✅ Pagada</span>',
        'pendiente': '<span class="badge badge-pendiente">⏳ Pendiente</span>',
        'vencida': '<span class="badge badge-error">⚠️ Vencida</span>',
        'anulada': '<span class="badge badge-anulada">❌ Anulada</span>'
    };
    return badges[estado] || badges['pendiente'];
}

// ============================================================
// MODAL NUEVA FACTURA
// ============================================================

async function abrirModalNuevaFactura() {
    await cargarProductos();
    const clientes = await cargarClientesParaSelect();
    
    productosSeleccionados = [];
    
    const modal = document.createElement('div');
    modal.id = 'modalNuevaFactura';
    modal.className = 'modal';
    modal.style.alignItems = 'flex-start';
    modal.style.overflowY = 'auto';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; background: white; padding: 0; overflow: hidden;">
            <!-- CABECERA FACTURA -->
            <div style="background: #1e4663; color: white; padding: 24px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="margin: 0; font-size: 1.8rem;">FACTURA</h2>
                    <p style="margin: 4px 0 0; opacity: 0.8;">Nueva factura</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; opacity: 0.8;">Nº Factura</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">PENDIENTE</div>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <!-- DATOS DEL CLIENTE -->
                <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                    <div style="font-weight: bold; color: #1e4663; margin-bottom: 16px; border-left: 4px solid #1e4663; padding-left: 12px;">📋 DATOS DEL CLIENTE</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="font-size: 0.7rem; color: #64748b;">CLIENTE *</label>
                            <select id="facturaCliente" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                <option value="">-- Seleccionar cliente --</option>
                                ${clientes.map(c => `
                                    <option value="${c.id}" data-nombre="${escapeHtml(c.nombre_empresa)}" data-nif="${escapeHtml(c.nif_cif || '')}">
                                        ${escapeHtml(c.nombre_empresa)} (${escapeHtml(c.nif_cif || 'Sin NIF')})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; color: #64748b;">FECHA DE VENCIMIENTO *</label>
                            <input type="date" id="facturaVencimiento" value="${calcularFechaVencimiento()}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        </div>
                    </div>
                </div>
                
                <!-- LÍNEAS DE FACTURA (TABLA DE PRODUCTOS) -->
                <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8fafc;">
                            <tr>
                                <th style="padding: 12px; text-align: left; font-size: 0.75rem; color: #1e4663;">CONCEPTO</th>
                                <th style="padding: 12px; text-align: center; width: 80px; font-size: 0.75rem; color: #1e4663;">CANTIDAD</th>
                                <th style="padding: 12px; text-align: right; width: 120px; font-size: 0.75rem; color: #1e4663;">PRECIO</th>
                                <th style="padding: 12px; text-align: right; width: 100px; font-size: 0.75rem; color: #1e4663;">IVA</th>
                                <th style="padding: 12px; text-align: right; width: 120px; font-size: 0.75rem; color: #1e4663;">TOTAL</th>
                                <th style="padding: 12px; text-align: center; width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody id="listaProductosFactura">
                            <tr>
                                <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                                    ➕ Agrega productos usando el formulario de abajo
                                </td>
                            </tr>
                        </tbody>
                        <tfoot id="totalesFactura" style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
                            <tr>
                                <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">SUBTOTAL:</td>
                                <td style="padding: 12px; text-align: right; font-weight: bold;" id="previewSubtotal">0,00 €</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">IVA (21%):</td>
                                <td style="padding: 12px; text-align: right; font-weight: bold;" id="previewIva">0,00 €</td>
                                <td></td>
                            </tr>
                            <tr style="background: #1e4663; color: white;">
                                <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.1rem;">TOTAL:</td>
                                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.2rem;" id="previewTotal">0,00 €</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <!-- FORMULARIO PARA AGREGAR PRODUCTOS -->
                <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <div style="font-weight: bold; margin-bottom: 12px;">➕ Agregar producto / servicio</div>
                    <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: end;">
                        <div>
                            <label style="font-size: 0.7rem;">Producto</label>
                            <select id="selectProductoFactura" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                <option value="">-- Seleccionar --</option>
                                ${productosDisponibles.map(p => `
                                    <option value="${p.id}" data-precio="${p.precio_unitario}" data-iva="${p.iva_aplicable || 21}" data-nombre="${escapeHtml(p.nombre_producto)}">
                                        ${escapeHtml(p.nombre_producto)} - ${formatMoney(p.precio_unitario)} €
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div style="width: 100px;">
                            <label style="font-size: 0.7rem;">Cantidad</label>
                            <input type="number" id="cantidadProductoFactura" value="1" min="1" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        </div>
                        <div>
                            <button id="btnAgregarProductoFactura" style="background: #1e4663; padding: 10px 20px; border-radius: 8px;">➕ Agregar</button>
                        </div>
                    </div>
                </div>
                
                <!-- BOTONES FINALES -->
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    <button id="btnCancelarFacturaNueva" style="background: #94a3b8;">✖ Cancelar</button>
                    <button id="btnGenerarFacturaNueva" style="background: #2c7a4d;">✅ Generar Factura</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Eventos
    modal.querySelector('.close-modal')?.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.getElementById('btnCancelarFacturaNueva').onclick = () => modal.remove();
    document.getElementById('btnAgregarProductoFactura').onclick = () => agregarProductoFactura();
    document.getElementById('btnGenerarFacturaNueva').onclick = () => generarFactura(modal);
    
    // Sincronizar teléfono/WhatsApp
    const mismoWhatsapp = document.getElementById('mismoWhatsappJuridica');
    const telefonoInput = document.getElementById('telefonoContacto');
    const whatsappInput = document.getElementById('whatsappContacto');
    if (mismoWhatsapp && telefonoInput && whatsappInput) {
        mismoWhatsapp.onchange = () => {
            if (mismoWhatsapp.checked) {
                whatsappInput.value = telefonoInput.value;
                whatsappInput.disabled = true;
            } else {
                whatsappInput.disabled = false;
            }
        };
        telefonoInput.oninput = () => {
            if (mismoWhatsapp.checked) {
                whatsappInput.value = telefonoInput.value;
            }
        };
    }
}

function agregarProductoFactura() {
    const select = document.getElementById('selectProductoFactura');
    const option = select.options[select.selectedIndex];
    const productoId = select.value;
    const cantidad = parseInt(document.getElementById('cantidadProductoFactura')?.value || 1);
    
    if (!productoId) {
        mostrarMensaje('Selecciona un producto', 'error');
        return;
    }
    
    const producto = productosDisponibles.find(p => p.id === productoId);
    if (producto) {
        productosSeleccionados.push({
            concepto: producto.nombre_producto,
            cantidad: cantidad,
            precio_unitario: producto.precio_unitario,
            iva: producto.iva_aplicable || 21
        });
        actualizarListaProductos();
        actualizarPreviewTotal();
        
        select.value = '';
        document.getElementById('cantidadProductoFactura').value = '1';
    }
}

function actualizarListaProductos() {
    const tbody = document.getElementById('listaProductosFactura');
    if (!tbody) return;
    
    if (productosSeleccionados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">➕ Agrega productos usando el formulario de abajo</td></tr>`;
        return;
    }
    
    tbody.innerHTML = productosSeleccionados.map((p, idx) => {
        const totalLinea = p.cantidad * p.precio_unitario;
        return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${escapeHtml(p.concepto)}</td>
                <td style="padding: 12px; text-align: center;">${p.cantidad}</td>
                <td style="padding: 12px; text-align: right;">${formatMoney(p.precio_unitario)} €</td>
                <td style="padding: 12px; text-align: right;">${p.iva}%</td>
                <td style="padding: 12px; text-align: right;">${formatMoney(totalLinea)} €</td>
                <td style="padding: 12px; text-align: center;">
                    <button class="eliminar-producto" data-index="${idx}" style="background: #c2410c; padding: 4px 8px; font-size: 0.7rem;">✖</button>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.querySelectorAll('.eliminar-producto').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            productosSeleccionados.splice(idx, 1);
            actualizarListaProductos();
            actualizarPreviewTotal();
        };
    });
}

function actualizarPreviewTotal() {
    const total = productosSeleccionados.reduce((sum, p) => sum + (p.cantidad * p.precio_unitario), 0);
    const totalSpan = document.getElementById('previewTotalFactura');
    if (totalSpan) totalSpan.textContent = formatMoney(total);
}

function calcularFechaVencimiento() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0];
}

async function generarFactura(modal) {
    const selectCliente = document.getElementById('facturaCliente');
    const clienteId = selectCliente?.value;
    const clienteNombre = selectCliente?.options[selectCliente.selectedIndex]?.dataset?.nombre;
    const clienteNif = selectCliente?.options[selectCliente.selectedIndex]?.dataset?.nif;
    const fechaVencimiento = document.getElementById('facturaVencimiento')?.value;
    
    if (!clienteId) {
        mostrarMensaje('Selecciona un cliente', 'error');
        return;
    }
    
    if (productosSeleccionados.length === 0) {
        mostrarMensaje('Agrega al menos un producto', 'error');
        return;
    }
    
    mostrarModalCarga('Generando factura...');
    
    try {
        // Calcular totales
        let subtotal = 0;
        let ivaTotal = 0;
        
        const lineas = productosSeleccionados.map(p => {
            const subtotalLinea = p.cantidad * p.precio_unitario;
            const ivaLinea = subtotalLinea * (p.iva / 100);
            subtotal += subtotalLinea;
            ivaTotal += ivaLinea;
            return {
                concepto: p.concepto,
                cantidad: p.cantidad,
                precio_unitario: p.precio_unitario,
                iva: p.iva,
                subtotal: subtotalLinea
            };
        });
        
        const importeTotal = subtotal + ivaTotal;
        
        // Generar número de factura
        const { data: ultimaFactura } = await sb
            .from('facturas')
            .select('numero_factura')
            .order('created_at', { ascending: false })
            .limit(1);
        
        let numeroFactura = 'F20260001';
        if (ultimaFactura && ultimaFactura.length > 0) {
            const ultimoNumero = parseInt(ultimaFactura[0].numero_factura.slice(-4));
            numeroFactura = `F2026${String(ultimoNumero + 1).padStart(4, '0')}`;
        }
        
        // Crear factura
        const { data: factura, error: errFactura } = await sb
            .from('facturas')
            .insert({
                empresa_id: clienteId,
                numero_factura: numeroFactura,
                fecha_expedicion: new Date().toISOString(),
                fecha_vencimiento: fechaVencimiento,
                cliente_nif: clienteNif,
                cliente_nombre: clienteNombre,
                subtotal: subtotal,
                iva_total: ivaTotal,
                importe_total: importeTotal,
                estado: 'pendiente'
            })
            .select()
            .single();
        
        if (errFactura) throw errFactura;
        
        // Insertar líneas de factura (si la tabla existe)
        try {
            for (const linea of lineas) {
                await sb.from('lineas_factura').insert({
                    factura_id: factura.id,
                    concepto: linea.concepto,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio_unitario,
                    iva: linea.iva,
                    subtotal: linea.subtotal
                });
            }
        } catch (e) {
            console.warn('Tabla lineas_factura no existe o error:', e);
        }
        
        cerrarModalCarga();
        mostrarMensaje(`✅ Factura ${numeroFactura} generada correctamente`, 'exito');
        
        modal.remove();
        await cargarFacturas();
        renderizarVistaFacturacion();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje(`❌ Error al generar factura: ${error.message}`, 'error');
        console.error(error);
    }
}

// ============================================================
// VER FACTURA
// ============================================================

async function verFactura(facturaId) {
    mostrarModalCarga('Cargando factura...');
    
    try {
        const { data: factura, error } = await sb
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single();
        
        if (error) throw error;
        
        let lineas = [];
        try {
            const { data } = await sb
                .from('lineas_factura')
                .select('*')
                .eq('factura_id', facturaId);
            lineas = data || [];
        } catch (e) {
            console.warn('Tabla lineas_factura no existe');
        }
        
        cerrarModalCarga();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>📄 Factura ${factura.numero_factura}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="datos-factura">
                        <div class="cliente-info">
                            <strong>${escapeHtml(factura.cliente_nombre)}</strong><br>
                            NIF: ${escapeHtml(factura.cliente_nif)}
                        </div>
                        <div class="fechas">
                            <p>Fecha: ${new Date(factura.fecha_expedicion).toLocaleDateString()}</p>
                            <p>Vencimiento: ${new Date(factura.fecha_vencimiento).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <table class="tabla-lineas">
                        <thead>
                            <tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Subtotal</th></tr>
                        </thead>
                        <tbody>
                            ${lineas.map(l => `
                                <tr>
                                    <td>${escapeHtml(l.concepto)}</td>
                                    <td>${l.cantidad}</td>
                                    <td>${formatMoney(l.precio_unitario)} €</td>
                                    <td>${l.iva}%</td>
                                    <td>${formatMoney(l.subtotal)} €</td>
                                </tr>
                            `).join('')}
                            ${lineas.length === 0 ? `
                                <tr><td colspan="5" style="text-align:center;">Sin líneas de detalle</td></tr>
                            ` : ''}
                        </tbody>
                        <tfoot>
                            <tr><td colspan="4" style="text-align:right"><strong>Base imponible:</strong></td><td>${formatMoney(factura.subtotal)} €</td></tr>
                            <tr><td colspan="4" style="text-align:right"><strong>IVA:</strong></td><td>${formatMoney(factura.iva_total)} €</td></tr>
                            <tr><td colspan="4" style="text-align:right"><strong>TOTAL:</strong></td><td><strong>${formatMoney(factura.importe_total)} €</strong></td></tr>
                        </tfoot>
                    </table>
                    
                    <div class="estado-factura">
                        Estado: ${getBadgeEstadoFactura(factura.estado)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        modal.querySelector('.close-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error al cargar factura: ' + error.message, 'error');
    }
}

async function marcarFacturaPagada(facturaId) {
    const { error } = await sb
        .from('facturas')
        .update({ estado: 'pagada', updated_at: new Date().toISOString() })
        .eq('id', facturaId);
    
    if (error) {
        mostrarMensaje('Error al marcar como pagada', 'error');
        return;
    }
    
    mostrarMensaje('✅ Factura marcada como pagada', 'exito');
    await cargarFacturas();
    renderizarVistaFacturacion();
}

function aplicarFiltros() {
    const texto = document.getElementById('filtroFactura')?.value.toLowerCase() || '';
    const estado = document.getElementById('filtroEstadoFactura')?.value || '';
    const clienteNif = document.getElementById('filtroClienteFactura')?.value || '';
    
    facturasFiltradas = facturas.filter(factura => {
        if (texto) {
            const buscaEn = `${factura.numero_factura} ${factura.cliente_nombre} ${factura.cliente_nif}`.toLowerCase();
            if (!buscaEn.includes(texto)) return false;
        }
        if (estado && factura.estado !== estado) return false;
        if (clienteNif && factura.cliente_nif !== clienteNif) return false;
        return true;
    });
    
    paginaActual = 1;
    
    const contentDiv = document.getElementById('facturasContent');
    if (contentDiv) {
        contentDiv.innerHTML = renderizarTablaFacturas();
        // Re-asignar eventos de paginación
        document.querySelectorAll('#facturasContent .paginacion button').forEach(btn => {
            btn.onclick = () => {
                paginaActual = parseInt(btn.dataset.pagina);
                const content = document.getElementById('facturasContent');
                if (content) content.innerHTML = renderizarTablaFacturas();
                setupEventosFacturacion();
            };
        });
    }
}

// ============================================================
// EVENTOS
// ============================================================

function setupEventosFacturacion() {
    const container = document.getElementById('moduloContainer');
    if (!container) return;
    
    const btnNueva = document.getElementById('btnNuevaFactura');
    if (btnNueva) {
        btnNueva.onclick = () => abrirModalNuevaFactura();
    }
    
    const filtroTexto = document.getElementById('filtroFactura');
    const filtroEstado = document.getElementById('filtroEstadoFactura');
    const filtroCliente = document.getElementById('filtroClienteFactura');
    
    if (filtroTexto) filtroTexto.oninput = () => aplicarFiltros();
    if (filtroEstado) filtroEstado.onchange = () => aplicarFiltros();
    if (filtroCliente) filtroCliente.onchange = () => aplicarFiltros();
    
    container.onclick = async (e) => {
        const btn = e.target;
        
        if (btn.classList.contains('ver-factura')) {
            await verFactura(btn.dataset.id);
        }
        
        if (btn.classList.contains('pagar-factura')) {
            await marcarFacturaPagada(btn.dataset.id);
        }
        
        if (btn.classList.contains('pdf-factura')) {
            mostrarMensaje('📄 Generando PDF (próximamente)', 'info');
        }
        
        if (btn.classList.contains('enviar-factura')) {
            mostrarMensaje('📧 Envío por email (próximamente)', 'info');
        }
    };
}

// ============================================================
// EXPORTAR
// ============================================================

export default {
    iniciar
};