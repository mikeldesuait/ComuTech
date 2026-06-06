// js/modules/gastos.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';
import { abrirModal, cerrarModal } from './modales/modalesGenerales.js';

let gastos = [];
let gastosFiltrados = [];
let imagenTempBase64 = null;

export async function iniciar() {
    console.log('📉 Iniciando módulo de gastos');
    await cargarGastos();
    renderizarListaGastos();
    setupEventosGastos();
    setupFiltros();
    setupOCR();
}

// ============================================================
// FUNCIONES CRUD DE GASTOS
// ============================================================

async function cargarGastos() {
    try {
        const { data, error } = await sb.from('gastos').select('*').order('fecha', { ascending: false });
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
        totalIva += g.iva || 0;
        if (!g.pagado) totalPendiente += g.importe_total;
    });
    
    const totalElem = document.getElementById('totalGastos');
    const totalIvaElem = document.getElementById('totalIvaGastos');
    const totalPendienteElem = document.getElementById('totalPendienteGastos');
    
    if (totalElem) totalElem.innerHTML = formatMoney(total) + '€';
    if (totalIvaElem) totalIvaElem.innerHTML = formatMoney(totalIva) + '€';
    if (totalPendienteElem) totalPendienteElem.innerHTML = formatMoney(totalPendiente) + '€';
}

function renderizarListaGastos() {
    const container = document.getElementById('listaGastos');
    if (!container) return;
    
    if (!gastosFiltrados.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px; color:gray;">
                <div style="font-size:48px; margin-bottom:16px;">📉</div>
                <p>No hay gastos registrados</p>
                <p><small>Haz clic en "Subir factura" para añadir facturas de proveedores</small></p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    gastosFiltrados.forEach(gasto => {
        const categoriaIcono = getCategoriaIcono(gasto.categoria);
        const badgePagado = gasto.pagado ? '<span class="badge badge-activo">✅ Pagado</span>' : '<span class="badge badge-inactivo">⏳ Pendiente</span>';
        
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
                        ${gasto.pdf_url ? `<button class="ver-pdf-gasto action-btn" data-url="${gasto.pdf_url}" title="Ver PDF">📄</button>` : ''}
                    </div>
                </div>
                <div class="cliente-contacto">
                    <span>💰 ${formatMoney(gasto.importe_total)}€</span>
                    <span>🧾 IVA: ${formatMoney(gasto.iva || 0)}€</span>
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
    document.getElementById('gastoImporte').value = '';
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
    const importeTotal = parseFloat(document.getElementById('gastoImporte').value) || 0;
    const ivaPorcentaje = parseInt(document.getElementById('gastoIva').value);
    const categoria = document.getElementById('gastoCategoria').value;
    const pagado = document.getElementById('gastoPagado').value === 'true';
    const descripcion = document.getElementById('gastoDescripcion').value.trim();
    
    const subtotal = importeTotal / (1 + ivaPorcentaje / 100);
    const iva = importeTotal - subtotal;
    
    if (!proveedor || !fecha || importeTotal <= 0) {
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
    const btnLimpiar = document.getElementById('btnLimpiarFiltrosGastos');
    
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
    actualizarResumen();
}

function limpiarFiltros() {
    document.getElementById('filtroGastoDesde').value = '';
    document.getElementById('filtroGastoHasta').value = '';
    document.getElementById('filtroCategoria').value = '';
    gastosFiltrados = [...gastos];
    renderizarListaGastos();
    actualizarResumen();
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
                    document.getElementById('gastoImporte').value = gasto.importe_total;
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
            if (btn.classList.contains('ver-pdf-gasto')) {
                window.open(btn.dataset.url, '_blank');
            }
        };
    }
}

// ============================================================
// CONVERSIÓN DE IMAGEN/PDF
// ============================================================

async function convertirImagenAPDF(imagenDataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
            const imgWidth = 190;
            const imgHeight = (img.height * imgWidth) / img.width;
            pdf.addImage(img, 'JPEG', 10, 10, imgWidth, imgHeight, undefined, 'FAST');
            resolve(pdf.output('blob'));
        };
        img.onerror = reject;
        img.src = imagenDataURL;
    });
}

async function procesarPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(new Blob([reader.result], { type: 'application/pdf' }));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ============================================================
// FUNCIONES DE EXTRACCIÓN DE DATOS
// ============================================================

function extraerProveedor(texto) {
    const lineas = texto.split('\n');
    for (let i = 0; i < Math.min(lineas.length, 10); i++) {
        const linea = lineas[i].trim();
        if (linea.length > 5 && linea.length < 80 && 
            !linea.match(/factura|invoice|nº|fecha|total|iva|subtotal|telefono|email|web/i) &&
            linea.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/)) {
            return linea;
        }
    }
    return null;
}

function extraerNumeroFactura(texto) {
    const match = texto.match(/Factura\s+N[ºº]?\s*([A-Z0-9\-]+)/i) ||
                  texto.match(/N[ºº]\s*Factura\s*([A-Z0-9\-]+)/i);
    return match ? match[1] : null;
}

function extraerImporte(texto) {
    const match = texto.match(/Total\s*[€$\s]*(\d+[\.,]\d{2})/i) ||
                  texto.match(/TOTAL\s*[€$\s]*(\d+[\.,]\d{2})/i);
    if (match) {
        return parseFloat(match[1].replace(',', '.'));
    }
    return null;
}

function extraerFecha(texto) {
    const match = texto.match(/Fecha\s*:\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/i);
    if (match) {
        let fechaStr = match[1];
        if (fechaStr.includes('/')) {
            const partes = fechaStr.split('/');
            return `20${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
    }
    return null;
}

// ============================================================
// FUNCIÓN PRINCIPAL DE OCR
// ============================================================

async function ejecutarOCRSimple(file) {
    const progressDiv = document.getElementById('ocrProgress');
    const statusSpan = document.getElementById('ocrStatus');
    const progressBar = document.getElementById('ocrProgressBar');
    
    progressDiv.style.display = 'block';
    statusSpan.innerText = 'Preparando archivo...';
    progressBar.style.width = '10%';
    
    try {
        let imagenParaOCR = file;
        
        if (file.type === 'application/pdf') {
            statusSpan.innerText = 'Convirtiendo PDF...';
            progressBar.style.width = '20%';
            imagenParaOCR = await convertirPDFaImagen(file);
        }
        
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract no está cargado');
        }
        
        statusSpan.innerText = 'Iniciando OCR...';
        progressBar.style.width = '30%';
        
        const worker = await Tesseract.createWorker('spa');
        
        statusSpan.innerText = 'Reconociendo texto...';
        progressBar.style.width = '60%';
        
        const ret = await worker.recognize(imagenParaOCR);
        const texto = ret.data.text;
        
        statusSpan.innerText = 'Extrayendo datos...';
        progressBar.style.width = '80%';
        
        const proveedor = extraerProveedor(texto);
        const numeroFactura = extraerNumeroFactura(texto);
        const importe = extraerImporte(texto);
        const fecha = extraerFecha(texto);
        
        if (proveedor) document.getElementById('ocrProveedor').value = proveedor;
        if (numeroFactura) document.getElementById('ocrNumeroFactura').value = numeroFactura;
        if (importe) document.getElementById('ocrImporte').value = importe;
        if (fecha) document.getElementById('ocrFecha').value = fecha;
        
        const datosContent = document.getElementById('datosExtraidosContent');
        datosContent.innerHTML = `
            <ul style="margin: 8px 0 0 20px;">
                <li><strong>Proveedor:</strong> ${proveedor || '❌ No detectado'}</li>
                <li><strong>Nº Factura:</strong> ${numeroFactura || '❌ No detectado'}</li>
                <li><strong>Importe:</strong> ${importe ? importe + '€' : '❌ No detectado'}</li>
                <li><strong>Fecha:</strong> ${fecha || '❌ No detectada'}</li>
            </ul>
            <p style="margin-top: 8px;">✏️ Puedes modificar los datos manualmente.</p>
        `;
        document.getElementById('datosExtraidos').style.display = 'block';
        
        progressBar.style.width = '100%';
        statusSpan.innerText = 'OCR completado!';
        
        await worker.terminate();
        setTimeout(() => { progressDiv.style.display = 'none'; }, 2000);
        
    } catch (error) {
        console.error('Error OCR:', error);
        statusSpan.innerText = 'Error en OCR. Introduce datos manualmente.';
        progressBar.style.width = '100%';
        document.getElementById('datosExtraidosContent').innerHTML = `<p style="color:#c2410c;">❌ Error: ${error.message}</p><p>Introduce los datos manualmente.</p>`;
        document.getElementById('datosExtraidos').style.display = 'block';
        setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
    }
}

async function convertirPDFaImagen(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const loadingTask = pdfjsLib.getDocument({ data: typedarray });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                const scale = 2.5;
                const viewport = page.getViewport({ scale: scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.9);
            } catch (error) { reject(error); }
        };
        reader.readAsArrayBuffer(file);
    });
}

function mostrarPreview(file) {
    const previewDiv = document.getElementById('previewOCR');
    const img = document.getElementById('previewOCRImg');
    
    if (file.type === 'application/pdf') {
        img.src = 'https://cdn.jsdelivr.net/npm/pdf-icon@1.0.0/pdf-icon.png';
        img.style.objectFit = 'contain';
        img.style.backgroundColor = '#f0f0f0';
        previewDiv.style.display = 'block';
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
            img.src = event.target.result;
            previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// ============================================================
// MODAL OCR
// ============================================================

async function abrirModalSubirFacturaOCR() {
    document.getElementById('inputOCRFactura').value = '';
    document.getElementById('previewOCR').style.display = 'none';
    document.getElementById('datosExtraidos').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrNumeroFactura').value = '';
    document.getElementById('ocrImporte').value = '';
    document.getElementById('ocrFecha').value = '';
    document.getElementById('ocrProveedor').value = '';
    document.getElementById('ocrConcepto').value = '';
    document.getElementById('ocrCategoria').value = 'otros';
    document.getElementById('ocrEmailDestino').value = '';
    
    imagenTempBase64 = null;
    
    const { data: { user } } = await sb.auth.getUser();
    if (user?.email) document.getElementById('ocrEmailDestino').value = user.email;
    
    abrirModal('modalSubirFacturaOCR');
    
    const inputFile = document.getElementById('inputOCRFactura');
    inputFile.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            mostrarPreview(file);
            const reader = new FileReader();
            reader.onload = (event) => { imagenTempBase64 = event.target.result; };
            reader.readAsDataURL(file);
            await ejecutarOCRSimple(file);
        }
    };
}

async function procesarYEnviarFacturaOCR() {
    const fileInput = document.getElementById('inputOCRFactura');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarMensaje('Selecciona una imagen o PDF', 'error');
        return;
    }
    
    const numeroFactura = document.getElementById('ocrNumeroFactura').value.trim();
    const importe = parseFloat(document.getElementById('ocrImporte').value) || 0;
    const fecha = document.getElementById('ocrFecha').value;
    const proveedor = document.getElementById('ocrProveedor').value.trim();
    const concepto = document.getElementById('ocrConcepto').value.trim() || 'Factura escaneada';
    const categoria = document.getElementById('ocrCategoria').value;
    
    if (importe <= 0 || !proveedor || !fecha) {
        mostrarMensaje('Completa los campos obligatorios', 'error');
        return;
    }
    
    mostrarModalCarga('Procesando...');
    
    try {
        let pdfBlob;
        if (file.type === 'application/pdf') {
            pdfBlob = await procesarPDF(file);
        } else {
            const reader = new FileReader();
            const imagenDataURL = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            pdfBlob = await convertirImagenAPDF(imagenDataURL);
        }
        
        const fileName = `gasto_${Date.now()}_${proveedor.replace(/\s/g, '_')}.pdf`;
        const { error: uploadError } = await sb.storage
            .from('facturas_gastos')
            .upload(fileName, pdfBlob, { contentType: 'application/pdf' });
        
        if (uploadError) throw uploadError;
        
        const { data: signedUrlData, error: signedUrlError } = await sb.storage
            .from('facturas_gastos')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365);
        
        if (signedUrlError) throw signedUrlError;
        
        const ivaPorcentaje = 21;
        const subtotal = importe / (1 + ivaPorcentaje / 100);
        const iva = importe - subtotal;
        
        const { error: dbError } = await sb.from('gastos').insert({
            numero_factura: numeroFactura,
            proveedor: proveedor,
            fecha: fecha,
            subtotal: subtotal,
            iva: iva,
            importe_total: importe,
            categoria: categoria,
            descripcion: concepto,
            pagado: false,
            pdf_url: signedUrlData.signedUrl
        });
        
        if (dbError) throw dbError;
        
        cerrarModalCarga();
        cerrarModal('modalSubirFacturaOCR');
        mostrarMensaje(`✅ Factura de ${proveedor} guardada.`, 'exito'); // ← Corregido
        
        await cargarGastos();
        renderizarListaGastos();
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error'); // ← Corregido
        console.error(error);
    }
}

function setupOCR() {
    const btnSubir = document.getElementById('btnSubirGastoOCR');
    if (btnSubir) btnSubir.onclick = abrirModalSubirFacturaOCR;
    
    const btnProcesar = document.getElementById('btnProcesarOCR');
    if (btnProcesar) btnProcesar.onclick = procesarYEnviarFacturaOCR;
    
    const btnCancelar = document.getElementById('btnCancelarOCR');
    if (btnCancelar) btnCancelar.onclick = () => cerrarModal('modalSubirFacturaOCR');
}

export default { iniciar };