// js/modules/facturacion.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga, generarHashFactura } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let facturas = [];
let facturasFiltradas = [];
let productosDisponibles = [];
let productosSeleccionados = [];

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
        const esRectificativa = factura.tipo_rectificativa;
        const badgeRectificativa = esRectificativa ? `<span class="badge badge-warning">🔄 ${esRectificativa}</span>` : '';
        
        html += `
            <div class="cliente-card">
                <div class="cliente-header">
                    <div>
                        <div class="cliente-nombre">${escapeHtml(factura.numero_factura)}</div>
                        <div class="cliente-nif">${escapeHtml(factura.cliente_nombre)}</div>
                        ${factura.hash_factura ? `<div class="cliente-nif" style="font-size:10px; color:green;">🔗 Verifactu: OK</div>` : ''}
                    </div>
                    <div class="cliente-actions">
                        <button class="ver-factura action-btn" data-id="${factura.id}" title="Ver">👁️</button>
                        <button class="pdf-factura action-btn" data-id="${factura.id}" title="PDF">📄</button>
                        <button class="xml-factura action-btn" data-id="${factura.id}" title="Exportar XML">📎</button>
                        ${factura.estado === 'pendiente' && !esRectificativa ? `<button class="rectificar-factura action-btn" data-id="${factura.id}" title="Rectificar" style="color:var(--ios-orange);">🔄</button>` : ''}
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
                    ${badgeRectificativa}
                    ${factura.hash_factura ? `<span class="badge badge-activo">🔗 Hash OK</span>` : `<span class="badge badge-inactivo">❌ Sin hash</span>`}
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
        
        // ============================================================
        // 1. OBTENER CONFIGURACIÓN DE CADENA (para continuar desde sistema anterior)
        // ============================================================
        
        // Obtener el ID de tu empresa (emisor) - está en localStorage o variable global
        // Asumimos que tienes la empresa actual en una variable
        let miEmpresaId = null;
        try {
            // Intentar obtener la empresa del super-admin
            const { data: miEmpresa } = await sb.from('empresas')
                .select('id')
                .eq('nombre_empresa', 'COMUTECH S.L.') // Cambia por tu nombre
                .maybeSingle();
            miEmpresaId = miEmpresa?.id;
        } catch (e) {
            console.log('No se encontró empresa emisora configurada');
        }
        
        // Obtener configuración de cadena (si existe)
        let configCadena = null;
        if (miEmpresaId) {
            const { data } = await sb.from('configuracion_facturacion_emisor')
                .select('ultimo_hash, ultimo_numero_factura')
                .eq('empresa_id', miEmpresaId)
                .maybeSingle();
            configCadena = data;
        }
        
        // ============================================================
        // 2. OBTENER ÚLTIMA FACTURA REAL DEL CLIENTE
        // ============================================================
        
        const { data: ultimaFacturaCliente } = await sb.from('facturas')
            .select('hash_factura, numero_factura')
            .eq('empresa_id', clienteId)
            .order('fecha_expedicion', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        // ============================================================
        // 3. DETERMINAR HASH ANTERIOR Y PRÓXIMO NÚMERO DE FACTURA
        // ============================================================
        
        let hashAnterior = '0'.repeat(64);
        let ultimoNumeroFactura = null;
        let usarConfiguracion = false;
        
        if (ultimaFacturaCliente && ultimaFacturaCliente.hash_factura) {
            // PRIORIDAD 1: Ya hay facturas en el sistema (continuar cadena normal)
            hashAnterior = ultimaFacturaCliente.hash_factura;
            ultimoNumeroFactura = ultimaFacturaCliente.numero_factura;
            console.log('📄 Continuando cadena desde última factura propia:', ultimoNumeroFactura);
            
        } else if (configCadena && configCadena.ultimo_hash) {
            // PRIORIDAD 2: Es la primera factura, pero venimos de otro sistema (asesoría)
            hashAnterior = configCadena.ultimo_hash;
            ultimoNumeroFactura = configCadena.ultimo_numero_factura;
            usarConfiguracion = true;
            console.log('🔗 Continuando cadena desde sistema anterior. Hash anterior:', hashAnterior?.substring(0, 20) + '...');
            console.log('📄 Último número del sistema anterior:', ultimoNumeroFactura);
            
        } else {
            // PRIORIDAD 3: Primera factura, empezamos desde cero
            console.log('🆕 Primera factura del sistema. Iniciando cadena desde cero.');
        }
        
        // ============================================================
        // 4. GENERAR NUEVO NÚMERO DE FACTURA
        // ============================================================
        
        let numeroFactura = '';
        const añoActual = new Date().getFullYear();
        
        if (ultimoNumeroFactura) {
            // Intentar extraer prefijo y número de la última factura
            const match = ultimoNumeroFactura.match(/([A-Z]+)(\d+)/);
            if (match) {
                const prefijo = match[1];
                const numero = parseInt(match[2]);
                const longitud = match[2].length;
                numeroFactura = `${prefijo}${String(numero + 1).padStart(longitud, '0')}`;
            } else {
                // Formato no reconocido, usar formato estándar
                numeroFactura = `F${añoActual}0001`;
            }
        } else {
            // Primera factura
            numeroFactura = `F${añoActual}0001`;
        }
        
        console.log('📝 Nueva factura número:', numeroFactura);
        console.log('🔗 Hash anterior:', hashAnterior?.substring(0, 20) + '...');
        
        // ============================================================
        // 5. GENERAR HASH PARA LA NUEVA FACTURA
        // ============================================================
        
        const datosHash = {
            numero_factura: numeroFactura,
            fecha_expedicion: fechaExpedicion,
            importe_total: importeTotal,
            emisor_nif: EMISOR_NIF,
            cliente_nif: clienteNif,
            hash_anterior: hashAnterior
        };
        
        const hashActual = await generarHashFactura(datosHash);
        
        console.log('✅ Hash generado:', hashActual.substring(0, 20) + '...');
        
        // ============================================================
        // 6. CREAR FACTURA EN BASE DE DATOS
        // ============================================================
        
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
            es_migrada: false
        }).select().single();
        
        if (error) throw error;
        
        // ============================================================
        // 7. CREAR LÍNEAS DE FACTURA
        // ============================================================
        
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
        
        // ============================================================
        // 8. ACTUALIZAR CONFIGURACIÓN (si usamos configuración inicial)
        // ============================================================
        
        if (usarConfiguracion && miEmpresaId) {
            // Actualizar la configuración con el nuevo hash para futuras facturas
            await sb.from('configuracion_facturacion_emisor')
                .update({
                    ultimo_hash: hashActual,
                    ultimo_numero_factura: numeroFactura,
                    updated_at: new Date().toISOString()
                })
                .eq('empresa_id', miEmpresaId);
            console.log('💾 Configuración de cadena actualizada');
        }
        
        cerrarModalCarga();
        mostrarMensaje(`✅ Factura ${numeroFactura} generada con hash Verifactu`, 'exito');
        modal.remove();
        
        // Recargar listas
        await cargarFacturas();
        renderizarVistaFacturacion();
        
        // Mostrar mensaje especial si es primera factura desde sistema anterior
        if (usarConfiguracion) {
            setTimeout(() => {
                mostrarMensaje(`🔗 Factura de continuación: La cadena Verifactu sigue desde factura ${configCadena.ultimo_numero_factura}`, 'info');
            }, 2000);
        }
        
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
        const badgeRectificativa = esRectificativa ? `<div class="alert-info" style="margin-bottom:12px; padding:8px; background:#fef3c7; border-left-color:#f59e0b;">
            <strong>🔄 Factura ${esRectificativa === 'abono' ? 'de abono' : esRectificativa === 'abono_parcial' ? 'de abono parcial' : 'sustitutiva'}</strong><br>
            <small>Motivo: ${escapeHtml(factura.motivo_rectificativa || 'No especificado')}</small><br>
            <small>Factura original: ${factura.factura_original_id ? 'ID: ' + factura.factura_original_id.substring(0,8) + '...' : 'N/A'}</small>
        </div>` : '';
        
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
                    <span class="badge ${factura.estado === 'pagada' ? 'badge-activo' : 'badge-inactivo'}">${factura.estado === 'pagada' ? 'Pagada' : 'Pendiente'}</span>
                </div>
                ${factura.hash_factura ? `
                <div style="margin-top:12px; padding:8px; background:#f0fdf4; border-radius:8px;">
                    <small><strong>🔗 Datos Verifactu:</strong></small><br>
                    <small>Hash: ${factura.hash_factura.substring(0, 20)}...</small><br>
                    <small>Hash anterior: ${factura.hash_factura_anterior?.substring(0, 20)}...</small>
                </div>
                ` : ''}
                <div class="btn-group" style="margin-top: 16px;">
                    ${factura.estado === 'pendiente' && !esRectificativa ? `<button id="rectificarFacturaBtn" class="btn-warning">🔄 Rectificar</button>` : ''}
                    <button id="cerrarFacturaModal" class="btn-primary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
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
// FUNCIONES PARA RECTIFICATIVAS
// ============================================================

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
                <textarea id="motivoRectificativa" rows="3" placeholder="Ej: Error en el importe, Producto no entregado, Devolución, etc."></textarea>
            </div>
            
            <div class="alert-info" style="margin: 16px 0; padding: 12px; background: #fef3c7; border-left-color: #f59e0b;">
                <small>⚠️ La factura rectificativa anulará el efecto de la factura original.</small>
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
        
        if (tipo === 'sustitutiva') {
            modal.remove();
            await abrirModalEditarRectificativa(facturaOriginal);
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
    let importeRectificativo = 0;
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
        importeRectificativo = subtotalRectificativo + ivaRectificativo;
        
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
        importeRectificativo = subtotalRectificativo + ivaRectificativo;
        
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
        importeRectificativo = subtotalRectificativo + ivaRectificativo;
    }
    
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

async function abrirModalEditarRectificativa(facturaOriginal) {
    const { data: lineasOriginales } = await sb.from('lineas_factura')
        .select('*')
        .eq('factura_id', facturaOriginal.id);
    
    let lineasEditadas = JSON.parse(JSON.stringify(lineasOriginales));
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '100001';
    
    function renderizarLineas() {
        let html = '';
        lineasEditadas.forEach((linea, idx) => {
            html += `
                <div class="linea-item" style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 8px;">
                    <input type="text" class="linea-concepto" data-idx="${idx}" value="${escapeHtml(linea.concepto)}" style="flex: 2; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    <input type="number" class="linea-cantidad" data-idx="${idx}" value="${linea.cantidad}" step="0.01" style="width: 80px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    <input type="number" class="linea-precio" data-idx="${idx}" value="${linea.precio_unitario}" step="0.01" style="width: 100px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    <input type="number" class="linea-iva" data-idx="${idx}" value="${linea.iva}" step="1" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    <button class="eliminar-linea" data-idx="${idx}" style="background: #c2410c; color: white; border: none; padding: 6px 10px; border-radius: 6px;">✖</button>
                </div>
            `;
        });
        return html;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">✏️ Editar factura sustitutiva</div>
            <div class="alert-info" style="margin-bottom: 16px; padding: 12px; background: #dbeafe; border-left-color: #2563eb;">
                <small>📝 Edita las líneas de la factura. La factura original quedará anulada y esta nueva la reemplazará.</small>
            </div>
            
            <div class="grupo">
                <label>Motivo de la rectificación</label>
                <textarea id="motivoRectificativaSust" rows="2" placeholder="Ej: Corrección de errores en la factura original"></textarea>
            </div>
            
            <div class="card-header">📦 Líneas de factura</div>
            <div id="lineasContainer" style="margin-bottom: 16px;">
                ${renderizarLineas()}
            </div>
            
            <button id="agregarLineaRectificativa" class="btn-info" style="margin-bottom: 16px;">+ Añadir línea</button>
            
            <div class="btn-group">
                <button id="confirmarRectificativaSust" class="btn-success">✅ Generar factura sustitutiva</button>
                <button id="cancelarRectificativaSust" class="btn-danger">❌ Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    function actualizarListaLineas() {
        const container = document.getElementById('lineasContainer');
        if (container) container.innerHTML = renderizarLineas();
        configurarEventosLineas();
    }
    
    function configurarEventosLineas() {
        document.querySelectorAll('.linea-concepto, .linea-cantidad, .linea-precio, .linea-iva').forEach(input => {
            input.onchange = () => {
                const idx = parseInt(input.dataset.idx);
                const field = input.classList.contains('linea-concepto') ? 'concepto' :
                             input.classList.contains('linea-cantidad') ? 'cantidad' :
                             input.classList.contains('linea-precio') ? 'precio_unitario' : 'iva';
                let value = input.value;
                if (field === 'cantidad' || field === 'precio_unitario' || field === 'iva') {
                    value = parseFloat(value) || 0;
                }
                lineasEditadas[idx][field] = value;
                if (field === 'cantidad' || field === 'precio_unitario') {
                    lineasEditadas[idx].subtotal = lineasEditadas[idx].cantidad * lineasEditadas[idx].precio_unitario;
                }
            };
        });
        
        document.querySelectorAll('.eliminar-linea').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                lineasEditadas.splice(idx, 1);
                actualizarListaLineas();
            };
        });
    }
    
    document.getElementById('agregarLineaRectificativa').onclick = () => {
        lineasEditadas.push({
            concepto: 'Nuevo concepto',
            cantidad: 1,
            precio_unitario: 0,
            iva: 21,
            subtotal: 0
        });
        actualizarListaLineas();
    };
    
    document.getElementById('confirmarRectificativaSust').onclick = async () => {
        const motivo = document.getElementById('motivoRectificativaSust').value.trim();
        if (!motivo) {
            mostrarMensaje('Debes indicar el motivo de la rectificación', 'error');
            return;
        }
        
        for (const linea of lineasEditadas) {
            if (!linea.concepto || linea.concepto.trim() === '') {
                mostrarMensaje('Todas las líneas deben tener un concepto', 'error');
                return;
            }
            if (linea.precio_unitario <= 0) {
                mostrarMensaje('El precio unitario debe ser mayor que 0', 'error');
                return;
            }
        }
        
        mostrarModalCarga('Generando factura sustitutiva...');
        
        try {
            await generarFacturaRectificativa(facturaOriginal, 'sustitutiva', motivo, 100, lineasEditadas);
            cerrarModalCarga();
            modal.remove();
            await cargarFacturas();
            renderizarVistaFacturacion();
        } catch (error) {
            cerrarModalCarga();
            mostrarMensaje('Error: ' + error.message, 'error');
        }
    };
    
    document.getElementById('cancelarRectificativaSust').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    configurarEventosLineas();
}

function setupEventosFacturacion() {
    const btnNueva = document.getElementById('btnNuevaFactura');
    if (btnNueva) btnNueva.onclick = abrirModalNuevaFactura;
    
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

export default { iniciar };