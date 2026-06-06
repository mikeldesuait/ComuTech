// js/modules/clientes.js
// 📋 LÓGICA PRINCIPAL DE LA HABITACIÓN DE CLIENTES

import { sb } from './supabase.js'
import { mostrarMensaje, escapeHtml, formatMoney } from './utils.js'
import { abrirModalElegirTipoCliente, mostrarModalCarga, cerrarModalCarga } from './modales/modalesGenerales.js'

// ============================================================
// VARIABLES PRIVADAS
// ============================================================

let clientes = []
let clientesFiltrados = []

// ============================================================
// FUNCIONES AUXILIARES DE BADGES
// ============================================================

function getBadgePlanClass(plan) {
    const classes = {
        'BASICO': 'badge-basico',
        'PRO': 'badge-pro',
        'EMPRESA': 'badge-empresa-plan'
    }
    return classes[plan] || 'badge-basico'
}

function getBadgePlanTexto(plan) {
    const textos = {
        'BASICO': '📒 Básico',
        'PRO': '📘 Pro',
        'EMPRESA': '📕 Empresa'
    }
    return textos[plan] || 'BASICO'
}

// ============================================================
// RENDERIZAR CLIENTES (MODO MÓVIL - CARDS)
// ============================================================

function renderizarClientes() {
    const container = document.getElementById('listaClientes')
    if (!container) return

    if (!clientesFiltrados || clientesFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--ios-gray);">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>No hay clientes que coincidan</p>
            </div>
        `
        return
    }

    container.innerHTML = clientesFiltrados.map(cliente => `
        <div class="cliente-card" data-id="${cliente.id}">
            <div class="cliente-header">
                <div>
                    <div class="cliente-nombre">${escapeHtml(cliente.nombre_empresa || 'Sin nombre')}</div>
                    <div class="cliente-nif">${escapeHtml(cliente.nif_cif || 'Sin NIF')}</div>
                </div>
                <div class="cliente-actions">
                    <button class="action-btn ver-cliente" data-id="${cliente.id}" title="Ver">👁️</button>
                    <button class="action-btn editar-cliente" data-id="${cliente.id}" title="Editar">✏️</button>
                    <button class="action-btn documentos-cliente" data-id="${cliente.id}" data-nombre="${escapeHtml(cliente.nombre_empresa)}" title="Documentación legal">📋</button>
                    <button class="action-btn resumen-cliente" data-id="${cliente.id}" data-nombre="${escapeHtml(cliente.nombre_empresa)}" title="Resumen financiero">💰</button>
                    <button class="action-btn eliminar-cliente" data-id="${cliente.id}" title="Eliminar">🗑️</button>
                </div>
            </div>
            <div class="cliente-contacto">
                <span>📧 ${escapeHtml(cliente.contacto_email || cliente.email || '-')}</span>
                <span>📱 ${escapeHtml(cliente.telefono || '-')}</span>
            </div>
            <div class="cliente-badges">
                <span class="badge ${getBadgePlanClass(cliente.plan)}">${getBadgePlanTexto(cliente.plan)}</span>
                <span class="badge ${cliente.activo ? 'badge-activo' : 'badge-inactivo'}">
                    ${cliente.activo ? '✅ Activo' : '❌ Inactivo'}
                </span>
                <span class="badge ${cliente.consentimiento ? 'badge-activo' : 'badge-inactivo'}">
                    ${cliente.consentimiento ? '📜 RGPD ✅' : '📜 RGPD ❌'}
                </span>
            </div>
        </div>
    `).join('')
}

// ============================================================
// CARGAR CLIENTES DESDE SUPABASE
// ============================================================

export async function cargarClientes() {
    try {
        const { data: empresas, error } = await sb.from('empresas')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        clientes = empresas || []

        for (const cliente of clientes) {
            const { data: perfil } = await sb.from('perfiles')
                .select('nombre_razon_social, email, telefono, consentimiento_tratamiento_datos, id')
                .eq('empresa_id', cliente.id)
                .eq('rol', 'gerente')
                .maybeSingle()

            const { data: suscripcion } = await sb.from('suscripciones_clientes')
                .select('plan')
                .eq('empresa_id', cliente.id)
                .eq('estado', 'activa')
                .maybeSingle()

            cliente.contacto_nombre = perfil?.nombre_razon_social || ''
            cliente.contacto_email = perfil?.email || cliente.email || ''
            cliente.consentimiento = perfil?.consentimiento_tratamiento_datos || false
            cliente.perfil_id = perfil?.id || null
            cliente.plan = suscripcion?.plan || 'BASICO'
        }

        actualizarFiltroProvincias()
        aplicarFiltros()

    } catch (error) {
        console.error('Error cargando clientes:', error)
        mostrarMensaje('Error cargando clientes: ' + error.message, 'error')
    }
}

// ============================================================
// FILTROS
// ============================================================

function actualizarFiltroProvincias() {
    const provincias = [...new Set(clientes.map(c => c.provincia).filter(p => p))]
    const selectProvincia = document.getElementById('filtroProvincia')
    
    if (selectProvincia) {
        selectProvincia.innerHTML = '<option value="">Todas</option>' +
            provincias.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')
    }
}

function aplicarFiltros() {
    const busqueda = document.getElementById('buscadorCliente')?.value.toLowerCase() || ''
    const plan = document.getElementById('filtroPlan')?.value || ''
    const estado = document.getElementById('filtroEstado')?.value || ''
    const provincia = document.getElementById('filtroProvincia')?.value || ''

    clientesFiltrados = clientes.filter(cliente => {
        if (busqueda) {
            const textoBuscar = `${cliente.nombre_empresa} ${cliente.nif_cif} ${cliente.contacto_email} ${cliente.contacto_nombre}`.toLowerCase()
            if (!textoBuscar.includes(busqueda)) return false
        }
        
        if (plan && cliente.plan !== plan) return false
        if (estado === 'activo' && !cliente.activo) return false
        if (estado === 'inactivo' && cliente.activo) return false
        if (provincia && cliente.provincia !== provincia) return false
        
        return true
    })

    renderizarClientes()
}

// ============================================================
// RESUMEN FINANCIERO DEL CLIENTE
// ============================================================

async function abrirResumenCliente(clienteId, clienteNombre) {
    mostrarModalCarga('Cargando resumen financiero...');
    
    try {
        // Obtener todas las facturas del cliente
        const { data: facturas, error: facturasError } = await sb
            .from('facturas')
            .select('*')
            .eq('empresa_id', clienteId)
            .order('fecha_expedicion', { ascending: false });
        
        if (facturasError) throw facturasError;
        
        // Obtener todos los cobros del cliente
        const { data: cobros, error: cobrosError } = await sb
            .from('cobros_clientes')
            .select('*')
            .eq('empresa_id', clienteId)
            .order('fecha_cobro', { ascending: false });
        
        if (cobrosError) throw cobrosError;
        
        // Calcular totales
        let totalFacturado = 0;
        let totalCobrado = 0;
        let facturasPagadas = 0;
        let facturasPendientes = 0;
        let facturasParciales = 0;
        let facturasRectificativas = 0;
        
        facturas?.forEach(f => {
            totalFacturado += f.importe_total;
            totalCobrado += f.total_cobrado || 0;
            
            if (f.tipo_rectificativa) facturasRectificativas++;
            else if (f.estado === 'pagada') facturasPagadas++;
            else if (f.estado === 'parcial') facturasParciales++;
            else if (f.estado === 'pendiente') facturasPendientes++;
        });
        
        const saldoPendiente = totalFacturado - totalCobrado;
        
        // Generar HTML del modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header">💰 Resumen financiero - ${escapeHtml(clienteNombre)}</div>
                
                <!-- Botones de acción -->
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px;">
                    <button id="btnNuevaFacturaCliente" class="btn-success" style="padding: 6px 12px;">➕ Nueva factura</button>
                    <button id="btnVerFacturasCliente" class="btn-info" style="padding: 6px 12px;">📋 Ver todas</button>
                    <button id="btnCerrarResumen" class="btn-danger" style="padding: 6px 12px;">✖ Cerrar</button>
                </div>
                
                <!-- Tarjetas de resumen -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #166534;">${formatMoney(totalFacturado)}€</div>
                        <div style="font-size: 12px; color: #166534;">Total facturado</div>
                    </div>
                    <div style="background: #dbeafe; padding: 16px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${formatMoney(totalCobrado)}€</div>
                        <div style="font-size: 12px; color: #1e40af;">Total cobrado</div>
                    </div>
                    <div style="background: ${saldoPendiente > 0 ? '#fef3c7' : '#f0fdf4'}; padding: 16px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: ${saldoPendiente > 0 ? '#92400e' : '#166534'};">${formatMoney(saldoPendiente)}€</div>
                        <div style="font-size: 12px; color: ${saldoPendiente > 0 ? '#92400e' : '#166534'};">Saldo pendiente</div>
                    </div>
                </div>
                
                <!-- Estadísticas -->
                <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                    <div class="badge badge-activo">📄 Facturas: ${facturas?.length || 0}</div>
                    <div class="badge badge-activo">✅ Pagadas: ${facturasPagadas}</div>
                    <div class="badge" style="background: #fef3c7;">💰 Parciales: ${facturasParciales}</div>
                    <div class="badge badge-inactivo">⏳ Pendientes: ${facturasPendientes}</div>
                    ${facturasRectificativas > 0 ? `<div class="badge" style="background: #fef3c7;">🔄 Rectificativas: ${facturasRectificativas}</div>` : ''}
                </div>
                
                <!-- Lista de facturas -->
                <div class="card-header">📋 Facturas</div>
                <div style="max-height: 300px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: #f1f5f9;">
                            <tr>
                                <th style="text-align: left; padding: 8px;">Nº Factura</th>
                                <th style="text-align: left; padding: 8px;">Fecha</th>
                                <th style="text-align: right; padding: 8px;">Importe</th>
                                <th style="text-align: right; padding: 8px;">Cobrado</th>
                                <th style="text-align: center; padding: 8px;">Estado</th>
                                <th style="text-align: center; padding: 8px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${facturas?.map(f => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px;">${escapeHtml(f.numero_factura)}</td>
                                    <td style="padding: 8px;">${new Date(f.fecha_expedicion).toLocaleDateString()}</td>
                                    <td style="text-align: right; padding: 8px;">${formatMoney(f.importe_total)}€</td>
                                    <td style="text-align: right; padding: 8px;">${formatMoney(f.total_cobrado || 0)}€</td>
                                    <td style="text-align: center; padding: 8px;">
                                        <span class="badge ${f.estado === 'pagada' ? 'badge-activo' : (f.estado === 'parcial' ? 'badge-warning' : 'badge-inactivo')}">
                                            ${f.estado === 'pagada' ? '✅ Pagada' : (f.estado === 'parcial' ? '💰 Parcial' : '⏳ Pendiente')}
                                        </span>
                                    </td>
                                    <td style="text-align: center; padding: 8px;">
                                        <button class="ver-factura-resumen btn-sm" data-id="${f.id}" style="background: #0284c7; color: white;">👁️</button>
                                        ${(f.saldo_cobro > 0 || f.estado === 'pendiente') ? `<button class="cobro-rapido-resumen btn-sm" data-id="${f.id}" style="background: #10b981; color: white;">💵</button>` : ''}
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" style="text-align:center;">No hay facturas</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <!-- Historial de cobros -->
                <div class="card-header">💳 Historial de cobros</div>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: #f1f5f9;">
                            <tr>
                                <th style="text-align: left; padding: 8px;">Fecha</th>
                                <th style="text-align: right; padding: 8px;">Importe</th>
                                <th style="text-align: left; padding: 8px;">Forma</th>
                                <th style="text-align: left; padding: 8px;">Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cobros?.map(c => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px;">${new Date(c.fecha_cobro).toLocaleDateString()}</td>
                                    <td style="text-align: right; padding: 8px;">${formatMoney(c.importe)}€</td>
                                    <td style="padding: 8px;">${c.forma_pago}</td>
                                    <td style="padding: 8px;">${escapeHtml(c.referencia || '-')}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" style="text-align:center;">No hay cobros registrados</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Evento: Nueva factura
        document.getElementById('btnNuevaFacturaCliente').onclick = () => {
            modal.remove();
            // Cambiar a pestaña facturación y abrir nueva factura
            const tabFacturacion = document.querySelector('.tab-btn[data-tab="facturacion"]');
            if (tabFacturacion) tabFacturacion.click();
            setTimeout(() => {
                const btnNueva = document.getElementById('btnNuevaFactura');
                if (btnNueva) btnNueva.click();
            }, 500);
        };
        
        // Evento: Ver todas las facturas
        document.getElementById('btnVerFacturasCliente').onclick = () => {
            modal.remove();
            const tabFacturacion = document.querySelector('.tab-btn[data-tab="facturacion"]');
            if (tabFacturacion) tabFacturacion.click();
            setTimeout(() => {
                const inputCliente = document.getElementById('buscadorClienteFactura');
                const hiddenId = document.getElementById('clienteSeleccionadoId');
                if (inputCliente) {
                    inputCliente.value = clienteNombre;
                    hiddenId.value = clienteId;
                    if (typeof aplicarFiltrosFacturacion !== 'undefined') {
                        aplicarFiltrosFacturacion();
                    }
                }
            }, 500);
        };
        
        // Evento: Cerrar
        document.getElementById('btnCerrarResumen').onclick = () => modal.remove();
        
        // Eventos: Ver factura
        modal.querySelectorAll('.ver-factura-resumen').forEach(btn => {
            btn.onclick = async () => {
                const facturaId = btn.dataset.id;
                modal.remove();
                // Importar y llamar a verFactura desde facturacion.js
                const { verFactura } = await import('./facturacion.js');
                if (verFactura) await verFactura(facturaId);
            };
        });
        
        // Eventos: Cobro rápido
        modal.querySelectorAll('.cobro-rapido-resumen').forEach(btn => {
            btn.onclick = async () => {
                const facturaId = btn.dataset.id;
                modal.remove();
                const { abrirModalRegistrarCobro } = await import('./facturacion.js');
                if (abrirModalRegistrarCobro) await abrirModalRegistrarCobro(facturaId);
            };
        });
        
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        cerrarModalCarga();
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

// ============================================================
// EVENTOS DE LOS BOTONES
// ============================================================

function setupEventosTabla() {
    const container = document.getElementById('moduloContainer')
    if (!container) return

    container.onclick = async (e) => {
        const btn = e.target
        
        if (btn.classList.contains('ver-cliente')) {
            e.preventDefault()
            const cliente = clientes.find(c => c.id === btn.dataset.id)
            if (cliente) {
                const { abrirModalVerCliente } = await import('./modales/modalesVision.js')
                abrirModalVerCliente(cliente)
            }
        }
        
        else if (btn.classList.contains('editar-cliente')) {
            e.preventDefault()
            const cliente = clientes.find(c => c.id === btn.dataset.id)
            if (cliente) {
                if (cliente.tipo_cliente === 'autonomo') {
                    const { abrirModalEditarAutonomo } = await import('./modales/modalesEdicionAutonomo.js')
                    abrirModalEditarAutonomo(cliente)
                } else {
                    const { abrirModalEditarEmpresa } = await import('./modales/modalesEdicionEmpresa.js')
                    abrirModalEditarEmpresa(cliente)
                }
            }
        }
        
        else if (btn.classList.contains('eliminar-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const nombre = btn.dataset.nombre
            const cliente = clientes.find(c => c.id === id)
            const nombreCliente = cliente?.nombre_empresa || nombre
            const { abrirModalEliminarCliente } = await import('./modales/modalesEliminacion.js')
            abrirModalEliminarCliente(id, nombreCliente)
        }
        
        else if (btn.classList.contains('documentos-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const nombre = btn.dataset.nombre
            const { descargarDocumentacionCliente } = await import('./generarPDF.js')
            descargarDocumentacionCliente(id, nombre)
        }
        
        else if (btn.classList.contains('resumen-cliente')) {
            e.preventDefault()
            const id = btn.dataset.id
            const nombre = btn.dataset.nombre
            await abrirResumenCliente(id, nombre)
        }
    }
}

// ============================================================
// INICIALIZAR MÓDULO
// ============================================================

export async function iniciar() {
    console.log('🚀 Iniciando habitación de clientes')
    
    await cargarClientes()
    setupEventosTabla()
    
    const buscador = document.getElementById('buscadorCliente')
    const filtroPlan = document.getElementById('filtroPlan')
    const filtroEstado = document.getElementById('filtroEstado')
    const filtroProvincia = document.getElementById('filtroProvincia')
    
    if (buscador) buscador.addEventListener('input', aplicarFiltros)
    if (filtroPlan) filtroPlan.addEventListener('change', aplicarFiltros)
    if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros)
    if (filtroProvincia) filtroProvincia.addEventListener('change', aplicarFiltros)
    
    const btnNuevo = document.getElementById('btnNuevoCliente')
    if (btnNuevo) {
        btnNuevo.onclick = async () => {
            const { abrirModalElegirTipoCliente } = await import('./modales/modalesGenerales.js')
            abrirModalElegirTipoCliente()
        }
    }
}

// ============================================================
// EXPORTAR FUNCIONES PÚBLICAS
// ============================================================

export default {
    iniciar,
    cargarClientes
}