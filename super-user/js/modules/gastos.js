// js/modules/gastos.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let gastos = [];
let gastosFiltrados = [];

export async function iniciar() {
    console.log('📉 Iniciando módulo de gastos');
    await cargarGastos();
    renderizarListaGastos();
    setupEventosGastos();
    setupFiltros();
}

async function cargarGastos() {
    try {
        const { data, error } = await sb
            .from('gastos')
            .select('*')
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        gastos = data || [];
        gastosFiltrados = [...gastos];
        actualizarResumen();
        console.log(`📉 ${gastos.length} gastos cargados`);
    } catch (error) {
        console.error('Error cargando gastos:', error);
        mostrarMensaje('Error cargando gastos: ' + error.message, 'error');
    }
}

function actualizarResumen() {
    let total = 0;
    let totalIva = 0;
    let totalPendiente = 0;
    
    gastos.forEach(g => {
        total += g.importe_total;
        totalIva += g.iva;
        if (!g.pagado) totalPendiente += g.importe_total;
    });
    
    document.getElementById('totalGastos').innerHTML = formatMoney(total) + '€';
    document.getElementById('totalIvaGastos').innerHTML = formatMoney(totalIva) + '€';
    document.getElementById('totalPendienteGastos').innerHTML = formatMoney(totalPendiente) + '€';
}

function renderizarListaGastos() {
    const container = document.getElementById('listaGastos');
    if (!container) return;
    
    if (!gastosFiltrados.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px; color:gray;">
                <div style="font-size:48px; margin-bottom:16px;">📉</div>
                <p>No hay gastos registrados</p>
                <p><small>Haz clic en "Nuevo gasto" para añadir facturas de proveedores</small></p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    gastosFiltrados.forEach(gasto => {
        const categoriaIcono = getCategoriaIcono(gasto.categoria);
        const badgePagado = gasto.pagado ? 
            '<span class="badge badge-activo">✅ Pagado</span>' : 
            '<span class="badge badge-inactivo">⏳ Pendiente</span>';
        
        html += `
            <div class="cliente-card">
                <div class="cliente-header">
                    <div>
                        <div class="cliente-nombre">${escapeHtml(gasto.proveedor)}</div>
                        <div class="cliente-nif">${escapeHtml(gasto.numero_factura || 'Sin factura')} | ${new Date(gasto.fecha).toLocaleDateString()}</div>
                    </div>
                    <div class="cliente-actions">
                        <button class="editar-gasto action-btn" data-id="${gasto.id}" title="Editar">✏️</button>
                        <button class="eliminar-gasto action-btn" data-id="${gasto.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="cliente-contacto">
                    <span>💰 ${formatMoney(gasto.importe_total)}€</span>
                    <span>🧾 IVA: ${formatMoney(gasto.iva)}€</span>
                    <span>${categoriaIcono}</span>
                </div>
                <div class="cliente-badges">
                    ${badgePagado}
                    ${gasto.descripcion ? `<span class="badge">📝 ${escapeHtml(gasto.descripcion.substring(0, 40))}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getCategoriaIcono(categoria) {
    const iconos = {
        alquiler: '🏢 Alquiler',
        luz: '💡 Luz',
        agua: '💧 Agua',
        internet: '🌐 Internet',
        software: '💻 Software',
        asesoria: '⚖️ Asesoría',
        otros: '📦 Otros'
    };
    return iconos[categoria] || '📦 Otros';
}

function abrirModalNuevoGasto() {
    document.getElementById('modalGastoHeader').innerHTML = '📉 Nuevo gasto';
    document.getElementById('gastoId').value = '';
    document.getElementById('gastoNumeroFactura').value = '';
    document.getElementById('gastoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('gastoProveedor').value = '';
    document.getElementById('gastoNifProveedor').value = '';
    document.getElementById('gastoSubtotal').value = '';
    document.getElementById('gastoIva').value = '21';
    document.getElementById('gastoCategoria').value = 'otros';
    document.getElementById('gastoPagado').value = 'false';
    document.getElementById('gastoDescripcion').value = '';
    
    abrirModal('modalGasto');
}

async function guardarGasto() {
    const id = document.getElementById('gastoId').value;
    const numeroFactura = document.getElementById('gastoNumeroFactura').value.trim();
    const fecha = document.getElementById('gastoFecha').value;
    const proveedor = document.getElementById('gastoProveedor').value.trim();
    const nifProveedor = document.getElementById('gastoNifProveedor').value.trim();
    const subtotal = parseFloat(document.getElementById('gastoSubtotal').value) || 0;
    const ivaPorcentaje = parseInt(document.getElementById('gastoIva').value);
    const categoria = document.getElementById('gastoCategoria').value;
    const pagado = document.getElementById('gastoPagado').value === 'true';
    const descripcion = document.getElementById('gastoDescripcion').value.trim();
    
    const iva = subtotal * (ivaPorcentaje / 100);
    const importeTotal = subtotal + iva;
    
    if (!proveedor || !fecha || subtotal <= 0) {
        mostrarMensaje('Completa los campos obligatorios', 'error');
        return;
    }
    
    mostrarModalCarga('Guardando gasto...');
    
    try {
        if (id) {
            await sb.from('gastos').update({
                numero_factura: numeroFactura,
                fecha: fecha,
                proveedor: proveedor,
                nif_proveedor: nifProveedor,
                subtotal: subtotal,
                iva: iva,
                importe_total: importeTotal,
                categoria: categoria,
                pagado: pagado,
                descripcion: descripcion
            }).eq('id', id);
            mostrarMensaje('✅ Gasto actualizado', 'exito');
        } else {
            await sb.from('gastos').insert({
                numero_factura: numeroFactura,
                fecha: fecha,
                proveedor: proveedor,
                nif_proveedor: nifProveedor,
                subtotal: subtotal,
                iva: iva,
                importe_total: importeTotal,
                categoria: categoria,
                pagado: pagado,
                descripcion: descripcion
            });
            mostrarMensaje('✅ Gasto creado', 'exito');
        }
        
        cerrarModalCarga();
        cerrarModal('modalGasto');
        await cargarGastos();
        renderizarListaGastos();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function eliminarGasto(id, proveedor) {
    if (!confirm(`¿Eliminar gasto de "${proveedor}"?`)) return;
    
    mostrarModalCarga('Eliminando...');
    
    try {
        await sb.from('gastos').delete().eq('id', id);
        cerrarModalCarga();
        mostrarMensaje('✅ Gasto eliminado', 'exito');
        await cargarGastos();
        renderizarListaGastos();
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

function setupFiltros() {
    const desde = document.getElementById('filtroGastoDesde');
    const hasta = document.getElementById('filtroGastoHasta');
    const categoria = document.getElementById('filtroCategoria');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    
    if (desde) desde.onchange = aplicarFiltros;
    if (hasta) hasta.onchange = aplicarFiltros;
    if (categoria) categoria.onchange = aplicarFiltros;
    if (btnLimpiar) btnLimpiar.onclick = limpiarFiltros;
}

function aplicarFiltros() {
    const desde = document.getElementById('filtroGastoDesde')?.value;
    const hasta = document.getElementById('filtroGastoHasta')?.value;
    const categoria = document.getElementById('filtroCategoria')?.value;
    
    gastosFiltrados = gastos.filter(g => {
        if (desde && g.fecha < desde) return false;
        if (hasta && g.fecha > hasta) return false;
        if (categoria && g.categoria !== categoria) return false;
        return true;
    });
    
    renderizarListaGastos();
}

function limpiarFiltros() {
    document.getElementById('filtroGastoDesde').value = '';
    document.getElementById('filtroGastoHasta').value = '';
    document.getElementById('filtroCategoria').value = '';
    gastosFiltrados = [...gastos];
    renderizarListaGastos();
}

function setupEventosGastos() {
    const btnNuevo = document.getElementById('btnNuevoGasto');
    if (btnNuevo) btnNuevo.onclick = abrirModalNuevoGasto;
    
    const btnGuardar = document.getElementById('btnGuardarGasto');
    if (btnGuardar) btnGuardar.onclick = guardarGasto;
    
    const btnCancelar = document.getElementById('btnCancelarGasto');
    if (btnCancelar) btnCancelar.onclick = () => cerrarModal('modalGasto');
    
    const container = document.getElementById('listaGastos');
    if (container) {
        container.onclick = async (e) => {
            const btn = e.target;
            if (btn.classList.contains('editar-gasto')) {
                const gasto = gastos.find(g => g.id === btn.dataset.id);
                if (gasto) {
                    document.getElementById('modalGastoHeader').innerHTML = '✏️ Editar gasto';
                    document.getElementById('gastoId').value = gasto.id;
                    document.getElementById('gastoNumeroFactura').value = gasto.numero_factura || '';
                    document.getElementById('gastoFecha').value = gasto.fecha;
                    document.getElementById('gastoProveedor').value = gasto.proveedor;
                    document.getElementById('gastoNifProveedor').value = gasto.nif_proveedor || '';
                    document.getElementById('gastoSubtotal').value = gasto.subtotal;
                    document.getElementById('gastoIva').value = Math.round((gasto.iva / gasto.subtotal) * 100) || 21;
                    document.getElementById('gastoCategoria').value = gasto.categoria;
                    document.getElementById('gastoPagado').value = gasto.pagado ? 'true' : 'false';
                    document.getElementById('gastoDescripcion').value = gasto.descripcion || '';
                    abrirModal('modalGasto');
                }
            }
            if (btn.classList.contains('eliminar-gasto')) {
                const gasto = gastos.find(g => g.id === btn.dataset.id);
                if (gasto) eliminarGasto(gasto.id, gasto.proveedor);
            }
        };
    }
}

export default { iniciar };