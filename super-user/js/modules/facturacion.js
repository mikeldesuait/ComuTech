// js/modules/facturacion.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, generarHashFactura } from './utils.js';

let facturas = [];
let facturasFiltradas = [];
let productosDisponibles = [];
let productosSeleccionados = [];
let facturasSeleccionadas = new Set();

// NIF del emisor (COMUTECH) - CAMBIA ESTO POR TU NIF REAL
const EMISOR_NIF = "B12345678";
const EMISOR_NOMBRE = "COMUTECH S.L.";

export async function iniciar() {
    console.log('💰 Iniciando módulo de facturación');
    await cargarFacturas();
    await cargarProductos();
    renderizarVistaFacturacion();
    setupEventosFacturacion();
}

async function cargarFacturas() {
    try {
        console.log('📡 Cargando facturas...');
        const { data, error } = await sb.from('facturas').select('*').order('fecha_expedicion', { ascending: false });
        if (error) throw error;
        facturas = data || [];
        facturasFiltradas = [...facturas];
        console.log('✅ Facturas cargadas:', facturas.length);
        return true;
    } catch (error) {
        console.error('Error cargando facturas:', error);
        mostrarMensaje('Error cargando facturas: ' + error.message, 'error');
        return false;
    }
}

async function cargarProductos() {
    try {
        const { data, error } = await sb.from('productos').select('*').eq('activo', true).order('nombre_producto');
        if (error) throw error;
        productosDisponibles = data || [];
    } catch (error) {
        console.error('Error cargando productos:', error);
        productosDisponibles = [];
    }
}

async function cargarClientesParaSelect() {
    try {
        const { data, error } = await sb.from('empresas').select('id, nombre_empresa, nif_cif').eq('activo', true).order('nombre_empresa');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error cargando clientes:', error);
        return [];
    }
}

// ============================================================
// CARGAR CLIENTES PARA BUSCADOR PREDICTIVO
// ============================================================

async function cargarClientesDatalist() {
    try {
        const { data: clientes, error } = await sb
            .from('empresas')
            .select('id, nombre_empresa, nif_cif')
            .eq('activo', true)
            .order('nombre_empresa');
        
        if (error) throw error;
        
        const datalist = document.getElementById('clientesList');
        const inputBusqueda = document.getElementById('buscadorClienteFactura');
        const hiddenId = document.getElementById('clienteSeleccionadoId');
        
        if (!datalist) return;
        
        datalist.innerHTML = '';
        clientes.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nombre_empresa;  // Solo el nombre, más simple
            option.dataset.id = c.id;
            datalist.appendChild(option);
        });
        
        if (inputBusqueda) {
            // Al seleccionar una opción
            inputBusqueda.onchange = () => {
                const selected = Array.from(datalist.options).find(opt => opt.value === inputBusqueda.value);
                if (selected && selected.dataset.id) {
                    hiddenId.value = selected.dataset.id;
                    console.log('✅ Cliente seleccionado:', inputBusqueda.value, 'ID:', hiddenId.value);
                } else {
                    // Buscar por coincidencia parcial
                    const match = clientes.find(c => 
                        c.nombre_empresa.toLowerCase().includes(inputBusqueda.value.toLowerCase())
                    );
                    if (match) {
                        hiddenId.value = match.id;
                        console.log('✅ Cliente encontrado por coincidencia:', match.nombre_empresa);
                    } else {
                        hiddenId.value = '';
                    }
                }
                aplicarFiltros();
            };
            
            // Al escribir, si se borra todo, limpiar filtro
            inputBusqueda.oninput = () => {
                if (inputBusqueda.value === '') {
                    hiddenId.value = '';
                    aplicarFiltros();
                }
            };
        }
        
        console.log(`📋 Datalist cargado con ${clientes.length} clientes`);
        
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

async function renderizarVistaFacturacion() {
    console.log('🎨 Renderizando vista...');
    const container = document.getElementById('facturasLista');
    if (!container) {
        console.error('No se encuentra facturasLista');
        return;
    }
    
    try {
        // Cargar clientes para buscador predictivo
        await cargarClientesDatalist();
        
        const html = renderizarListaFacturas();
        container.innerHTML = html;
        setupFiltros();
        setupSeleccionFacturas();
        console.log('✅ Vista renderizada');
    } catch (error) {
        console.error('Error renderizando:', error);
        container.innerHTML = '<div style="text-align:center; padding:40px; color:red;">❌ Error al cargar las facturas</div>';
    }
}

async function cargarClientesEnFiltro() {
    const selectFiltro = document.getElementById('filtroClienteFactura');
    if (!selectFiltro) return;
    
    // Cargar TODOS los clientes activos, no solo los que tienen facturas
    const { data: clientes, error } = await sb
        .from('empresas')
        .select('id, nombre_empresa, nif_cif')
        .eq('activo', true)
        .order('nombre_empresa');
    
    if (error) {
        console.error('Error cargando clientes:', error);
        return;
    }
    
    let options = '<option value="">🌐 Todos los clientes</option>';
    clientes.forEach(c => {
        options += `<option value="${c.id}" data-nif="${escapeHtml(c.nif_cif || '')}" data-nombre="${escapeHtml(c.nombre_empresa)}">${escapeHtml(c.nombre_empresa)} (${escapeHtml(c.nif_cif || 'Sin NIF')})</option>`;
    });
    selectFiltro.innerHTML = options;
}

function renderizarListaFacturas() {
    console.log('📋 Renderizando lista, facturas:', facturasFiltradas.length);
    
    if (!facturasFiltradas || facturasFiltradas.length === 0) {
        return '<div style="text-align:center; padding:60px; color:gray;">📭 No hay facturas que coincidan con los filtros</div>';
    }
    
    let html = `<div class="facturas-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f1f5f9; border-radius: 12px; margin-bottom: 12px;">
        <div>
            <input type="checkbox" id="seleccionarTodas" ${facturasSeleccionadas.size === facturasFiltradas.length && facturasFiltradas.length > 0 ? 'checked' : ''}>
            <label for="seleccionarTodas" style="margin-left: 8px;">Seleccionar todas (${facturasFiltradas.length})</label>
        </div>
        <div>
            ${facturasSeleccionadas.size > 0 ? `<span style="background: #2563eb; color: white; padding: 4px 12px; border-radius: 20px;">${facturasSeleccionadas.size} seleccionada(s)</span>` : ''}
        </div>
    </div>`;
    
    for (const factura of facturasFiltradas) {
        const isSelected = facturasSeleccionadas.has(factura.id);
        const esRectificativa = factura.tipo_rectificativa;
        
        // Badges de estado fiscal
        const badgeRectificativa = esRectificativa ? `<span class="badge" style="background: #fef3c7; color: #92400e;">🔄 ${esRectificativa}</span>` : '';
        const badgeEstadoFiscal = `<span class="badge ${factura.estado === 'pagada' ? 'badge-activo' : (factura.estado === 'parcial' ? 'badge-warning' : 'badge-inactivo')}">
            ${factura.estado === 'pagada' ? '✅ Pagada' : (factura.estado === 'parcial' ? '💰 Pago parcial' : '⏳ Pendiente')}
        </span>`;
        
        // ✅ NUEVO: Badges de estado de cobro
        let badgeEstadoCobro = '';
        if (factura.estado_cobro === 'cobrado') {
            badgeEstadoCobro = `<span class="badge badge-activo" style="background: #d1fae5; color: #065f46;">💵 Cobrado</span>`;
        } else if (factura.estado_cobro === 'parcial') {
            badgeEstadoCobro = `<span class="badge" style="background: #fef3c7; color: #92400e;">💰 Parcial cobrado: ${formatMoney(factura.total_cobrado || 0)}€</span>`;
        } else {
            badgeEstadoCobro = `<span class="badge badge-inactivo">⏳ Pendiente cobro: ${formatMoney(factura.saldo_cobro || factura.importe_total)}€</span>`;
        }
        
        const badgePagoParcial = factura.pagado_parcial ? `<span class="badge" style="background: #fef3c7; color: #92400e;">💰 Pagado parcial (${formatMoney(factura.total_pagado || 0)}€)</span>` : '';
        const badgeSaldoPendiente = (factura.saldo_pendiente > 0 && factura.saldo_pendiente < factura.importe_total) ? `<span class="badge" style="background: #dbeafe; color: #1e40af;">💳 Pendiente: ${formatMoney(factura.saldo_pendiente)}€</span>` : '';
        
        html += `
            <div class="cliente-card" data-id="${factura.id}">
                <div class="cliente-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" class="checkbox-factura" data-id="${factura.id}" ${isSelected ? 'checked' : ''}>
                        <div>
                            <div class="cliente-nombre">${escapeHtml(factura.numero_factura)}</div>
                            <div class="cliente-nif">${escapeHtml(factura.cliente_nombre)}</div>
                        </div>
                    </div>
                    <div class="cliente-actions">
                        <button class="ver-factura action-btn" data-id="${factura.id}" title="Ver">👁️</button>
                        <button class="pdf-factura action-btn" data-id="${factura.id}" title="PDF">📄</button>
                        <button class="xml-factura action-btn" data-id="${factura.id}" title="Exportar XML">📎</button>
                        <!-- Botón de cobro (solo si hay pendiente) -->
                        ${(factura.saldo_cobro > 0 || (factura.saldo_cobro === null && factura.estado_cobro !== 'cobrado')) ? 
                            `<button class="cobro-rapido action-btn" data-id="${factura.id}" title="Registrar cobro" style="color:var(--ios-green);">💵</button>` : ''}
                        ${(factura.estado === 'pendiente' || factura.estado === 'parcial') ? 
                            `<button class="pago-rapido action-btn" data-id="${factura.id}" title="Registrar pago (deprecado)" style="color:var(--ios-blue); display:none;">💰</button>` : ''}
                        ${factura.estado === 'pendiente' && !esRectificativa ? 
                            `<button class="rectificar-factura action-btn" data-id="${factura.id}" title="Rectificar" style="color:var(--ios-orange);">🔄</button>` : ''}
                        ${factura.estado === 'pendiente' ? 
                            `<button class="pagar-factura action-btn" data-id="${factura.id}" title="Pagar total" style="color:var(--ios-green);">✅</button>` : ''}
                    </div>
                </div>
                <div class="cliente-contacto">
                    <span>📅 ${new Date(factura.fecha_expedicion).toLocaleDateString()}</span>
                    <span>⏰ Vence: ${new Date(factura.fecha_vencimiento).toLocaleDateString()}</span>
                </div>
                <div class="cliente-badges">
                    <span class="badge">💰 Base: ${formatMoney(factura.subtotal)}€</span>
                    <span class="badge">🧾 IVA: ${formatMoney(factura.iva_total)}€</span>
                    <span class="badge badge-activo">TOTAL: ${formatMoney(factura.importe_total)}€</span>
                    ${badgeEstadoFiscal}
                    ${badgeRectificativa}
                    ${badgeEstadoCobro}
                    ${badgePagoParcial}
                    ${badgeSaldoPendiente}
                    ${factura.hash_factura ? `<span class="badge badge-activo">🔗 Hash OK</span>` : `<span class="badge badge-inactivo">❌ Sin hash</span>`}
                </div>
            </div>
        `;
    }
    
    return html;
}

function setupFiltros() {
    console.log('🔧 Configurando filtros...');
    
    const filtroTexto = document.getElementById('filtroFactura');
    const filtroEstado = document.getElementById('filtroEstadoFactura');
    const filtroTipo = document.getElementById('filtroTipoFactura');
    const filtroFechaDesde = document.getElementById('filtroFechaDesde');
    const filtroFechaHasta = document.getElementById('filtroFechaHasta');
    const filtroCliente = document.getElementById('filtroClienteFactura');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    
    // Eliminar event listeners antiguos si existen
    const newFiltroTexto = filtroTexto?.cloneNode(true);
    if (newFiltroTexto && filtroTexto) {
        filtroTexto.parentNode.replaceChild(newFiltroTexto, filtroTexto);
        newFiltroTexto.oninput = () => aplicarFiltros();
    }
    
    if (filtroEstado) filtroEstado.onchange = () => aplicarFiltros();
    if (filtroTipo) filtroTipo.onchange = () => aplicarFiltros();
    if (filtroFechaDesde) filtroFechaDesde.onchange = () => aplicarFiltros();
    if (filtroFechaHasta) filtroFechaHasta.onchange = () => aplicarFiltros();
    if (filtroCliente) filtroCliente.onchange = () => aplicarFiltros();
    if (btnLimpiar) btnLimpiar.onclick = limpiarFiltros;
    
    console.log('✅ Filtros configurados');
}

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    
    try {
        const texto = document.getElementById('filtroFactura')?.value.toLowerCase() || '';
        const estado = document.getElementById('filtroEstadoFactura')?.value || '';
        const tipo = document.getElementById('filtroTipoFactura')?.value || '';
        const fechaDesde = document.getElementById('filtroFechaDesde')?.value;
        const fechaHasta = document.getElementById('filtroFechaHasta')?.value;
        const clienteId = document.getElementById('clienteSeleccionadoId')?.value || '';
        
        console.log('Cliente seleccionado ID:', clienteId);
        
        // Siempre filtrar por cliente si hay uno seleccionado
        let facturasBase = facturas;
        if (clienteId) {
            facturasBase = facturas.filter(f => f.empresa_id === clienteId);
            console.log(`Facturas del cliente: ${facturasBase.length}`);
        }
        
        // Aplicar el resto de filtros sobre las facturas base
        facturasFiltradas = facturasBase.filter(factura => {
            // Filtro texto
            if (texto) {
                const buscaEn = `${factura.numero_factura} ${factura.cliente_nombre} ${factura.cliente_nif}`.toLowerCase();
                if (!buscaEn.includes(texto)) return false;
            }
            // Filtro estado
            if (estado && factura.estado !== estado) return false;
            // Filtro tipo
            if (tipo === 'normal' && factura.tipo_rectificativa) return false;
            if (tipo === 'abono' && (!factura.tipo_rectificativa || (factura.tipo_rectificativa !== 'abono' && factura.tipo_rectificativa !== 'abono_parcial'))) return false;
            if (tipo === 'rectificativa' && !factura.tipo_rectificativa) return false;
            // Filtro fecha desde
            if (fechaDesde) {
                const fechaFactura = new Date(factura.fecha_expedicion).toISOString().split('T')[0];
                if (fechaFactura < fechaDesde) return false;
            }
            // Filtro fecha hasta
            if (fechaHasta) {
                const fechaFactura = new Date(factura.fecha_expedicion).toISOString().split('T')[0];
                if (fechaFactura > fechaHasta) return false;
            }
            return true;
        });
        
        console.log(`Facturas después de filtros: ${facturasFiltradas.length}`);
        renderizarVistaFacturacion();
        
    } catch (error) {
        console.error('Error en aplicarFiltros:', error);
    }
}

function limpiarFiltros() {
    const inputs = ['filtroFactura', 'filtroFechaDesde', 'filtroFechaHasta'];
    const selects = ['filtroEstadoFactura', 'filtroTipoFactura'];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // ✅ Limpiar también el buscador de cliente
    const buscadorCliente = document.getElementById('buscadorClienteFactura');
    const hiddenCliente = document.getElementById('clienteSeleccionadoId');
    if (buscadorCliente) buscadorCliente.value = '';
    if (hiddenCliente) hiddenCliente.value = '';
    
    aplicarFiltros();
}

function setupSeleccionFacturas() {
    const seleccionarTodas = document.getElementById('seleccionarTodas');
    if (seleccionarTodas) {
        seleccionarTodas.onclick = (e) => {
            const checkboxes = document.querySelectorAll('.checkbox-factura');
            if (e.target.checked) {
                facturasSeleccionadas.clear();
                facturasFiltradas.forEach(f => facturasSeleccionadas.add(f.id));
                checkboxes.forEach(cb => cb.checked = true);
            } else {
                facturasSeleccionadas.clear();
                checkboxes.forEach(cb => cb.checked = false);
            }
            renderizarVistaFacturacion();
        };
    }
    
    const container = document.getElementById('facturasLista');
    if (container) {
        container.onchange = (e) => {
            if (e.target.classList.contains('checkbox-factura')) {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    facturasSeleccionadas.add(id);
                } else {
                    facturasSeleccionadas.delete(id);
                }
                renderizarVistaFacturacion();
            }
        };
    }
}

async function exportarFacturasSeleccionadas() {
    if (facturasSeleccionadas.size === 0) {
        mostrarMensaje('Selecciona al menos una factura para exportar', 'error');
        return;
    }
    
    mostrarModalCarga('Generando PDF...');
    
    try {
        const facturasArray = Array.from(facturasSeleccionadas);
        const facturasData = facturas.filter(f => facturasArray.includes(f.id));
        
        // Ordenar por número de factura
        facturasData.sort((a, b) => a.numero_factura.localeCompare(b.numero_factura));
        
        // Crear HTML para el PDF
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Facturas ${new Date().toLocaleDateString()}</title>
            <style>
                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    padding: 40px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #1f2937;
                }
                h1 {
                    color: #1e3a8a;
                    font-size: 24px;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .fecha {
                    text-align: center;
                    color: #6b7280;
                    font-size: 10px;
                    margin-bottom: 30px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 15px;
                }
                .resumen {
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-around;
                    text-align: center;
                }
                .resumen-item {
                    text-align: center;
                }
                .resumen-label {
                    font-size: 10px;
                    color: #6b7280;
                }
                .resumen-valor {
                    font-size: 18px;
                    font-weight: bold;
                    color: #1e3a8a;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th {
                    background: #f1f5f9;
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #e2e8f0;
                }
                td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .factura-item {
                    page-break-inside: avoid;
                    margin-bottom: 30px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 15px;
                }
                .factura-header {
                    background: #f8fafc;
                    padding: 10px;
                    margin: -15px -15px 15px -15px;
                    border-radius: 8px 8px 0 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .factura-titulo {
                    font-size: 14px;
                    font-weight: bold;
                    color: #1e3a8a;
                }
                .factura-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    font-size: 11px;
                }
                .lineas {
                    width: 100%;
                    margin-bottom: 15px;
                }
                .lineas th {
                    font-size: 10px;
                    background: #f1f5f9;
                }
                .totales {
                    text-align: right;
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #e5e7eb;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 9px;
                    color: #9ca3af;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
                @media print {
                    body { padding: 20px; }
                    .page-break { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <h1>📄 RELACIÓN DE FACTURAS</h1>
            <div class="fecha">Generado el ${new Date().toLocaleString()}</div>
            
            <div class="resumen">
                <div class="resumen-item">
                    <div class="resumen-label">Total facturas</div>
                    <div class="resumen-valor">${facturasData.length}</div>
                </div>
                <div class="resumen-item">
                    <div class="resumen-label">Importe total</div>
                    <div class="resumen-valor">${formatMoney(facturasData.reduce((sum, f) => sum + f.importe_total, 0))}€</div>
                </div>
                <div class="resumen-item">
                    <div class="resumen-label">Pendiente de cobro</div>
                    <div class="resumen-valor">${formatMoney(facturasData.reduce((sum, f) => sum + (f.saldo_cobro || f.importe_total - (f.total_cobrado || 0)), 0))}€</div>
                </div>
            </div>
        `;
        
        // Generar cada factura individualmente
        for (const factura of facturasData) {
            const { data: lineas } = await sb.from('lineas_factura').select('*').eq('factura_id', factura.id);
            const cobrado = factura.total_cobrado || 0;
            const pendiente = factura.saldo_cobro || (factura.importe_total - cobrado);
            
            html += `
                <div class="factura-item">
                    <div class="factura-header">
                        <div class="factura-titulo">${escapeHtml(factura.numero_factura)}</div>
                    </div>
                    <div class="factura-info">
                        <div>
                            <strong>Cliente:</strong> ${escapeHtml(factura.cliente_nombre)}<br>
                            <strong>NIF:</strong> ${escapeHtml(factura.cliente_nif || '-')}
                        </div>
                        <div style="text-align: right;">
                            <strong>Fecha:</strong> ${new Date(factura.fecha_expedicion).toLocaleDateString()}<br>
                            <strong>Vencimiento:</strong> ${new Date(factura.fecha_vencimiento).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <table class="lineas">
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th style="width: 80px; text-align: center;">Cantidad</th>
                                <th style="width: 100px; text-align: right;">Precio</th>
                                <th style="width: 80px; text-align: center;">IVA</th>
                                <th style="width: 100px; text-align: right;">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineas?.map(l => `
                                <tr>
                                    <td>${escapeHtml(l.concepto)}</td>
                                    <td style="text-align: center;">${l.cantidad}</td>
                                    <td style="text-align: right;">${formatMoney(l.precio_unitario)}€</td>
                                    <td style="text-align: center;">${l.iva}%</td>
                                    <td style="text-align: right;">${formatMoney(l.subtotal)}€</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5">Sin líneas</td></tr>'}
                        </tbody>
                    </table>
                    
                    <div class="totales">
                        <div><strong>Subtotal:</strong> ${formatMoney(factura.subtotal)}€</div>
                        <div><strong>IVA:</strong> ${formatMoney(factura.iva_total)}€</div>
                        <div style="font-size: 14px;"><strong>TOTAL:</strong> ${formatMoney(factura.importe_total)}€</div>
                        <div style="color: #2563eb;"><strong>Pagado:</strong> ${formatMoney(cobrado)}€</div>
                        <div style="color: ${pendiente > 0 ? '#c2410c' : '#166534'};"><strong>Pendiente:</strong> ${formatMoney(pendiente)}€</div>
                    </div>
                    
                    ${factura.hash_factura ? `<div style="font-size: 9px; color: #6b7280; margin-top: 10px;">🔗 Hash: ${factura.hash_factura.substring(0, 20)}...</div>` : ''}
                </div>
            `;
        }
        
        html += `
            <div class="footer">
                <p>Documento generado electrónicamente con validez informativa</p>
                <p>© COMUTECH - Todos los derechos reservados</p>
            </div>
        </body>
        </html>
        `;
        
        // Crear un iframe invisible para generar el PDF
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
        
        iframe.contentWindow.print();
        
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
        
        cerrarModalCarga();
        mostrarMensaje(`✅ ${facturasSeleccionadas.size} factura(s) exportadas a PDF`, 'exito');
        
        facturasSeleccionadas.clear();
        renderizarVistaFacturacion();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

function abrirModalNuevaFactura() {
    cargarProductos().then(() => {
        cargarClientesParaSelect().then(clientes => {
            productosSeleccionados = [];
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            let productosOpciones = '<option value="">-- Seleccionar --</option>';
            productosDisponibles.forEach(p => {
                productosOpciones += `<option value="${p.id}" data-precio="${p.precio_unitario}" data-iva="${p.iva_aplicable || 21}">${escapeHtml(p.nombre_producto)} - ${formatMoney(p.precio_unitario)}€</option>`;
            });
            let clientesOpciones = '<option value="">-- Seleccionar cliente --</option>';
            clientes.forEach(c => {
                clientesOpciones += `<option value="${c.id}" data-nombre="${escapeHtml(c.nombre_empresa)}" data-nif="${escapeHtml(c.nif_cif || '')}">${escapeHtml(c.nombre_empresa)} (${escapeHtml(c.nif_cif || 'Sin NIF')})</option>`;
            });
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">💰 Nueva Factura</div>
                    <div class="grupo"><label>Cliente *</label><select id="facturaCliente">${clientesOpciones}</select></div>
                    <div class="grupo"><label>Vencimiento</label><input type="date" id="facturaVencimiento" value="${calcularFechaVencimiento()}"></div>
                    <div class="grupo"><label>Productos</label><div id="listaProductosFactura" style="margin:8px 0;"></div><div style="display:flex; gap:8px;"><select id="selectProductoFactura" style="flex:1;">${productosOpciones}</select><input type="number" id="cantidadProductoFactura" value="1" style="width:70px;"><button id="btnAgregarProductoFactura" class="btn-sm">➕</button></div></div>
                    <div><strong>Total: <span id="previewTotalFactura">0,00</span> €</strong></div>
                    <div class="btn-group"><button id="btnGenerarFacturaNueva" class="btn-success">Generar</button><button id="btnCancelarFacturaNueva" class="btn-danger">Cancelar</button></div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('btnCancelarFacturaNueva').onclick = () => modal.remove();
            document.getElementById('btnAgregarProductoFactura').onclick = () => agregarProductoFactura();
            document.getElementById('btnGenerarFacturaNueva').onclick = () => {
                const datosTemp = {
                    clienteId: document.getElementById('facturaCliente').value,
                    clienteNombre: document.getElementById('facturaCliente').options[document.getElementById('facturaCliente').selectedIndex]?.dataset?.nombre,
                    clienteNif: document.getElementById('facturaCliente').options[document.getElementById('facturaCliente').selectedIndex]?.dataset?.nif,
                    fechaVencimiento: document.getElementById('facturaVencimiento').value
                };
                modal.remove();
                abrirModalConfirmacionFactura(datosTemp);
            };
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        });
    });
}

function agregarProductoFactura() {
    const select = document.getElementById('selectProductoFactura');
    const productoId = select.value;
    const cantidad = parseInt(document.getElementById('cantidadProductoFactura')?.value || 1);
    if (!productoId) return mostrarMensaje('Selecciona un producto', 'error');
    const producto = productosDisponibles.find(p => p.id === productoId);
    if (producto) {
        productosSeleccionados.push({ concepto: producto.nombre_producto, cantidad, precio_unitario: producto.precio_unitario, iva: producto.iva_aplicable || 21 });
        actualizarListaProductos();
        actualizarPreviewTotal();
        select.value = '';
        document.getElementById('cantidadProductoFactura').value = '1';
    }
}

function actualizarListaProductos() {
    const container = document.getElementById('listaProductosFactura');
    if (!container) return;
    if (!productosSeleccionados.length) { container.innerHTML = '<p>No hay productos</p>'; return; }
    let html = '';
    productosSeleccionados.forEach((p, idx) => {
        html += `<div style="display:flex; justify-content:space-between; margin:4px 0;"><span>${escapeHtml(p.concepto)} x${p.cantidad} = ${formatMoney(p.cantidad * p.precio_unitario)}€</span><button class="eliminar-producto" data-index="${idx}" style="background:red; border:none; color:white; border-radius:20px; padding:2px 8px;">✖</button></div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.eliminar-producto').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            productosSeleccionados.splice(idx, 1);
            actualizarListaProductos();
            actualizarPreviewTotal();
        };
    });
}

function actualizarPreviewTotal() {
    let total = 0;
    productosSeleccionados.forEach(p => { total += p.cantidad * p.precio_unitario; });
    document.getElementById('previewTotalFactura').textContent = formatMoney(total);
}

function calcularFechaVencimiento() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0];
}

async function abrirModalConfirmacionFactura(datosTemp) {
    const modalConfirm = document.getElementById('modalConfirmarFactura');
    if (!modalConfirm) {
        console.error('Modal de confirmación no encontrado');
        await ejecutarGeneracionFactura(datosTemp);
        return;
    }
    
    const passwordInput = document.getElementById('passwordConfirmacionFactura');
    const errorDiv = document.getElementById('errorPasswordFactura');
    const btnConfirmar = document.getElementById('btnConfirmarEmision');
    const btnCancelar = document.getElementById('btnCancelarEmision');
    
    if (passwordInput) passwordInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    
    const nuevoBtnCancelar = btnCancelar.cloneNode(true);
    btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar);
    nuevoBtnCancelar.onclick = () => {
        modalConfirm.style.display = 'none';
        mostrarMensaje('Emisión de factura cancelada', 'info');
    };
    
    const nuevoBtnConfirmar = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar);
    nuevoBtnConfirmar.onclick = async () => {
        const password = passwordInput?.value || '';
        
        if (!password) {
            if (errorDiv) {
                errorDiv.innerText = '❌ Introduce tu contraseña para confirmar';
                errorDiv.style.display = 'block';
            }
            return;
        }
        
        mostrarModalCarga('Verificando credenciales...');
        
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');
            
            const { error: authError } = await sb.auth.signInWithPassword({
                email: user.email,
                password: password
            });
            
            if (authError) throw new Error('Contraseña incorrecta');
            
            cerrarModalCarga();
            modalConfirm.style.display = 'none';
            await ejecutarGeneracionFactura(datosTemp);
            
        } catch (error) {
            cerrarModalCarga();
            if (errorDiv) {
                errorDiv.innerText = '❌ ' + error.message;
                errorDiv.style.display = 'block';
            }
        }
    };
    
    modalConfirm.style.display = 'flex';
    modalConfirm.onclick = (e) => {
        if (e.target === modalConfirm) {
            modalConfirm.style.display = 'none';
            mostrarMensaje('Emisión de factura cancelada', 'info');
        }
    };
}

async function ejecutarGeneracionFactura(datosTemp) {
    const { clienteId, clienteNombre, clienteNif, fechaVencimiento } = datosTemp;
    
    if (!clienteId || !productosSeleccionados.length) {
        mostrarMensaje('Completa los datos', 'error');
        return;
    }
    
    mostrarModalCarga('Generando factura...');
    
    try {
        let subtotal = 0, ivaTotal = 0;
        productosSeleccionados.forEach(p => { 
            const base = p.cantidad * p.precio_unitario; 
            subtotal += base; 
            ivaTotal += base * (p.iva / 100); 
        });
        const importeTotal = subtotal + ivaTotal;
        const fechaExpedicion = new Date().toISOString();
        
        const { data: ultimaFactura } = await sb.from('facturas')
            .select('numero_factura')
            .order('created_at', { ascending: false })
            .limit(1);
        
        let numeroFactura = 'F20260001';
        if (ultimaFactura && ultimaFactura.length) { 
            const ultimoNumero = parseInt(ultimaFactura[0].numero_factura.slice(-4)); 
            numeroFactura = `F2026${String(ultimoNumero + 1).padStart(4, '0')}`; 
        }
        
        const { data: ultimaFacturaCliente } = await sb.from('facturas')
            .select('hash_factura')
            .eq('empresa_id', clienteId)
            .order('fecha_expedicion', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        const hashAnterior = ultimaFacturaCliente?.hash_factura || '0'.repeat(64);
        
        const datosHash = {
            numero_factura: numeroFactura,
            fecha_expedicion: fechaExpedicion,
            importe_total: importeTotal,
            emisor_nif: EMISOR_NIF,
            cliente_nif: clienteNif,
            hash_anterior: hashAnterior
        };
        
        const hashActual = await generarHashFactura(datosHash);
        
        const { data: factura, error } = await sb.from('facturas').insert({ 
            empresa_id: clienteId, 
            numero_factura: numeroFactura, 
            fecha_expedicion: fechaExpedicion, 
            fecha_vencimiento: fechaVencimiento, 
            cliente_nif: clienteNif, 
            cliente_nombre: clienteNombre, 
            subtotal, 
            iva_total: ivaTotal, 
            importe_total: importeTotal, 
            estado: 'pendiente',
            hash_factura: hashActual,
            hash_factura_anterior: hashAnterior,
            es_migrada: false,
            es_emisora_propia: true,
            firmada_con_password: true,
            fecha_firma: new Date().toISOString()
        }).select().single();
        
        if (error) throw error;
        
        for (const linea of productosSeleccionados) {
            await sb.from('lineas_factura').insert({ 
                factura_id: factura.id, 
                concepto: linea.concepto, 
                cantidad: linea.cantidad, 
                precio_unitario: linea.precio_unitario, 
                iva: linea.iva, 
                subtotal: linea.cantidad * linea.precio_unitario 
            });
        }
        
        cerrarModalCarga();
        mostrarMensaje(`✅ Factura ${numeroFactura} generada y firmada`, 'exito');
        
        productosSeleccionados = [];
        await cargarFacturas();
        renderizarVistaFacturacion();
        
    } catch (error) { 
        cerrarModalCarga(); 
        mostrarMensaje(`❌ Error: ${error.message}`, 'error'); 
        console.error(error);
    }
}

async function verFactura(id) {
    mostrarModalCarga('Cargando...');
    try {
        const { data: factura } = await sb.from('facturas').select('*').eq('id', id).single();
        const { data: lineas } = await sb.from('lineas_factura').select('*').eq('factura_id', id);
        cerrarModalCarga();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        let lineasHtml = '';
        if (lineas && lineas.length) {
            lineas.forEach(l => { 
                lineasHtml += `<div>${escapeHtml(l.concepto)} x${l.cantidad} = ${formatMoney(l.subtotal)}€</div>`; 
            });
        } else {
            lineasHtml = 'Sin líneas';
        }
        
        const esRectificativa = factura.tipo_rectificativa;
        const badgeRectificativa = esRectificativa ? `<div style="margin-bottom:12px; padding:8px; background:#fef3c7; border-left:4px solid #f59e0b;">
            <strong>🔄 Factura ${esRectificativa === 'abono' ? 'de abono' : esRectificativa === 'abono_parcial' ? 'de abono parcial' : 'sustitutiva'}</strong><br>
            <small>Motivo: ${escapeHtml(factura.motivo_rectificativa || 'No especificado')}</small>
        </div>` : '';
        
        const infoPagos = (factura.total_pagado > 0) ? `
            <div style="margin-top:12px; padding:8px; background:#dbeafe; border-radius:8px;">
                <small><strong>💰 Estado de pagos:</strong></small><br>
                <small>Total factura: ${formatMoney(factura.importe_total)}€</small><br>
                <small>Pagado: ${formatMoney(factura.total_pagado || 0)}€</small><br>
                <small>Pendiente: ${formatMoney(factura.saldo_pendiente || factura.importe_total)}€</small>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">📄 Factura ${factura.numero_factura}</div>
                ${badgeRectificativa}
                <p>
                    <strong>Cliente:</strong> ${escapeHtml(factura.cliente_nombre)}<br>
                    <strong>NIF:</strong> ${escapeHtml(factura.cliente_nif)}<br>
                    <strong>Fecha:</strong> ${new Date(factura.fecha_expedicion).toLocaleDateString()}<br>
                    <strong>Vence:</strong> ${new Date(factura.fecha_vencimiento).toLocaleDateString()}
                </p>
                <div style="background:var(--ios-bg); padding:12px; border-radius:12px;">${lineasHtml}</div>
                <div class="cliente-badges" style="margin-top:12px;">
                    <span class="badge">Base: ${formatMoney(factura.subtotal)}€</span>
                    <span class="badge">IVA: ${formatMoney(factura.iva_total)}€</span>
                    <span class="badge badge-activo">Total: ${formatMoney(factura.importe_total)}€</span>
                    <span class="badge ${factura.estado === 'pagada' ? 'badge-activo' : (factura.estado === 'parcial' ? 'badge-warning' : 'badge-inactivo')}">
                        ${factura.estado === 'pagada' ? '✅ Pagada' : (factura.estado === 'parcial' ? '💰 Pago parcial' : '⏳ Pendiente')}
                    </span>
                </div>
                ${infoPagos}
                ${factura.hash_factura ? `
                <div style="margin-top:12px; padding:8px; background:#f0fdf4; border-radius:8px;">
                    <small><strong>🔗 Datos Verifactu:</strong></small><br>
                    <small>Hash: ${factura.hash_factura.substring(0, 20)}...</small>
                </div>
                ` : ''}
                <div class="btn-group" style="margin-top: 16px;">
                    ${factura.estado !== 'pagada' ? `<button id="registrarPagoBtn" class="btn-info" style="margin-right: 8px;">💰 Registrar pago</button>` : ''}
                    ${factura.estado === 'pendiente' && !esRectificativa ? `<button id="rectificarFacturaBtn" class="btn-warning">🔄 Rectificar</button>` : ''}
                    <button id="cerrarFacturaModal" class="btn-primary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        if (document.getElementById('registrarPagoBtn')) {
            document.getElementById('registrarPagoBtn').onclick = async () => {
                modal.remove();
                await abrirModalRegistrarPago(factura.id);
            };
        }
        
        if (document.getElementById('rectificarFacturaBtn')) {
            document.getElementById('rectificarFacturaBtn').onclick = async () => {
                modal.remove();
                await abrirModalRectificativa(factura);
            };
        }
        
        document.getElementById('cerrarFacturaModal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
    } catch (e) { 
        cerrarModalCarga(); 
        mostrarMensaje('Error', 'error'); 
    }
}

async function marcarFacturaPagada(id) {
    mostrarModalCarga('Actualizando...');
    try {
        await sb.from('facturas').update({ estado: 'pagada', updated_at: new Date().toISOString() }).eq('id', id);
        cerrarModalCarga();
        mostrarMensaje('✅ Factura pagada', 'exito');
        await cargarFacturas();
        renderizarVistaFacturacion();
    } catch (e) { 
        cerrarModalCarga(); 
        mostrarMensaje('Error', 'error'); 
    }
}

function exportarXMLFactura(factura) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Facturae>
    <Cabecera>
        <Version>3.2</Version>
    </Cabecera>
    <Factura>
        <NumeroFactura>${factura.numero_factura}</NumeroFactura>
        <FechaExpedicion>${factura.fecha_expedicion}</FechaExpedicion>
        <ImporteTotal>${factura.importe_total}</ImporteTotal>
        <HashFactura>${factura.hash_factura || ''}</HashFactura>
        <HashFacturaAnterior>${factura.hash_factura_anterior || '0'.repeat(64)}</HashFacturaAnterior>
        <NIFEmisor>${EMISOR_NIF}</NIFEmisor>
        <NIFCliente>${factura.cliente_nif || ''}</NIFCliente>
    </Factura>
</Facturae>`;
    
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${factura.numero_factura}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarMensaje('✅ XML exportado', 'exito');
}

// ============================================================
// REGISTRO DE PAGOS PARCIALES
// ============================================================

async function abrirModalRegistrarPago(facturaId) {
    // Obtener factura actual
    const { data: factura, error } = await sb.from('facturas').select('*').eq('id', facturaId).single();
    if (error) {
        mostrarMensaje('Error al obtener la factura', 'error');
        return;
    }
    
    const saldoPendiente = factura.saldo_pendiente !== null ? factura.saldo_pendiente : factura.importe_total;
    const totalPagado = factura.total_pagado || 0;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">💰 Registrar pago</div>
            <div class="alert-info" style="margin-bottom: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small><strong>Factura:</strong> ${escapeHtml(factura.numero_factura)}</small><br>
                <small><strong>Total:</strong> ${formatMoney(factura.importe_total)}€</small><br>
                <small><strong>Pagado:</strong> ${formatMoney(totalPagado)}€</small><br>
                <small><strong style="color: #2563eb;">Saldo pendiente: ${formatMoney(saldoPendiente)}€</strong></small>
            </div>
            <div class="grupo">
                <label>💰 Importe del pago (€)</label>
                <input type="number" id="importePago" step="0.01" max="${saldoPendiente}" placeholder="0.00" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
            </div>
            <div class="row-flex">
                <div class="grupo">
                    <label>📅 Fecha del pago</label>
                    <input type="date" id="fechaPago" value="${new Date().toISOString().split('T')[0]}" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
                </div>
                <div class="grupo">
                    <label>💳 Forma de pago</label>
                    <select id="formaPago" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
                        <option value="transferencia">Transferencia bancaria</option>
                        <option value="tarjeta">Tarjeta de crédito/débito</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="bizum">Bizum</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
            </div>
            <div class="btn-group" style="margin-top: 20px;">
                <button id="btnConfirmarPago" class="btn-success">✅ Registrar pago</button>
                <button id="btnCancelarPago" class="btn-danger">❌ Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#btnConfirmarPago').onclick = async () => {
        const importePago = parseFloat(modal.querySelector('#importePago').value);
        const fechaPago = modal.querySelector('#fechaPago').value;
        const formaPago = modal.querySelector('#formaPago').value;
        
        if (!importePago || importePago <= 0) {
            mostrarMensaje('Introduce un importe válido', 'error');
            return;
        }
        
        if (importePago > saldoPendiente) {
            mostrarMensaje(`El importe no puede superar el saldo pendiente (${formatMoney(saldoPendiente)}€)`, 'error');
            return;
        }
        
        mostrarModalCarga('Registrando pago...');
        
        try {
            const nuevoTotalPagado = totalPagado + importePago;
            const nuevoSaldo = factura.importe_total - nuevoTotalPagado;
            const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'parcial';
            
            // Actualizar factura
            const { error: updateError } = await sb.from('facturas').update({
                total_pagado: nuevoTotalPagado,
                saldo_pendiente: nuevoSaldo,
                pagado_parcial: nuevoSaldo > 0,
                estado: nuevoEstado
            }).eq('id', facturaId);
            
            if (updateError) throw updateError;
            
            // Registrar el pago en tabla historial_pagos (crear si no existe)
            try {
                await sb.from('historial_pagos').insert({
                    factura_id: facturaId,
                    importe: importePago,
                    fecha_pago: fechaPago,
                    forma_pago: formaPago
                });
            } catch (e) {
                console.log('Tabla historial_pagos no existe, omitiendo registro');
            }
            
            cerrarModalCarga();
            mostrarMensaje(`✅ Pago de ${formatMoney(importePago)}€ registrado`, 'exito');
            modal.remove();
            
            // Recargar datos
            await cargarFacturas();
            renderizarVistaFacturacion();
            
        } catch (error) {
            cerrarModalCarga();
            mostrarMensaje('Error: ' + error.message, 'error');
        }
    };
    
    modal.querySelector('#btnCancelarPago').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function abrirModalRectificativa(facturaOriginal) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">🔄 Rectificar Factura ${facturaOriginal.numero_factura}</div>
            <div class="grupo">
                <label>Tipo de rectificativa</label>
                <select id="tipoRectificativa">
                    <option value="abono">💰 Abono total (cancelar factura)</option>
                    <option value="abono_parcial">📉 Abono parcial (devolver parte)</option>
                    <option value="sustitutiva">📝 Sustitutiva (corregir y reemplazar)</option>
                </select>
            </div>
            <div id="porcentajeDiv" style="display: none;">
                <div class="grupo">
                    <label>Porcentaje a abonar (%)</label>
                    <input type="number" id="porcentajeAbono" value="100" min="1" max="100">
                </div>
            </div>
            <div class="grupo">
                <label>Motivo de la rectificación</label>
                <textarea id="motivoRectificativa" rows="3" placeholder="Ej: Error en el importe, Producto no entregado, etc."></textarea>
            </div>
            <div class="btn-group">
                <button id="confirmarRectificativa" class="btn-success">✅ Generar rectificativa</button>
                <button id="cancelarRectificativa" class="btn-danger">❌ Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const tipoSelect = modal.querySelector('#tipoRectificativa');
    const porcentajeDiv = modal.querySelector('#porcentajeDiv');
    
    tipoSelect.onchange = () => {
        porcentajeDiv.style.display = tipoSelect.value === 'abono_parcial' ? 'block' : 'none';
    };
    
    modal.querySelector('#confirmarRectificativa').onclick = async () => {
        const tipo = tipoSelect.value;
        const motivo = modal.querySelector('#motivoRectificativa').value.trim();
        const porcentaje = parseInt(modal.querySelector('#porcentajeAbono')?.value || 100);
        
        if (!motivo) {
            mostrarMensaje('Debes indicar el motivo de la rectificación', 'error');
            return;
        }
        
        mostrarModalCarga('Generando factura rectificativa...');
        
        try {
            await generarFacturaRectificativa(facturaOriginal, tipo, motivo, porcentaje);
            cerrarModalCarga();
            modal.remove();
            await cargarFacturas();
            renderizarVistaFacturacion();
        } catch (error) {
            cerrarModalCarga();
            mostrarMensaje('Error: ' + error.message, 'error');
        }
    };
    
    modal.querySelector('#cancelarRectificativa').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function generarFacturaRectificativa(facturaOriginal, tipo, motivo, porcentaje = 100, lineasEditadas = null) {
    let lineasBase = lineasEditadas;
    if (!lineasBase) {
        const { data: lineas } = await sb.from('lineas_factura')
            .select('*')
            .eq('factura_id', facturaOriginal.id);
        lineasBase = lineas || [];
    }
    
    let subtotalRectificativo = 0;
    let ivaRectificativo = 0;
    let lineasRectificativas = [];
    
    if (tipo === 'abono') {
        for (const linea of lineasBase) {
            const subtotalLinea = -(linea.cantidad * linea.precio_unitario);
            const ivaLinea = subtotalLinea * (linea.iva / 100);
            subtotalRectificativo += subtotalLinea;
            ivaRectificativo += ivaLinea;
            lineasRectificativas.push({
                concepto: `ABONO: ${linea.concepto}`,
                cantidad: -linea.cantidad,
                precio_unitario: linea.precio_unitario,
                iva: linea.iva,
                subtotal: subtotalLinea
            });
        }
    } else if (tipo === 'abono_parcial') {
        const factor = porcentaje / 100;
        for (const linea of lineasBase) {
            const subtotalLinea = -(linea.cantidad * linea.precio_unitario * factor);
            const ivaLinea = subtotalLinea * (linea.iva / 100);
            subtotalRectificativo += subtotalLinea;
            ivaRectificativo += ivaLinea;
            lineasRectificativas.push({
                concepto: `ABONO PARCIAL (${porcentaje}%): ${linea.concepto}`,
                cantidad: -(linea.cantidad * factor),
                precio_unitario: linea.precio_unitario,
                iva: linea.iva,
                subtotal: subtotalLinea
            });
        }
    } else if (tipo === 'sustitutiva') {
        for (const linea of lineasBase) {
            const subtotalLinea = linea.cantidad * linea.precio_unitario;
            const ivaLinea = subtotalLinea * (linea.iva / 100);
            subtotalRectificativo += subtotalLinea;
            ivaRectificativo += ivaLinea;
            lineasRectificativas.push({
                concepto: linea.concepto,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio_unitario,
                iva: linea.iva,
                subtotal: subtotalLinea
            });
        }
    }
    
    const importeRectificativo = subtotalRectificativo + ivaRectificativo;
    
    const { data: ultimaFactura } = await sb.from('facturas')
        .select('numero_factura')
        .order('created_at', { ascending: false })
        .limit(1);
    
    let numeroFactura = 'F20260001';
    if (ultimaFactura && ultimaFactura.length) {
        const ultimoNumero = parseInt(ultimaFactura[0].numero_factura.slice(-4));
        numeroFactura = `F2026${String(ultimoNumero + 1).padStart(4, '0')}`;
    }
    
    const { data: ultimaFacturaCliente } = await sb.from('facturas')
        .select('hash_factura')
        .eq('empresa_id', facturaOriginal.empresa_id)
        .order('fecha_expedicion', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    const hashAnterior = ultimaFacturaCliente?.hash_factura || '0'.repeat(64);
    const fechaExpedicion = new Date().toISOString();
    
    const datosHash = {
        numero_factura: numeroFactura,
        fecha_expedicion: fechaExpedicion,
        importe_total: importeRectificativo,
        emisor_nif: EMISOR_NIF,
        cliente_nif: facturaOriginal.cliente_nif,
        hash_anterior: hashAnterior
    };
    const hashActual = await generarHashFactura(datosHash);
    
    const { data: facturaRectificativa, error } = await sb.from('facturas').insert({
        empresa_id: facturaOriginal.empresa_id,
        numero_factura: numeroFactura,
        fecha_expedicion: fechaExpedicion,
        fecha_vencimiento: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        cliente_nif: facturaOriginal.cliente_nif,
        cliente_nombre: facturaOriginal.cliente_nombre,
        subtotal: subtotalRectificativo,
        iva_total: ivaRectificativo,
        importe_total: importeRectificativo,
        estado: 'pendiente',
        hash_factura: hashActual,
        hash_factura_anterior: hashAnterior,
        factura_original_id: facturaOriginal.id,
        tipo_rectificativa: tipo,
        motivo_rectificativa: motivo,
        porcentaje_rectificativa: tipo === 'abono_parcial' ? porcentaje : 100
    }).select().single();
    
    if (error) throw error;
    
    for (const linea of lineasRectificativas) {
        await sb.from('lineas_factura').insert({
            factura_id: facturaRectificativa.id,
            concepto: linea.concepto,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
            iva: linea.iva,
            subtotal: linea.subtotal
        });
    }
    
    await sb.from('facturas').update({ 
        estado: 'rectificada',
        motivo_rectificativa: motivo
    }).eq('id', facturaOriginal.id);
    
    mostrarMensaje(`✅ Factura rectificativa ${numeroFactura} generada`, 'exito');
    return facturaRectificativa;
}

function setupEventosFacturacion() {
    const btnNueva = document.getElementById('btnNuevaFactura');
    if (btnNueva) btnNueva.onclick = abrirModalNuevaFactura;
    
    const btnExportar = document.getElementById('btnExportarSeleccionadas');
    if (btnExportar) btnExportar.onclick = exportarFacturasSeleccionadas;
    
    const container = document.getElementById('facturasLista');
    if (!container) return;
    
    container.onclick = async (e) => {
        const btn = e.target;
        
        if (btn.classList.contains('ver-factura')) {
            await verFactura(btn.dataset.id);
        }
        
        if (btn.classList.contains('pagar-factura')) {
            await marcarFacturaPagada(btn.dataset.id);
        }
        
        // ✅ NUEVO: Evento para cobro rápido
        if (btn.classList.contains('cobro-rapido')) {
            await abrirModalRegistrarCobro(btn.dataset.id);
        }
        
        if (btn.classList.contains('pago-rapido')) {
            await abrirModalRegistrarPago(btn.dataset.id);
        }
        
        if (btn.classList.contains('pdf-factura')) {
            const { generarYMostrarFactura } = await import('./contrato.js');
            await generarYMostrarFactura(btn.dataset.id);
        }
        
        if (btn.classList.contains('rectificar-factura')) {
            const factura = facturas.find(f => f.id === btn.dataset.id);
            if (factura) {
                await abrirModalRectificativa(factura);
            }
        }
        
        if (btn.classList.contains('xml-factura')) {
            const factura = facturas.find(f => f.id === btn.dataset.id);
            if (factura) {
                exportarXMLFactura(factura);
            }
        }
    };
}

// ============================================================
// GESTIÓN DE COBROS (independiente de factura fiscal)
// ============================================================

async function registrarCobro(facturaId, importe, formaPago, fechaCobro, referencia = '', notas = '') {
    try {
        // Obtener factura actual
        const { data: factura, error: facturaError } = await sb
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single();
        
        if (facturaError) throw facturaError;
        
        const totalCobradoActual = factura.total_cobrado || 0;
        const nuevoTotalCobrado = totalCobradoActual + importe;
        const nuevoSaldo = factura.importe_total - nuevoTotalCobrado;
        const nuevoEstadoCobro = nuevoSaldo <= 0 ? 'cobrado' : (nuevoTotalCobrado > 0 ? 'parcial' : 'pendiente');
        
        // 1. Insertar registro de cobro
        const { error: cobroError } = await sb.from('cobros_clientes').insert({
            factura_id: facturaId,
            empresa_id: factura.empresa_id,
            importe: importe,
            fecha_cobro: fechaCobro,
            forma_pago: formaPago,
            referencia: referencia,
            notas: notas
        });
        
        if (cobroError) throw cobroError;
        
        // 2. Actualizar estado de cobro en factura (campos NO fiscales)
        const { error: updateError } = await sb.from('facturas').update({
            total_cobrado: nuevoTotalCobrado,
            saldo_cobro: nuevoSaldo,
            estado_cobro: nuevoEstadoCobro
        }).eq('id', facturaId);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Cobro registrado: ${importe}€ - Factura: ${factura.numero_factura}`);
        return { success: true, nuevoSaldo, nuevoEstadoCobro };
        
    } catch (error) {
        console.error('Error registrando cobro:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// SUBIR FACTURA CON OCR - GUARDAR EN BD Y ENVIAR EMAIL
// ============================================================

let ocrResultados = {};

async function abrirModalSubirFacturaOCR() {
    // Cargar clientes (si es factura emitida a cliente)
    const { data: clientes } = await sb.from('empresas')
        .select('id, nombre_empresa, nif_cif')
        .eq('activo', true)
        .order('nombre_empresa');
    
    const selectCliente = document.getElementById('ocrClienteId');
    if (selectCliente && clientes) {
        selectCliente.innerHTML = '<option value="">-- Factura de gasto (proveedor) --</option>' +
            '<option value="gasto">📉 GASTO (factura de proveedor)</option>' +
            '<option disabled>--- MIS CLIENTES ---</option>' +
            clientes.map(c => `<option value="${c.id}" data-nif="${c.nif_cif || ''}" data-nombre="${c.nombre_empresa}">🏢 ${c.nombre_empresa} (${c.nif_cif || 'Sin NIF'})</option>`).join('');
    }
    
    // Limpiar campos
    document.getElementById('inputOCRFactura').value = '';
    document.getElementById('previewOCR').style.display = 'none';
    document.getElementById('datosExtraidos').style.display = 'none';
    document.getElementById('ocrNumeroFactura').value = '';
    document.getElementById('ocrImporte').value = '';
    document.getElementById('ocrFecha').value = '';
    document.getElementById('ocrProveedor').value = '';
    document.getElementById('ocrConcepto').value = '';
    document.getElementById('ocrProgress').style.display = 'none';
    
    // Email del usuario logueado
    const { data: { user } } = await sb.auth.getUser();
    if (user?.email) {
        document.getElementById('ocrEmailDestino').value = user.email;
    }
    
    abrirModal('modalSubirFacturaOCR');
    
    // Previsualización y OCR automático
    const inputFile = document.getElementById('inputOCRFactura');
    inputFile.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.getElementById('previewOCRImg');
                img.src = event.target.result;
                document.getElementById('previewOCR').style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            await ejecutarOCR(file);
        }
    };
}

async function ejecutarOCR(file) {
    const progressDiv = document.getElementById('ocrProgress');
    const statusSpan = document.getElementById('ocrStatus');
    const progressBar = document.getElementById('ocrProgressBar');
    
    progressDiv.style.display = 'block';
    statusSpan.innerText = 'Procesando imagen con OCR...';
    progressBar.style.width = '20%';
    
    try {
        // Usar Tesseract.js para OCR
        const worker = await Tesseract.createWorker('spa');
        progressBar.style.width = '40%';
        statusSpan.innerText = 'Reconociendo texto...';
        
        const ret = await worker.recognize(file);
        progressBar.style.width = '70%';
        statusSpan.innerText = 'Extrayendo datos...';
        
        const texto = ret.data.text;
        console.log('Texto OCR extraído:', texto);
        
        // Extraer datos del texto
        ocrResultados = extraerDatosOCR(texto);
        
        // Rellenar campos
        if (ocrResultados.numero) {
            document.getElementById('ocrNumeroFactura').value = ocrResultados.numero;
        }
        if (ocrResultados.importe) {
            document.getElementById('ocrImporte').value = ocrResultados.importe;
        }
        if (ocrResultados.fecha) {
            document.getElementById('ocrFecha').value = ocrResultados.fecha;
        }
        if (ocrResultados.proveedor) {
            document.getElementById('ocrProveedor').value = ocrResultados.proveedor;
        }
        
        // Mostrar datos extraídos
        const datosContent = document.getElementById('datosExtraidosContent');
        datosContent.innerHTML = `
            <ul style="margin: 8px 0 0 20px;">
                <li><strong>Nº Factura:</strong> ${ocrResultados.numero || 'No detectado'}</li>
                <li><strong>Proveedor:</strong> ${ocrResultados.proveedor || 'No detectado'}</li>
                <li><strong>Importe:</strong> ${ocrResultados.importe ? ocrResultados.importe + '€' : 'No detectado'}</li>
                <li><strong>Fecha:</strong> ${ocrResultados.fecha || 'No detectada'}</li>
            </ul>
        `;
        document.getElementById('datosExtraidos').style.display = 'block';
        
        progressBar.style.width = '100%';
        statusSpan.innerText = 'OCR completado! Revisa los datos y ajusta si es necesario.';
        
        await worker.terminate();
        
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error('Error en OCR:', error);
        statusSpan.innerText = 'Error en OCR. Introduce los datos manualmente.';
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 2000);
    }
}

function extraerDatosOCR(texto) {
    const resultados = {
        numero: null,
        importe: null,
        fecha: null,
        proveedor: null
    };
    
    // Buscar número de factura (patrones comunes)
    const numeroPatterns = [
        /Factura\s+N[ºº]?\s*([A-Z0-9\-]+)/i,
        /N[ºº]\s*Factura\s*([A-Z0-9\-]+)/i,
        /Invoice\s*N[ºº]\s*([A-Z0-9\-]+)/i,
        /Número\s*:\s*([A-Z0-9\-]+)/i
    ];
    
    for (const pattern of numeroPatterns) {
        const match = texto.match(pattern);
        if (match) {
            resultados.numero = match[1];
            break;
        }
    }
    
    // Buscar importe total
    const importePatterns = [
        /Total\s*[€$\s]*(\d+[\.,]\d{2})/i,
        /Importe\s*Total\s*[€$\s]*(\d+[\.,]\d{2})/i,
        /TOTAL\s*[€$\s]*(\d+[\.,]\d{2})/i,
        /A pagar\s*[€$\s]*(\d+[\.,]\d{2})/i
    ];
    
    for (const pattern of importePatterns) {
        const match = texto.match(pattern);
        if (match) {
            resultados.importe = parseFloat(match[1].replace(',', '.'));
            break;
        }
    }
    
    // Buscar fecha
    const fechaPatterns = [
        /Fecha\s*:\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/i,
        /(\d{1,2}[/\-]\d{1,2}[/\-]\d{4})/,
        /(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})/
    ];
    
    for (const pattern of fechaPatterns) {
        const match = texto.match(pattern);
        if (match) {
            let fechaStr = match[1];
            // Convertir a formato YYYY-MM-DD
            if (fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes[2].length === 4) {
                    resultados.fecha = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                } else {
                    resultados.fecha = `20${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                }
            } else if (fechaStr.includes('-')) {
                resultados.fecha = fechaStr;
            }
            break;
        }
    }
    
    // Buscar nombre del proveedor (primeras líneas)
    const lineas = texto.split('\n');
    for (let i = 0; i < Math.min(lineas.length, 10); i++) {
        const linea = lineas[i].trim();
        if (linea.length > 5 && linea.length < 100 && 
            !linea.match(/factura|invoice|nº|fecha|total/gi) &&
            linea.match(/[A-Za-z]/)) {
            resultados.proveedor = linea.substring(0, 50);
            break;
        }
    }
    
    return resultados;
}

async function procesarYEnviarFacturaOCR() {
    const fileInput = document.getElementById('inputOCRFactura');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarMensaje('Selecciona una imagen de factura', 'error');
        return;
    }
    
    const clienteSeleccion = document.getElementById('ocrClienteId').value;
    const emailDestino = document.getElementById('ocrEmailDestino').value.trim();
    const numeroFactura = document.getElementById('ocrNumeroFactura').value.trim();
    const importe = parseFloat(document.getElementById('ocrImporte').value) || 0;
    const fecha = document.getElementById('ocrFecha').value;
    const proveedor = document.getElementById('ocrProveedor').value.trim();
    const concepto = document.getElementById('ocrConcepto').value.trim() || 'Factura escaneada';
    
    if (!emailDestino) {
        mostrarMensaje('Introduce el email de destino', 'error');
        return;
    }
    
    if (importe <= 0) {
        mostrarMensaje('Introduce un importe válido', 'error');
        return;
    }
    
    if (!fecha) {
        mostrarMensaje('Introduce la fecha de la factura', 'error');
        return;
    }
    
    mostrarModalCarga('Procesando factura...');
    
    try {
        // 1. Convertir imagen a PDF
        const pdfBlob = await convertirImagenAPDF(file);
        
        // 2. Subir PDF a Supabase Storage
        const fileName = `factura_${Date.now()}_${numeroFactura || 'sin_numero'}.pdf`;
        const { data: uploadData, error: uploadError } = await sb.storage
            .from('facturas_escaneadas')
            .upload(fileName, pdfBlob, { contentType: 'application/pdf' });
        
        if (uploadError) throw uploadError;
        
        // 3. Obtener URL pública del PDF
        const { data: urlData } = sb.storage
            .from('facturas_escaneadas')
            .getPublicUrl(fileName);
        
        const pdfUrl = urlData.publicUrl;
        
        // 4. Guardar en base de datos
        const tipo = clienteSeleccion === 'gasto' ? 'gasto' : 'ingreso';
        const empresaId = (tipo === 'ingreso' && clienteSeleccion !== 'gasto') ? clienteSeleccion : null;
        
        const { data: facturaGuardada, error: dbError } = await sb
            .from('facturas_escaneadas')
            .insert({
                empresa_id: empresaId,
                tipo: tipo,
                numero_factura: numeroFactura,
                proveedor: proveedor,
                fecha: fecha,
                importe_total: importe,
                concepto: concepto,
                pdf_url: pdfUrl,
                datos_ocr: ocrResultados,
                procesado: true,
                email_enviado: false
            })
            .select()
            .single();
        
        if (dbError) throw dbError;
        
        // 5. Enviar email con la factura procesada
        await enviarEmailFacturaProcesada(facturaGuardada, emailDestino, pdfUrl);
        
        // 6. Actualizar estado de email enviado
        await sb.from('facturas_escaneadas')
            .update({ email_enviado: true })
            .eq('id', facturaGuardada.id);
        
        cerrarModalCarga();
        cerrarModal('modalSubirFacturaOCR');
        mostrarMensaje(`✅ Factura procesada y enviada a ${emailDestino}`, 'exito');
        
        // Recargar lista si estamos en el módulo de gastos
        if (moduloActual === 'gastos') {
            const module = await import('./gastos.js');
            if (module.iniciar) await module.iniciar();
        }
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
        console.error(error);
    }
}

async function convertirImagenAPDF(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                const pdf = new jspdf.jsPDF({
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });
                
                const imgWidth = 190;
                const imgHeight = (img.height * imgWidth) / img.width;
                
                pdf.addImage(img, 'JPEG', 10, 10, imgWidth, imgHeight, undefined, 'FAST');
                const pdfBlob = pdf.output('blob');
                resolve(pdfBlob);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function enviarEmailFacturaProcesada(factura, emailDestino, pdfUrl) {
    // Aquí llamarías a una Edge Function de Supabase para enviar el email
    // Por ahora, abrimos el cliente de correo
    
    const subject = encodeURIComponent(`Factura procesada - ${factura.numero_factura || 'Sin número'} - ${factura.proveedor || 'Proveedor'}`);
    const body = encodeURIComponent(`
    📄 FACTURA PROCESADA
    
    Datos extraídos:
    - Número: ${factura.numero_factura || 'No detectado'}
    - Proveedor: ${factura.proveedor || 'No detectado'}
    - Fecha: ${factura.fecha}
    - Importe: ${factura.importe_total}€
    - Concepto: ${factura.concepto}
    
    📎 La factura escaneada está adjunta como PDF.
    
    ---
    Este email ha sido generado automáticamente por COMUTECH.
    `);
    
    // Abrir cliente de correo
    window.open(`mailto:${emailDestino}?subject=${subject}&body=${body}`);
    
    // También podrías descargar el PDF localmente
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `factura_${factura.numero_factura || Date.now()}.pdf`;
    a.click();
}

async function abrirModalRegistrarCobro(facturaId) {
    // Obtener factura actual
    const { data: factura, error } = await sb
        .from('facturas')
        .select('*')
        .eq('id', facturaId)
        .single();
    
    if (error) {
        mostrarMensaje('Error al obtener la factura', 'error');
        return;
    }
    
    const saldoPendiente = factura.saldo_cobro !== null ? factura.saldo_cobro : factura.importe_total;
    const totalCobrado = factura.total_cobrado || 0;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">💰 Registrar cobro</div>
            <div style="margin-bottom: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small><strong>Factura:</strong> ${escapeHtml(factura.numero_factura)}</small><br>
                <small><strong>Total factura:</strong> ${formatMoney(factura.importe_total)}€</small><br>
                <small><strong>Ya cobrado:</strong> ${formatMoney(totalCobrado)}€</small><br>
                <small><strong style="color: #2563eb;">Pendiente de cobro: ${formatMoney(saldoPendiente)}€</strong></small>
            </div>
            <div class="grupo">
                <label>💰 Importe del cobro (€)</label>
                <input type="number" id="importeCobro" step="0.01" max="${saldoPendiente}" placeholder="0.00" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
            </div>
            <div class="row-flex">
                <div class="grupo">
                    <label>📅 Fecha del cobro</label>
                    <input type="date" id="fechaCobro" value="${new Date().toISOString().split('T')[0]}" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
                </div>
                <div class="grupo">
                    <label>💳 Forma de pago</label>
                    <select id="formaPagoCobro" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
                        <option value="transferencia">Transferencia bancaria</option>
                        <option value="tarjeta">Tarjeta de crédito/débito</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="bizum">Bizum</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
            </div>
            <div class="grupo">
                <label>🔢 Referencia (opcional)</label>
                <input type="text" id="referenciaCobro" placeholder="Nº transferencia, comprobante, etc." style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">
            </div>
            <div class="btn-group" style="margin-top: 20px;">
                <button id="btnConfirmarCobro" class="btn-success">✅ Registrar cobro</button>
                <button id="btnCancelarCobro" class="btn-danger">❌ Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#btnConfirmarCobro').onclick = async () => {
        const importeCobro = parseFloat(modal.querySelector('#importeCobro').value);
        const fechaCobro = modal.querySelector('#fechaCobro').value;
        const formaPago = modal.querySelector('#formaPagoCobro').value;
        const referencia = modal.querySelector('#referenciaCobro').value;
        
        if (!importeCobro || importeCobro <= 0) {
            mostrarMensaje('Introduce un importe válido', 'error');
            return;
        }
        
        if (importeCobro > saldoPendiente) {
            mostrarMensaje(`El importe no puede superar el pendiente de cobro (${formatMoney(saldoPendiente)}€)`, 'error');
            return;
        }
        
        mostrarModalCarga('Registrando cobro...');
        
        const result = await registrarCobro(facturaId, importeCobro, formaPago, fechaCobro, referencia);
        
        cerrarModalCarga();
        
        if (result.success) {
            mostrarMensaje(`✅ Cobro de ${formatMoney(importeCobro)}€ registrado`, 'exito');
            modal.remove();
            await cargarFacturas();
            renderizarVistaFacturacion();
        } else {
            mostrarMensaje('Error: ' + result.error, 'error');
        }
    };
    
    modal.querySelector('#btnCancelarCobro').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}


export default { iniciar };