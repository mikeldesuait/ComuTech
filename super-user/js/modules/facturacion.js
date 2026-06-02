// js/modules/facturacion.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let facturas = [];
let facturasFiltradas = [];
let productosDisponibles = [];
let productosSeleccionados = [];

export async function iniciar() {
    console.log('💰 Iniciando módulo de facturación');
    await cargarFacturas();
    await cargarProductos();
    renderizarVistaFacturacion();
    setupEventosFacturacion();
}

async function cargarFacturas() {
    try {
        const { data, error } = await sb.from('facturas').select('*').order('fecha_expedicion', { ascending: false });
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

function renderizarVistaFacturacion() {
    const container = document.getElementById('facturasLista');
    if (!container) return;
    container.innerHTML = renderizarListaFacturas();
    cargarClientesEnFiltro();
    setupFiltros();
}

async function cargarClientesEnFiltro() {
    const selectFiltro = document.getElementById('filtroClienteFactura');
    if (!selectFiltro) return;
    const clientesUnicos = [];
    const seen = {};
    facturas.forEach(f => {
        if (!seen[f.cliente_nif]) {
            seen[f.cliente_nif] = true;
            clientesUnicos.push({ nombre: f.cliente_nombre, nif: f.cliente_nif });
        }
    });
    let options = '<option value="">Todos los clientes</option>';
    clientesUnicos.forEach(c => {
        options += `<option value="${escapeHtml(c.nif)}">${escapeHtml(c.nombre)} (${escapeHtml(c.nif)})</option>`;
    });
    selectFiltro.innerHTML = options;
}

function renderizarListaFacturas() {
    if (!facturasFiltradas.length) return '<div style="text-align:center; padding:60px; color:gray;">📭 No hay facturas</div>';
    let html = '';
    facturasFiltradas.forEach(factura => {
        html += `
            <div class="cliente-card">
                <div class="cliente-header">
                    <div>
                        <div class="cliente-nombre">${escapeHtml(factura.numero_factura)}</div>
                        <div class="cliente-nif">${escapeHtml(factura.cliente_nombre)}</div>
                    </div>
                    <div class="cliente-actions">
                        <button class="ver-factura action-btn" data-id="${factura.id}" title="Ver">👁️</button>
                        <button class="pdf-factura action-btn" data-id="${factura.id}" title="PDF">📄</button>
                        ${factura.estado === 'pendiente' ? `<button class="pagar-factura action-btn" data-id="${factura.id}" title="Pagar" style="color:var(--ios-green);">💰</button>` : ''}
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
                    <span class="badge ${factura.estado === 'pagada' ? 'badge-activo' : 'badge-inactivo'}">${factura.estado === 'pagada' ? '✅ Pagada' : '⏳ Pendiente'}</span>
                </div>
            </div>
        `;
    });
    return html;
}

function setupFiltros() {
    const filtroTexto = document.getElementById('filtroFactura');
    const filtroEstado = document.getElementById('filtroEstadoFactura');
    const filtroCliente = document.getElementById('filtroClienteFactura');
    if (filtroTexto) filtroTexto.oninput = () => aplicarFiltros();
    if (filtroEstado) filtroEstado.onchange = () => aplicarFiltros();
    if (filtroCliente) filtroCliente.onchange = () => aplicarFiltros();
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
    const container = document.getElementById('facturasLista');
    if (container) container.innerHTML = renderizarListaFacturas();
    setupEventosFacturacion();
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
            document.getElementById('btnGenerarFacturaNueva').onclick = () => generarFactura(modal);
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

async function generarFactura(modal) {
    const selectCliente = document.getElementById('facturaCliente');
    const clienteId = selectCliente?.value;
    const selectedOption = selectCliente?.options[selectCliente.selectedIndex];
    const clienteNombre = selectedOption?.dataset?.nombre;
    const clienteNif = selectedOption?.dataset?.nif;
    const fechaVencimiento = document.getElementById('facturaVencimiento')?.value;
    if (!clienteId || !productosSeleccionados.length) return mostrarMensaje('Completa los datos', 'error');
    mostrarModalCarga('Generando factura...');
    try {
        let subtotal = 0, ivaTotal = 0;
        productosSeleccionados.forEach(p => { const base = p.cantidad * p.precio_unitario; subtotal += base; ivaTotal += base * (p.iva / 100); });
        const importeTotal = subtotal + ivaTotal;
        const { data: ultimaFactura } = await sb.from('facturas').select('numero_factura').order('created_at', { ascending: false }).limit(1);
        let numeroFactura = 'F20260001';
        if (ultimaFactura && ultimaFactura.length) { const ultimoNumero = parseInt(ultimaFactura[0].numero_factura.slice(-4)); numeroFactura = `F2026${String(ultimoNumero + 1).padStart(4, '0')}`; }
        const { data: factura, error } = await sb.from('facturas').insert({ empresa_id: clienteId, numero_factura: numeroFactura, fecha_expedicion: new Date().toISOString(), fecha_vencimiento: fechaVencimiento, cliente_nif: clienteNif, cliente_nombre: clienteNombre, subtotal, iva_total: ivaTotal, importe_total: importeTotal, estado: 'pendiente' }).select().single();
        if (error) throw error;
        for (const linea of productosSeleccionados) {
            await sb.from('lineas_factura').insert({ factura_id: factura.id, concepto: linea.concepto, cantidad: linea.cantidad, precio_unitario: linea.precio_unitario, iva: linea.iva, subtotal: linea.cantidad * linea.precio_unitario });
        }
        cerrarModalCarga();
        mostrarMensaje(`✅ Factura ${numeroFactura} generada`, 'exito');
        modal.remove();
        await cargarFacturas();
        renderizarVistaFacturacion();
    } catch (error) { cerrarModalCarga(); mostrarMensaje(`❌ Error: ${error.message}`, 'error'); }
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
            lineas.forEach(l => { lineasHtml += `<div>${escapeHtml(l.concepto)} x${l.cantidad} = ${formatMoney(l.subtotal)}€</div>`; });
        } else {
            lineasHtml = 'Sin líneas';
        }
        modal.innerHTML = `<div class="modal-content"><div class="modal-header">📄 Factura ${factura.numero_factura}</div>
            <p><strong>Cliente:</strong> ${escapeHtml(factura.cliente_nombre)}<br><strong>NIF:</strong> ${escapeHtml(factura.cliente_nif)}<br><strong>Fecha:</strong> ${new Date(factura.fecha_expedicion).toLocaleDateString()}<br><strong>Vence:</strong> ${new Date(factura.fecha_vencimiento).toLocaleDateString()}</p>
            <div style="background:var(--ios-bg); padding:12px; border-radius:12px;">${lineasHtml}</div>
            <div class="cliente-badges" style="margin-top:12px;"><span class="badge">Base: ${formatMoney(factura.subtotal)}€</span><span class="badge">IVA: ${formatMoney(factura.iva_total)}€</span><span class="badge badge-activo">Total: ${formatMoney(factura.importe_total)}€</span><span class="badge ${factura.estado === 'pagada' ? 'badge-activo' : 'badge-inactivo'}">${factura.estado === 'pagada' ? 'Pagada' : 'Pendiente'}</span></div>
            <div class="btn-group"><button id="cerrarFacturaModal" class="btn-primary">Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cerrarFacturaModal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

async function marcarFacturaPagada(id) {
    mostrarModalCarga('Actualizando...');
    try {
        await sb.from('facturas').update({ estado: 'pagada', updated_at: new Date().toISOString() }).eq('id', id);
        cerrarModalCarga();
        mostrarMensaje('✅ Factura pagada', 'exito');
        await cargarFacturas();
        renderizarVistaFacturacion();
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

function setupEventosFacturacion() {
    const btnNueva = document.getElementById('btnNuevaFactura');
    if (btnNueva) btnNueva.onclick = abrirModalNuevaFactura;
    const container = document.getElementById('facturasLista');
    if (!container) return;
    container.onclick = async (e) => {
        const btn = e.target;
        if (btn.classList.contains('ver-factura')) await verFactura(btn.dataset.id);
        if (btn.classList.contains('pagar-factura')) await marcarFacturaPagada(btn.dataset.id);
        if (btn.classList.contains('pdf-factura')) mostrarMensaje('PDF próximamente', 'info');
    };
}

export default { iniciar };