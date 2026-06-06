// js/modules/productos.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let productos = [];

export async function iniciar() {
    console.log('📦 Iniciando módulo de productos');
    await cargarProductos();
    renderizarListaProductos();
    setupEventosProductos();
    setupBuscador();
}

async function cargarProductos() {
    try {
        const { data, error } = await sb.from('productos')
            .select('*')
            .order('nombre_producto');
        
        if (error) throw error;
        productos = data || [];
        console.log(`📦 ${productos.length} productos cargados`);
        renderizarListaProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarMensaje('Error cargando productos: ' + error.message, 'error');
    }
}

function renderizarListaProductos() {
    const container = document.getElementById('listaProductos');
    if (!container) return;
    
    if (!productos.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px; color:gray;">
                <div style="font-size:48px; margin-bottom:16px;">📦</div>
                <p>No hay productos creados</p>
                <p><small>Haz clic en "Nuevo producto" para añadir tu catálogo</small></p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    productos.forEach(producto => {
        html += `
            <div class="cliente-card">
                <div class="cliente-header">
                    <div>
                        <div class="cliente-nombre">${escapeHtml(producto.nombre_producto)}</div>
                        ${producto.codigo ? `<div class="cliente-nif">Código: ${escapeHtml(producto.codigo)}</div>` : ''}
                    </div>
                    <div class="cliente-actions">
                        <button class="editar-producto action-btn" data-id="${producto.id}" title="Editar">✏️</button>
                        <button class="eliminar-producto action-btn" data-id="${producto.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="cliente-contacto">
                    <span>💰 ${formatMoney(producto.precio_unitario)}€</span>
                    <span>🧾 IVA: ${producto.iva_aplicable || 21}%</span>
                    <span>📏 ${producto.unidad || 'unidad'}</span>
                </div>
                ${producto.descripcion ? `<div class="cliente-badges"><span class="badge">📝 ${escapeHtml(producto.descripcion.substring(0, 50))}${producto.descripcion.length > 50 ? '...' : ''}</span></div>` : ''}
                <div class="cliente-badges">
                    <span class="badge ${producto.activo ? 'badge-activo' : 'badge-inactivo'}">${producto.activo ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function setupBuscador() {
    const buscador = document.getElementById('buscadorProducto');
    if (!buscador) return;
    
    buscador.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        filtrarProductos(texto);
    });
}

function filtrarProductos(texto) {
    const container = document.getElementById('listaProductos');
    if (!container) return;
    
    if (!texto) {
        renderizarListaProductos();
        return;
    }
    
    const productosFiltrados = productos.filter(p => 
        p.nombre_producto.toLowerCase().includes(texto) ||
        (p.codigo && p.codigo.toLowerCase().includes(texto)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(texto))
    );
    
    if (!productosFiltrados.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px; color:gray;">
                <div style="font-size:48px; margin-bottom:16px;">🔍</div>
                <p>No hay productos que coincidan con "${texto}"</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    productosFiltrados.forEach(producto => {
        html += `
            <div class="cliente-card">
                <div class="cliente-header">
                    <div>
                        <div class="cliente-nombre">${escapeHtml(producto.nombre_producto)}</div>
                        ${producto.codigo ? `<div class="cliente-nif">Código: ${escapeHtml(producto.codigo)}</div>` : ''}
                    </div>
                    <div class="cliente-actions">
                        <button class="editar-producto action-btn" data-id="${producto.id}" title="Editar">✏️</button>
                        <button class="eliminar-producto action-btn" data-id="${producto.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="cliente-contacto">
                    <span>💰 ${formatMoney(producto.precio_unitario)}€</span>
                    <span>🧾 IVA: ${producto.iva_aplicable || 21}%</span>
                    <span>📏 ${producto.unidad || 'unidad'}</span>
                </div>
                ${producto.descripcion ? `<div class="cliente-badges"><span class="badge">📝 ${escapeHtml(producto.descripcion.substring(0, 50))}${producto.descripcion.length > 50 ? '...' : ''}</span></div>` : ''}
                <div class="cliente-badges">
                    <span class="badge ${producto.activo ? 'badge-activo' : 'badge-inactivo'}">${producto.activo ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function abrirModalNuevoProducto() {
    document.getElementById('modalProductoHeader').innerHTML = '📦 Nuevo producto';
    document.getElementById('productoId').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoCodigo').value = '';
    document.getElementById('productoDescripcion').value = '';
    document.getElementById('productoPrecio').value = '';
    document.getElementById('productoIva').value = '21';
    document.getElementById('productoUnidad').value = 'unidad';
    document.getElementById('productoActivo').value = 'true';
    
    abrirModal('modalProducto');
}

function abrirModalEditarProducto(producto) {
    document.getElementById('modalProductoHeader').innerHTML = '✏️ Editar producto';
    document.getElementById('productoId').value = producto.id;
    document.getElementById('productoNombre').value = producto.nombre_producto || '';
    document.getElementById('productoCodigo').value = producto.codigo || '';
    document.getElementById('productoDescripcion').value = producto.descripcion || '';
    document.getElementById('productoPrecio').value = producto.precio_unitario || '';
    document.getElementById('productoIva').value = producto.iva_aplicable || 21;
    document.getElementById('productoUnidad').value = producto.unidad || 'unidad';
    document.getElementById('productoActivo').value = producto.activo ? 'true' : 'false';
    
    abrirModal('modalProducto');
}

async function guardarProducto() {
    const id = document.getElementById('productoId').value;
    const nombre = document.getElementById('productoNombre').value.trim();
    const codigo = document.getElementById('productoCodigo').value.trim();
    const descripcion = document.getElementById('productoDescripcion').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const iva = parseInt(document.getElementById('productoIva').value);
    const unidad = document.getElementById('productoUnidad').value;
    const activo = document.getElementById('productoActivo').value === 'true';
    
    if (!nombre) {
        mostrarMensaje('El nombre del producto es obligatorio', 'error');
        return;
    }
    
    if (isNaN(precio) || precio <= 0) {
        mostrarMensaje('El precio debe ser mayor que 0', 'error');
        return;
    }
    
    mostrarModalCarga('Guardando producto...');
    
    try {
        if (id) {
            const { error } = await sb.from('productos')
                .update({
                    nombre_producto: nombre,
                    codigo: codigo,
                    descripcion: descripcion,
                    precio_unitario: precio,
                    iva_aplicable: iva,
                    unidad: unidad,
                    activo: activo
                })
                .eq('id', id);
            
            if (error) throw error;
            mostrarMensaje('✅ Producto actualizado', 'exito');
        } else {
            const { error } = await sb.from('productos')
                .insert({
                    nombre_producto: nombre,
                    codigo: codigo,
                    descripcion: descripcion,
                    precio_unitario: precio,
                    iva_aplicable: iva,
                    unidad: unidad,
                    activo: activo
                });
            
            if (error) throw error;
            mostrarMensaje('✅ Producto creado', 'exito');
        }
        
        cerrarModalCarga();
        cerrarModal('modalProducto');
        await cargarProductos();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Eliminar el producto "${nombre}"?`)) return;
    
    mostrarModalCarga('Eliminando...');
    
    try {
        const { error } = await sb.from('productos').delete().eq('id', id);
        if (error) throw error;
        
        cerrarModalCarga();
        mostrarMensaje('✅ Producto eliminado', 'exito');
        await cargarProductos();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

function setupEventosProductos() {
    const btnNuevo = document.getElementById('btnNuevoProducto');
    if (btnNuevo) btnNuevo.onclick = abrirModalNuevoProducto;
    
    const btnGuardar = document.getElementById('btnGuardarProducto');
    if (btnGuardar) btnGuardar.onclick = guardarProducto;
    
    const btnCancelar = document.getElementById('btnCancelarProducto');
    if (btnCancelar) btnCancelar.onclick = () => cerrarModal('modalProducto');
    
    const container = document.getElementById('listaProductos');
    if (container) {
        container.onclick = async (e) => {
            const btn = e.target;
            if (btn.classList.contains('editar-producto')) {
                const producto = productos.find(p => p.id === btn.dataset.id);
                if (producto) abrirModalEditarProducto(producto);
            }
            if (btn.classList.contains('eliminar-producto')) {
                const producto = productos.find(p => p.id === btn.dataset.id);
                if (producto) eliminarProducto(producto.id, producto.nombre_producto);
            }
        };
    }
}

export default { iniciar };