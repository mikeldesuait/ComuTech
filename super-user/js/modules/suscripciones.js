// js/modules/suscripciones.js
// 📅 MÓDULO DE SUSCRIPCIONES Y FACTURACIÓN RECURRENTE

import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let preciosPlanes = {
    BASICO: 49,
    PRO: 99,
    EMPRESA: 199
};

// ============================================================
// INICIALIZAR MÓDULO
// ============================================================

export async function iniciar() {
    console.log('📅 Iniciando módulo de suscripciones');
    
    await cargarConfiguracionPrecios();
    await cargarExtrasGlobales();
    await cargarSuscripciones();
    setupEventos();
}

// ============================================================
// CARGAR CONFIGURACIÓN DE PRECIOS
// ============================================================

async function cargarConfiguracionPrecios() {
    // Primero establecer valores por defecto
    const precioBasico = document.getElementById('precioBasico');
    const precioPro = document.getElementById('precioPro');
    const precioEmpresa = document.getElementById('precioEmpresa');
    
    if (precioBasico) precioBasico.value = preciosPlanes.BASICO;
    if (precioPro) precioPro.value = preciosPlanes.PRO;
    if (precioEmpresa) precioEmpresa.value = preciosPlanes.EMPRESA;
    
    // Intentar cargar desde BD silenciosamente
    try {
        const { data, error } = await sb
            .from('configuracion_facturacion')
            .select('precio_basico, precio_pro, precio_empresa')
            .limit(1)
            .maybeSingle();
        
        if (!error && data) {
            if (data.precio_basico) {
                preciosPlanes.BASICO = data.precio_basico;
                if (precioBasico) precioBasico.value = data.precio_basico;
            }
            if (data.precio_pro) {
                preciosPlanes.PRO = data.precio_pro;
                if (precioPro) precioPro.value = data.precio_pro;
            }
            if (data.precio_empresa) {
                preciosPlanes.EMPRESA = data.precio_empresa;
                if (precioEmpresa) precioEmpresa.value = data.precio_empresa;
            }
        }
    } catch (error) {
        // Silently fail - usar valores por defecto
        console.log('Usando valores por defecto para precios');
    }
}

// ============================================================
// GUARDAR CONFIGURACIÓN DE PRECIOS
// ============================================================

async function guardarPrecios() {
    const nuevosPrecios = {
        precio_basico: parseInt(document.getElementById('precioBasico')?.value) || 49,
        precio_pro: parseInt(document.getElementById('precioPro')?.value) || 99,
        precio_empresa: parseInt(document.getElementById('precioEmpresa')?.value) || 199
    };
    
    // Actualizar valores locales
    preciosPlanes = {
        BASICO: nuevosPrecios.precio_basico,
        PRO: nuevosPrecios.precio_pro,
        EMPRESA: nuevosPrecios.precio_empresa
    };
    
    mostrarMensaje('✅ Precios actualizados localmente', 'exito');
    
    // Intentar guardar en BD (opcional, no bloqueante)
    try {
        const { error } = await sb
            .from('configuracion_facturacion')
            .upsert({
                id: '00000000-0000-0000-0000-000000000001',
                precio_basico: nuevosPrecios.precio_basico,
                precio_pro: nuevosPrecios.precio_pro,
                precio_empresa: nuevosPrecios.precio_empresa,
                updated_at: new Date().toISOString()
            });
        
        if (!error) {
            mostrarMensaje('✅ Precios guardados en servidor', 'exito');
        }
    } catch (error) {
        console.log('No se pudo guardar en BD, pero los valores se actualizaron localmente');
    }
}

// ============================================================
// EXTRAS GLOBALES
// ============================================================

async function cargarExtrasGlobales() {
    console.log('Cargando extras globales...');
    try {
        const { data, error } = await sb
            .from('extras_globales')
            .select('*')
            .order('created_at');
        
        if (error && error.code !== '42P01') throw error;
        
        renderizarExtrasGlobales(data || []);
        
    } catch (error) {
        console.log('Tabla extras_globales no existe aún');
        renderizarExtrasGlobales([]);
    }
}

function renderizarExtrasGlobales(extras) {
    const container = document.getElementById('extrasGlobalesLista');
    if (!container) return;
    
    if (extras.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.8rem;">No hay extras configurados. Agrega servicios adicionales.</p>';
        return;
    }
    
    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${extras.map(e => `
                <div style="background: #f1f5f9; border-radius: 20px; padding: 4px 12px; display: inline-flex; align-items: center; gap: 8px;">
                    <span>${escapeHtml(e.concepto)}</span>
                    <strong>${formatMoney(e.importe)} €</strong>
                    <button class="eliminar-extra-global" data-id="${e.id}" style="background: #c2410c; padding: 2px 6px; font-size: 0.7rem;">✖</button>
                </div>
            `).join('')}
        </div>
    `;
    
    document.querySelectorAll('.eliminar-extra-global').forEach(btn => {
        btn.onclick = () => eliminarExtraGlobal(btn.dataset.id);
    });
}

async function agregarExtraGlobal() {
    const concepto = document.getElementById('nuevoExtraConcepto')?.value.trim();
    const importe = parseFloat(document.getElementById('nuevoExtraImporte')?.value);
    
    if (!concepto) {
        mostrarMensaje('Introduce un concepto', 'error');
        return;
    }
    if (isNaN(importe) || importe <= 0) {
        mostrarMensaje('Introduce un importe válido', 'error');
        return;
    }
    
    mostrarModalCarga('Agregando extra...');
    
    try {
        const { error } = await sb
            .from('extras_globales')
            .insert({ concepto, importe });
        
        if (error) throw error;
        
        document.getElementById('nuevoExtraConcepto').value = '';
        document.getElementById('nuevoExtraImporte').value = '';
        
        cerrarModalCarga();
        mostrarMensaje('✅ Extra agregado', 'exito');
        await cargarExtrasGlobales();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    }
}

async function eliminarExtraGlobal(id) {
    mostrarModalCarga('Eliminando extra...');
    
    try {
        const { error } = await sb
            .from('extras_globales')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        cerrarModalCarga();
        mostrarMensaje('✅ Extra eliminado', 'exito');
        await cargarExtrasGlobales();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// CARGAR SUSCRIPCIONES DE CLIENTES
// ============================================================

async function cargarSuscripciones() {
    console.log('Cargando suscripciones...');
    try {
        // Primera consulta: obtener suscripciones
        const { data: suscripciones, error: errorSusc } = await sb
            .from('suscripciones_clientes')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('📊 Suscripciones:', suscripciones);
        
        if (errorSusc) throw errorSusc;
        
        if (!suscripciones || suscripciones.length === 0) {
            renderizarSuscripciones([]);
            return;
        }
        
        // Segunda consulta: obtener las empresas
        const empresasIds = [...new Set(suscripciones.map(s => s.empresa_id))];
        
        const { data: empresas, error: errorEmp } = await sb
            .from('empresas')
            .select('id, nombre_empresa, nif_cif, email, telefono')
            .in('id', empresasIds);
        
        console.log('📊 Empresas:', empresas);
        
        if (errorEmp) throw errorEmp;
        
        // Combinar datos
        const empresasMap = {};
        if (empresas) {
            empresas.forEach(e => { empresasMap[e.id] = e; });
        }
        
        const suscripcionesConEmpresa = suscripciones.map(s => ({
            ...s,
            empresas: empresasMap[s.empresa_id] || null
        }));
        
        console.log('📊 Combinado:', suscripcionesConEmpresa);
        
        renderizarSuscripciones(suscripcionesConEmpresa);
        
    } catch (error) {
        console.error('Error cargando suscripciones:', error);
        const tbody = document.getElementById('suscripcionesBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#c2410c;">❌ Error: ${error.message}</td></tr>`;
    }
}

function renderizarSuscripciones(suscripciones) {
    const tbody = document.getElementById('suscripcionesBody');
    if (!tbody) return;
    
    if (suscripciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">📭 No hay suscripciones activas</td></tr>';
        return;
    }
    
    tbody.innerHTML = suscripciones.map(s => {
        const empresa = s.empresas || {};
        const extras = s.extras || [];
        
        let totalExtras = 0;
        if (Array.isArray(extras)) {
            extras.forEach(e => {
                if (e.recurrente) totalExtras += e.importe;
            });
        }
        
        const totalMensual = (s.precio_mensual || 0) + totalExtras;
        
        return `
            <tr>
                <td><strong>${escapeHtml(empresa.nombre_empresa || 'Sin nombre')}</strong><br><small>${escapeHtml(empresa.nif_cif || 'Sin NIF')}</small></td>
                <td>${getBadgePlan(s.plan)}</td>
                <td>${formatMoney(s.precio_mensual)} €</td>
                <td>${renderizarExtrasCliente(extras)}</td>
                <td><strong>${formatMoney(totalMensual)} €</strong></td>
                <td><input type="number" value="${s.dia_cobro || 1}" min="1" max="28" style="width: 60px;" class="dia-cobro" data-id="${s.id}"></td>
                <td>${getBadgeEstadoSuscripcion(s.estado)}</td>
                <td class="acciones">
                    <button class="btn-sm editar-extras" data-id="${s.id}" data-nombre="${escapeHtml(empresa.nombre_empresa)}" data-extras='${JSON.stringify(extras)}'>➕ Extras</button>
                    <button class="btn-sm cambiar-plan" data-id="${s.id}" data-plan="${s.plan}">🏷️ Plan</button>
                    ${s.estado === 'activa' ? 
                        `<button class="btn-sm cancelar-suscripcion" data-id="${s.id}" data-nombre="${escapeHtml(empresa.nombre_empresa)}" style="background: #c2410c;">❌ Cancelar</button>` : 
                        `<button class="btn-sm activar-suscripcion" data-id="${s.id}" data-nombre="${escapeHtml(empresa.nombre_empresa)}" style="background: #2c7a4d;">✅ Activar</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    // Eventos de la tabla
    document.querySelectorAll('.dia-cobro').forEach(input => {
        input.onchange = async () => {
            const id = input.dataset.id;
            const dia = parseInt(input.value);
            if (dia >= 1 && dia <= 28) {
                await sb.from('suscripciones_clientes').update({ dia_cobro: dia }).eq('id', id);
                mostrarMensaje('✅ Día de cobro actualizado', 'exito');
            } else {
                mostrarMensaje('Día inválido (1-28)', 'error');
                input.value = 1;
            }
        };
    });
    
    document.querySelectorAll('.editar-extras').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;
            const extras = JSON.parse(btn.dataset.extras || '[]');
            abrirModalExtrasCliente(id, nombre, extras);
        };
    });
    
    document.querySelectorAll('.cambiar-plan').forEach(btn => {
        btn.onclick = () => abrirModalCambiarPlan(btn.dataset.id, btn.dataset.plan);
    });
    
    document.querySelectorAll('.cancelar-suscripcion').forEach(btn => {
        btn.onclick = () => cancelarSuscripcion(btn.dataset.id, btn.dataset.nombre);
    });
    
    document.querySelectorAll('.activar-suscripcion').forEach(btn => {
        btn.onclick = () => activarSuscripcion(btn.dataset.id, btn.dataset.nombre);
    });
}

function renderizarExtrasCliente(extras) {
    if (!extras || extras.length === 0) return '-';
    return extras.map(e => `
        <span style="background:#f1f5f9; border-radius:12px; padding:2px 8px; margin:2px; font-size:0.7rem; display:inline-block;">
            ${escapeHtml(e.concepto)} ${formatMoney(e.importe)}€ ${e.recurrente ? '🔄' : '📌'}
        </span>
    `).join('');
}

// ============================================================
// MODAL EXTRAS POR CLIENTE
// ============================================================

let suscripcionExtrasActual = null;

function abrirModalExtrasCliente(suscripcionId, nombreCliente, extrasActuales) {
    suscripcionExtrasActual = { id: suscripcionId, extras: [...extrasActuales] };
    
    const modal = document.getElementById('modalExtrasCliente');
    const nombreSpan = document.getElementById('modalExtrasClienteNombre');
    
    if (!modal) return;
    
    if (nombreSpan) nombreSpan.innerHTML = `<strong>${escapeHtml(nombreCliente)}</strong> - Extras personalizados`;
    
    renderizarExtrasClienteModal(suscripcionExtrasActual.extras);
    
    abrirModal('modalExtrasCliente');
}

function renderizarExtrasClienteModal(extras) {
    const listaDiv = document.getElementById('extrasClienteLista');
    if (!listaDiv) return;
    
    if (extras.length === 0) {
        listaDiv.innerHTML = '<p style="color: #94a3b8;">No hay extras para este cliente</p>';
        return;
    }
    
    listaDiv.innerHTML = extras.map((e, idx) => `
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 8px; border-radius: 8px;">
            <span style="flex: 2;">${escapeHtml(e.concepto)}</span>
            <span style="width: 80px;">${formatMoney(e.importe)} €</span>
            <span style="width: 80px;">${e.recurrente ? '🔄 Recurrente' : '📌 Puntual'}</span>
            <button class="eliminar-extra-cliente" data-index="${idx}" style="background: #c2410c; padding: 4px 8px;">✖</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.eliminar-extra-cliente').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            suscripcionExtrasActual.extras.splice(idx, 1);
            renderizarExtrasClienteModal(suscripcionExtrasActual.extras);
        };
    });
}

async function guardarExtrasCliente() {
    if (!suscripcionExtrasActual) return;
    
    mostrarModalCarga('Guardando extras...');
    
    try {
        const { error } = await sb
            .from('suscripciones_clientes')
            .update({ extras: suscripcionExtrasActual.extras })
            .eq('id', suscripcionExtrasActual.id);
        
        if (error) throw error;
        
        cerrarModalCarga();
        cerrarModal('modalExtrasCliente');
        mostrarMensaje('✅ Extras guardados correctamente', 'exito');
        await cargarSuscripciones();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    }
}

function agregarExtraCliente() {
    const concepto = document.getElementById('extraClienteConcepto')?.value.trim();
    const importe = parseFloat(document.getElementById('extraClienteImporte')?.value);
    const recurrente = document.getElementById('extraClienteRecurrente')?.checked || false;
    
    if (!concepto) {
        mostrarMensaje('Introduce un concepto', 'error');
        return;
    }
    if (isNaN(importe) || importe <= 0) {
        mostrarMensaje('Introduce un importe válido', 'error');
        return;
    }
    
    suscripcionExtrasActual.extras.push({ concepto, importe, recurrente });
    
    document.getElementById('extraClienteConcepto').value = '';
    document.getElementById('extraClienteImporte').value = '';
    document.getElementById('extraClienteRecurrente').checked = false;
    
    renderizarExtrasClienteModal(suscripcionExtrasActual.extras);
}

// ============================================================
// MODAL CAMBIAR PLAN
// ============================================================

function abrirModalCambiarPlan(suscripcionId, planActual) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">🏷️ Cambiar plan</div>
            <div class="modal-body">
                <label>Plan actual: <strong>${planActual}</strong></label>
                <select id="nuevoPlanSelect" style="width: 100%; margin-top: 16px; padding: 10px;">
                    <option value="BASICO" ${planActual === 'BASICO' ? 'selected' : ''}>📒 Básico (${preciosPlanes.BASICO}€/mes)</option>
                    <option value="PRO" ${planActual === 'PRO' ? 'selected' : ''}>📘 Pro (${preciosPlanes.PRO}€/mes)</option>
                    <option value="EMPRESA" ${planActual === 'EMPRESA' ? 'selected' : ''}>📕 Empresa (${preciosPlanes.EMPRESA}€/mes)</option>
                </select>
            </div>
            <div class="btn-group" style="margin-top: 20px;">
                <button id="btnConfirmarCambioPlan" class="btn-success">✅ Confirmar</button>
                <button id="btnCancelarCambioPlan" class="btn-danger">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    document.getElementById('btnConfirmarCambioPlan').onclick = async () => {
        const nuevoPlan = document.getElementById('nuevoPlanSelect').value;
        const nuevoPrecio = preciosPlanes[nuevoPlan];
        
        mostrarModalCarga('Cambiando plan...');
        
        const { error } = await sb
            .from('suscripciones_clientes')
            .update({ plan: nuevoPlan, precio_mensual: nuevoPrecio })
            .eq('id', suscripcionId);
        
        cerrarModalCarga();
        
        if (error) {
            mostrarMensaje('❌ Error: ' + error.message, 'error');
        } else {
            mostrarMensaje(`✅ Plan cambiado a ${nuevoPlan}`, 'exito');
            modal.remove();
            await cargarSuscripciones();
        }
    };
    
    document.getElementById('btnCancelarCambioPlan').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ============================================================
// CANCELAR / ACTIVAR SUSCRIPCIÓN
// ============================================================

async function cancelarSuscripcion(id, nombre) {
    if (!confirm(`¿Cancelar suscripción de "${nombre}"? Dejará de generar facturas mensuales.`)) return;
    
    mostrarModalCarga('Cancelando suscripción...');
    
    const { error } = await sb
        .from('suscripciones_clientes')
        .update({ estado: 'cancelada', fecha_fin: new Date().toISOString().split('T')[0] })
        .eq('id', id);
    
    cerrarModalCarga();
    
    if (error) {
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    } else {
        mostrarMensaje(`✅ Suscripción de "${nombre}" cancelada`, 'exito');
        await cargarSuscripciones();
    }
}

async function activarSuscripcion(id, nombre) {
    mostrarModalCarga('Activando suscripción...');
    
    const { error } = await sb
        .from('suscripciones_clientes')
        .update({ estado: 'activa', fecha_fin: null })
        .eq('id', id);
    
    cerrarModalCarga();
    
    if (error) {
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    } else {
        mostrarMensaje(`✅ Suscripción de "${nombre}" activada`, 'exito');
        await cargarSuscripciones();
    }
}

// ============================================================
// GENERAR FACTURAS MANUALMENTE
// ============================================================

async function generarFacturasAhora() {
    mostrarModalCarga('Generando facturas...');
    
    try {
        const { error } = await sb.rpc('generar_facturas_mensuales');
        
        cerrarModalCarga();
        
        if (error) {
            mostrarMensaje('❌ Error: ' + error.message, 'error');
        } else {
            mostrarMensaje('✅ Facturas generadas correctamente', 'exito');
            await cargarSuscripciones();
        }
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// BADGES
// ============================================================

function getBadgePlan(plan) {
    const badges = {
        'BASICO': '<span class="badge badge-basico">📒 Básico</span>',
        'PRO': '<span class="badge badge-pro">📘 Pro</span>',
        'EMPRESA': '<span class="badge badge-empresa-plan">📕 Empresa</span>'
    };
    return badges[plan] || badges['BASICO'];
}

function getBadgeEstadoSuscripcion(estado) {
    const badges = {
        'activa': '<span class="badge badge-activo">✅ Activa</span>',
        'cancelada': '<span class="badge badge-inactivo">❌ Cancelada</span>',
        'suspendida': '<span class="badge badge-inactivo">⏸️ Suspendida</span>'
    };
    return badges[estado] || badges['cancelada'];
}

// ============================================================
// EVENTOS GLOBALES
// ============================================================

function setupEventos() {
    const btnGuardarPrecios = document.getElementById('btnGuardarPrecios');
    if (btnGuardarPrecios) btnGuardarPrecios.onclick = guardarPrecios;
    
    const btnAgregarExtraGlobal = document.getElementById('btnAgregarExtraGlobal');
    if (btnAgregarExtraGlobal) btnAgregarExtraGlobal.onclick = agregarExtraGlobal;
    
    const btnGenerarFacturasAhora = document.getElementById('btnGenerarFacturasAhora');
    if (btnGenerarFacturasAhora) btnGenerarFacturasAhora.onclick = generarFacturasAhora;
    
    const btnGuardarExtrasCliente = document.getElementById('btnGuardarExtrasCliente');
    if (btnGuardarExtrasCliente) btnGuardarExtrasCliente.onclick = guardarExtrasCliente;
    
    const btnCancelarExtrasCliente = document.getElementById('btnCancelarExtrasCliente');
    if (btnCancelarExtrasCliente) btnCancelarExtrasCliente.onclick = () => cerrarModal('modalExtrasCliente');
    
    const btnAgregarExtraCliente = document.getElementById('btnAgregarExtraCliente');
    if (btnAgregarExtraCliente) btnAgregarExtraCliente.onclick = agregarExtraCliente;
}

// ============================================================
// EXPORTAR
// ============================================================

export default {
    iniciar
};