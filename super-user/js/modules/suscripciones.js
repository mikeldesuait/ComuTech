// js/modules/suscripciones.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let preciosPlanes = { BASICO: 49, PRO: 99, EMPRESA: 199 };

export async function iniciar() {
    console.log('📅 Iniciando módulo de suscripciones');
    await cargarConfiguracionPrecios();
    await cargarExtrasGlobales();
    await cargarSuscripciones();
    setupEventos();
}

async function cargarConfiguracionPrecios() {
    const precioBasico = document.getElementById('precioBasico');
    const precioPro = document.getElementById('precioPro');
    const precioEmpresa = document.getElementById('precioEmpresa');
    if (precioBasico) precioBasico.value = preciosPlanes.BASICO;
    if (precioPro) precioPro.value = preciosPlanes.PRO;
    if (precioEmpresa) precioEmpresa.value = preciosPlanes.EMPRESA;
    try {
        const { data } = await sb.from('configuracion_facturacion').select('precio_basico, precio_pro, precio_empresa').limit(1).maybeSingle();
        if (data) {
            if (data.precio_basico) preciosPlanes.BASICO = data.precio_basico;
            if (data.precio_pro) preciosPlanes.PRO = data.precio_pro;
            if (data.precio_empresa) preciosPlanes.EMPRESA = data.precio_empresa;
            if (precioBasico) precioBasico.value = preciosPlanes.BASICO;
            if (precioPro) precioPro.value = preciosPlanes.PRO;
            if (precioEmpresa) precioEmpresa.value = preciosPlanes.EMPRESA;
        }
    } catch (e) { console.log('Usando valores por defecto'); }
}

async function guardarPrecios() {
    const nuevosPrecios = {
        precio_basico: parseInt(document.getElementById('precioBasico')?.value) || 49,
        precio_pro: parseInt(document.getElementById('precioPro')?.value) || 99,
        precio_empresa: parseInt(document.getElementById('precioEmpresa')?.value) || 199
    };
    preciosPlanes = { BASICO: nuevosPrecios.precio_basico, PRO: nuevosPrecios.precio_pro, EMPRESA: nuevosPrecios.precio_empresa };
    mostrarMensaje('✅ Precios actualizados', 'exito');
    try {
        await sb.from('configuracion_facturacion').upsert({ id: '00000000-0000-0000-0000-000000000001', ...nuevosPrecios, updated_at: new Date().toISOString() });
    } catch (e) { console.log('No se guardó en BD'); }
}

async function cargarExtrasGlobales() {
    try {
        const { data } = await sb.from('extras_globales').select('*').order('created_at');
        renderizarExtrasGlobales(data || []);
    } catch (e) { renderizarExtrasGlobales([]); }
}

function renderizarExtrasGlobales(extras) {
    const container = document.getElementById('extrasGlobalesLista');
    if (!container) return;
    if (!extras.length) { container.innerHTML = '<p style="color:gray;">No hay extras</p>'; return; }
    let html = '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
    extras.forEach(e => {
        html += `<div class="badge" style="background:#f1f5f9;">${escapeHtml(e.concepto)} ${formatMoney(e.importe)}€ <button class="eliminar-extra-global" data-id="${e.id}" style="background:none; border:none; color:red; cursor:pointer;">✖</button></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.eliminar-extra-global').forEach(btn => btn.onclick = () => eliminarExtraGlobal(btn.dataset.id));
}

async function agregarExtraGlobal() {
    const concepto = document.getElementById('nuevoExtraConcepto')?.value.trim();
    const importe = parseFloat(document.getElementById('nuevoExtraImporte')?.value);
    if (!concepto || isNaN(importe) || importe <= 0) return mostrarMensaje('Datos inválidos', 'error');
    mostrarModalCarga('Agregando...');
    try {
        await sb.from('extras_globales').insert({ concepto, importe });
        document.getElementById('nuevoExtraConcepto').value = '';
        document.getElementById('nuevoExtraImporte').value = '';
        cerrarModalCarga();
        mostrarMensaje('✅ Extra agregado', 'exito');
        await cargarExtrasGlobales();
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

async function eliminarExtraGlobal(id) {
    mostrarModalCarga('Eliminando...');
    try {
        await sb.from('extras_globales').delete().eq('id', id);
        cerrarModalCarga();
        mostrarMensaje('✅ Extra eliminado', 'exito');
        await cargarExtrasGlobales();
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

async function cargarSuscripciones() {
    const container = document.getElementById('suscripcionesLista');
    if (!container) return;
    try {
        const { data: suscripciones } = await sb.from('suscripciones_clientes').select('*').order('created_at', { ascending: false });
        if (!suscripciones || !suscripciones.length) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:gray;">📭 No hay suscripciones</div>';
            return;
        }
        const empresasIds = [];
        suscripciones.forEach(s => { if (!empresasIds.includes(s.empresa_id)) empresasIds.push(s.empresa_id); });
        const { data: empresas } = await sb.from('empresas').select('id, nombre_empresa, nif_cif').in('id', empresasIds);
        const empresasMap = {};
        empresas?.forEach(e => { empresasMap[e.id] = e; });
        let html = '';
        for (const s of suscripciones) {
            const empresa = empresasMap[s.empresa_id] || {};
            const extras = s.extras || [];
            let totalExtras = 0;
            extras.forEach(e => { if (e.recurrente) totalExtras += e.importe; });
            html += `
                <div class="cliente-card">
                    <div class="cliente-header">
                        <div>
                            <div class="cliente-nombre">${escapeHtml(empresa.nombre_empresa || 'Sin nombre')}</div>
                            <div class="cliente-nif">${escapeHtml(empresa.nif_cif || 'Sin NIF')}</div>
                        </div>
                        <div class="cliente-actions">
                            <button class="editar-extras action-btn" data-id="${s.id}" data-extras='${JSON.stringify(extras)}' data-nombre="${escapeHtml(empresa.nombre_empresa)}" title="Extras">➕</button>
                            <button class="cambiar-plan action-btn" data-id="${s.id}" data-plan="${s.plan}" title="Cambiar plan">🏷️</button>
                            ${s.estado === 'activa' ? 
                                `<button class="cancelar-suscripcion action-btn" data-id="${s.id}" data-nombre="${escapeHtml(empresa.nombre_empresa)}" title="Cancelar" style="color:var(--ios-red);">❌</button>` : 
                                `<button class="activar-suscripcion action-btn" data-id="${s.id}" data-nombre="${escapeHtml(empresa.nombre_empresa)}" title="Activar" style="color:var(--ios-green);">✅</button>`}
                        </div>
                    </div>
                    <div class="cliente-contacto">
                        <span>💰 ${formatMoney(s.precio_mensual)} €/mes</span>
                        <span>📅 Día ${s.dia_cobro || 1}</span>
                        <span>📌 ${s.plan}</span>
                    </div>
                    <div class="cliente-badges">
                        ${extras.map(e => `<span class="badge">${escapeHtml(e.concepto)} ${formatMoney(e.importe)}€ ${e.recurrente ? '🔄' : '📌'}</span>`).join('')}
                        ${!extras.length ? '<span class="badge">Sin extras</span>' : ''}
                        <span class="badge ${s.estado === 'activa' ? 'badge-activo' : 'badge-inactivo'}">${s.estado === 'activa' ? 'Activa' : 'Cancelada'}</span>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        
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
    } catch (e) { console.error(e); container.innerHTML = '<div style="text-align:center; padding:40px; color:red;">❌ Error</div>'; }
}

let suscripcionExtrasActual = null;

function abrirModalExtrasCliente(id, nombre, extras) {
    suscripcionExtrasActual = { id, extras: [...extras] };
    document.getElementById('modalExtrasClienteNombre').innerHTML = `<strong>${escapeHtml(nombre)}</strong>`;
    renderizarExtrasClienteModal(extras);
    abrirModal('modalExtrasCliente');
}

function renderizarExtrasClienteModal(extras) {
    const container = document.getElementById('extrasClienteLista');
    if (!container) return;
    if (!extras.length) { container.innerHTML = '<p>No hay extras</p>'; return; }
    let html = '';
    extras.forEach((e, i) => {
        html += `
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px; background:var(--ios-bg); padding:8px; border-radius:12px;">
                <span style="flex:2">${escapeHtml(e.concepto)}</span>
                <span>${formatMoney(e.importe)}€</span>
                <span>${e.recurrente ? '🔄' : '📌'}</span>
                <button class="eliminar-extra-cliente" data-index="${i}" style="background:var(--ios-red); border:none; color:white; padding:4px 8px; border-radius:20px;">✖</button>
            </div>
        `;
    });
    container.innerHTML = html;
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
    mostrarModalCarga('Guardando...');
    try {
        await sb.from('suscripciones_clientes').update({ extras: suscripcionExtrasActual.extras }).eq('id', suscripcionExtrasActual.id);
        cerrarModalCarga();
        cerrarModal('modalExtrasCliente');
        mostrarMensaje('✅ Extras guardados', 'exito');
        await cargarSuscripciones();
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

function agregarExtraCliente() {
    const concepto = document.getElementById('extraClienteConcepto')?.value.trim();
    const importe = parseFloat(document.getElementById('extraClienteImporte')?.value);
    const recurrente = document.getElementById('extraClienteRecurrente')?.checked;
    if (!concepto || isNaN(importe) || importe <= 0) return;
    suscripcionExtrasActual.extras.push({ concepto, importe, recurrente });
    document.getElementById('extraClienteConcepto').value = '';
    document.getElementById('extraClienteImporte').value = '';
    document.getElementById('extraClienteRecurrente').checked = false;
    renderizarExtrasClienteModal(suscripcionExtrasActual.extras);
}

function abrirModalCambiarPlan(id, planActual) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.style.display = 'flex';
    modalDiv.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">🏷️ Cambiar plan</div>
            <p>Plan actual: <strong>${planActual}</strong></p>
            <select id="nuevoPlanSelect" style="width:100%; padding:12px; margin:16px 0; border-radius:12px; border:0.5px solid var(--ios-border);">
                <option value="BASICO" ${planActual === 'BASICO' ? 'selected' : ''}>Básico (${preciosPlanes.BASICO}€/mes)</option>
                <option value="PRO" ${planActual === 'PRO' ? 'selected' : ''}>Pro (${preciosPlanes.PRO}€/mes)</option>
                <option value="EMPRESA" ${planActual === 'EMPRESA' ? 'selected' : ''}>Empresa (${preciosPlanes.EMPRESA}€/mes)</option>
            </select>
            <div class="btn-group">
                <button id="confirmarCambioPlan" class="btn-success">Confirmar</button>
                <button id="cancelarCambioPlan" class="btn-danger">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
    modalDiv.querySelector('#confirmarCambioPlan').onclick = async () => {
        const nuevoPlan = modalDiv.querySelector('#nuevoPlanSelect').value;
        mostrarModalCarga('Cambiando plan...');
        await sb.from('suscripciones_clientes').update({ plan: nuevoPlan, precio_mensual: preciosPlanes[nuevoPlan] }).eq('id', id);
        cerrarModalCarga();
        mostrarMensaje(`✅ Plan cambiado a ${nuevoPlan}`, 'exito');
        modalDiv.remove();
        await cargarSuscripciones();
    };
    modalDiv.querySelector('#cancelarCambioPlan').onclick = () => modalDiv.remove();
    modalDiv.onclick = (e) => { if (e.target === modalDiv) modalDiv.remove(); };
}

async function cancelarSuscripcion(id, nombre) {
    if (!confirm(`¿Cancelar suscripción de ${nombre}?`)) return;
    mostrarModalCarga('Cancelando...');
    await sb.from('suscripciones_clientes').update({ estado: 'cancelada', fecha_fin: new Date().toISOString().split('T')[0] }).eq('id', id);
    cerrarModalCarga();
    mostrarMensage(`✅ Suscripción cancelada`, 'exito');
    await cargarSuscripciones();
}

async function activarSuscripcion(id, nombre) {
    mostrarModalCarga('Activando...');
    await sb.from('suscripciones_clientes').update({ estado: 'activa', fecha_fin: null }).eq('id', id);
    cerrarModalCarga();
    mostrarMensaje(`✅ Suscripción activada`, 'exito');
    await cargarSuscripciones();
}

async function generarFacturasAhora() {
    mostrarModalCarga('Generando facturas...');
    try {
        const { error } = await sb.rpc('generar_facturas_mensuales');
        cerrarModalCarga();
        if (error) mostrarMensaje('❌ Error: ' + error.message, 'error');
        else mostrarMensaje('✅ Facturas generadas correctamente', 'exito');
    } catch (e) { cerrarModalCarga(); mostrarMensaje('Error', 'error'); }
}

function setupEventos() {
    const btnGuardar = document.getElementById('btnGuardarPrecios');
    if (btnGuardar) btnGuardar.onclick = guardarPrecios;
    const btnAgregar = document.getElementById('btnAgregarExtraGlobal');
    if (btnAgregar) btnAgregar.onclick = agregarExtraGlobal;
    const btnGenerar = document.getElementById('btnGenerarFacturasAhora');
    if (btnGenerar) btnGenerar.onclick = generarFacturasAhora;
    const btnGuardarExtras = document.getElementById('btnGuardarExtrasCliente');
    if (btnGuardarExtras) btnGuardarExtras.onclick = guardarExtrasCliente;
    const btnCancelarExtras = document.getElementById('btnCancelarExtrasCliente');
    if (btnCancelarExtras) btnCancelarExtras.onclick = () => cerrarModal('modalExtrasCliente');
    const btnAgregarExtra = document.getElementById('btnAgregarExtraCliente');
    if (btnAgregarExtra) btnAgregarExtra.onclick = agregarExtraCliente;
}

function mostrarMensage(texto, tipo) {
    mostrarMensaje(texto, tipo);
}

export default { iniciar };