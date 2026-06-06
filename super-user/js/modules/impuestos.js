// js/modules/impuestos.js
import { sb } from './supabase.js';
import { mostrarMensaje, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js';

let datosActuales = {
    facturas: [],
    gastos: [],
    lineasFacturas: []
};

export async function iniciar() {
    console.log('📋 Iniciando módulo de impuestos');
    setupEventos();
    await calcularTodo();
}

function setupEventos() {
    const btnCalcular = document.getElementById('btnCalcularImpuestos');
    if (btnCalcular) btnCalcular.onclick = calcularTodo;
    
    const btnDescargar303 = document.getElementById('btnDescargar303');
    if (btnDescargar303) btnDescargar303.onclick = () => descargarPDF('303');
    
    const btnDescargar390 = document.getElementById('btnDescargar390');
    if (btnDescargar390) btnDescargar390.onclick = () => descargarPDF('390');
    
    const btnDescargar130 = document.getElementById('btnDescargar130');
    if (btnDescargar130) btnDescargar130.onclick = () => descargarPDF('130');
    
    // Actualizar fechas al cambiar trimestre
    const trimestreSelect = document.getElementById('impuestoTrimestre');
    const anioSelect = document.getElementById('impuestoAnio');
    
    if (trimestreSelect) {
        trimestreSelect.onchange = actualizarFechasPorTrimestre;
    }
    if (anioSelect) {
        anioSelect.onchange = actualizarFechasPorTrimestre;
    }
    
    // Inicializar fechas
    actualizarFechasPorTrimestre();
}

function actualizarFechasPorTrimestre() {
    const anio = document.getElementById('impuestoAnio').value;
    const trimestre = parseInt(document.getElementById('impuestoTrimestre').value);
    const fechaDesdeInput = document.getElementById('contabilidadFechaDesde');
    const fechaHastaInput = document.getElementById('contabilidadFechaHasta');
    
    if (!fechaDesdeInput || !fechaHastaInput) return;
    
    if (trimestre === 0) {
        fechaDesdeInput.value = `${anio}-01-01`;
        fechaHastaInput.value = `${anio}-12-31`;
    } else {
        const fechas = getFechasTrimestre(anio, trimestre);
        fechaDesdeInput.value = fechas.inicio;
        fechaHastaInput.value = fechas.fin;
    }
}

async function calcularTodo() {
    const fechaDesde = document.getElementById('contabilidadFechaDesde')?.value;
    const fechaHasta = document.getElementById('contabilidadFechaHasta')?.value;
    const anio = document.getElementById('impuestoAnio').value;
    const trimestre = parseInt(document.getElementById('impuestoTrimestre').value);
    
    if (!fechaDesde || !fechaHasta) {
        mostrarMensaje('Selecciona un período válido', 'error');
        return;
    }
    
    mostrarModalCarga('Calculando declaraciones...');
    
    try {
        // 1. Obtener facturas emitidas
        const { data: facturas, error: errFacturas } = await sb
            .from('facturas')
            .select('*')
            .gte('fecha_expedicion', fechaDesde)
            .lte('fecha_expedicion', fechaHasta);
        
        if (errFacturas) throw errFacturas;
        
        // 2. Obtener líneas de facturas
        const facturasIds = facturas?.map(f => f.id) || [];
        let lineasFacturas = [];
        
        if (facturasIds.length > 0) {
            const { data: lineas, error: errLineas } = await sb
                .from('lineas_factura')
                .select('*')
                .in('factura_id', facturasIds);
            
            console.log('🔍 Líneas de factura obtenidas:', lineas?.length || 0);
            console.log('🔍 IDs de facturas:', facturasIds);
            
            if (!errLineas) {
                lineasFacturas = lineas || [];
            } else {
                console.error('Error obteniendo líneas:', errLineas);
            }
        }
        
        // 3. Obtener gastos
        const { data: gastos, error: errGastos } = await sb
            .from('gastos')
            .select('*')
            .gte('fecha', fechaDesde)
            .lte('fecha', fechaHasta);
        
        if (errGastos) throw errGastos;
        
        datosActuales = { facturas, gastos, lineasFacturas };
        
        // 4. Calcular IVA (Modelo 303)
        const ivaData = calcularIVA(facturas, lineasFacturas, gastos);
        mostrarModelo303(ivaData, fechaDesde, fechaHasta);
        
        // 5. Modelo 390 (solo año completo)
        if (trimestre === 0) {
            mostrarModelo390(ivaData, anio);
        } else {
            const container390 = document.getElementById('modelo390Contenido');
            if (container390) {
                container390.innerHTML = `
                    <div style="padding: 20px; text-align: center; background: #fef3c7; border-radius: 8px;">
                        ⚠️ El modelo 390 solo está disponible para el año completo.<br>
                        <small>Selecciona "Año completo" en el selector de trimestre.</small>
                    </div>
                `;
            }
        }
        
        // 6. Calcular Modelo 130 (IRPF)
        const modelo130Data = calcularModelo130(facturas, gastos);
        mostrarModelo130(modelo130Data, fechaDesde, fechaHasta);
        
        cerrarModalCarga();
        mostrarMensaje(`✅ Datos calculados para el período ${fechaDesde} al ${fechaHasta}`, 'exito');
        
    } catch (error) {
        cerrarModalCarga();
        mostrarMensaje('Error: ' + error.message, 'error');
        console.error(error);
    }
}

function getFechasTrimestre(anio, trimestre) {
    if (trimestre === 1) return { inicio: `${anio}-01-01`, fin: `${anio}-03-31` };
    if (trimestre === 2) return { inicio: `${anio}-04-01`, fin: `${anio}-06-30` };
    if (trimestre === 3) return { inicio: `${anio}-07-01`, fin: `${anio}-09-30` };
    return { inicio: `${anio}-10-01`, fin: `${anio}-12-31` };
}

function calcularIVA(facturas, lineasFacturas, gastos) {
    const ingresosPorIva = { 4: { base: 0, iva: 0 }, 10: { base: 0, iva: 0 }, 21: { base: 0, iva: 0 } };
    const gastosPorIva = { 4: { base: 0, iva: 0 }, 10: { base: 0, iva: 0 }, 21: { base: 0, iva: 0 } };
    
    let totalBaseIngresos = 0;
    let totalIvaIngresos = 0;
    let totalBaseGastos = 0;
    let totalIvaGastos = 0;
    
    // USAR LÍNEAS DE FACTURA (más preciso)
    if (lineasFacturas && lineasFacturas.length > 0) {
        console.log('Calculando IVA desde líneas de factura:', lineasFacturas.length);
        lineasFacturas.forEach(linea => {
            const iva = linea.iva || 21;
            const base = linea.subtotal || (linea.cantidad * linea.precio_unitario);
            const importeIva = base * (iva / 100);
            
            if (ingresosPorIva[iva]) {
                ingresosPorIva[iva].base += base;
                ingresosPorIva[iva].iva += importeIva;
            }
            
            totalBaseIngresos += base;
            totalIvaIngresos += importeIva;
        });
    } 
    // SI NO HAY LÍNEAS, usar datos de facturas
    else if (facturas && facturas.length > 0) {
        console.log('Calculando IVA desde facturas (sin líneas):', facturas.length);
        facturas.forEach(factura => {
            const base = factura.subtotal || 0;
            const iva = factura.iva_total || 0;
            
            ingresosPorIva[21].base += base;
            ingresosPorIva[21].iva += iva;
            
            totalBaseIngresos += base;
            totalIvaIngresos += iva;
        });
    }
    
    // Gastos
    if (gastos && gastos.length > 0) {
        gastos.forEach(gasto => {
            const base = gasto.subtotal || 0;
            const importeIva = gasto.iva || 0;
            
            gastosPorIva[21].base += base;
            gastosPorIva[21].iva += importeIva;
            
            totalBaseGastos += base;
            totalIvaGastos += importeIva;
        });
    }
    
    const resultado = totalIvaIngresos - totalIvaGastos;
    
    console.log('Resultado IVA:', { totalBaseIngresos, totalIvaIngresos, totalBaseGastos, totalIvaGastos, resultado });
    
    return { ingresosPorIva, gastosPorIva, totalBaseIngresos, totalIvaIngresos, totalBaseGastos, totalIvaGastos, resultado };
}

function mostrarModelo303(data, fechaDesde, fechaHasta) {
    const container = document.getElementById('modelo303Contenido');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 16px;">
            <div style="margin-bottom: 20px;">
                <strong>📈 INGRESOS (Facturas emitidas)</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background:#e8f5e9;">
                        <th style="padding: 8px; text-align: left;">Tipo IVA</th>
                        <th style="padding: 8px; text-align: right;">Base Imponible</th>
                        <th style="padding: 8px; text-align: right;">Cuota IVA</th>
                    </tr>
                    ${Object.entries(data.ingresosPorIva).map(([tipo, valores]) => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding: 6px;">${tipo}%</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(valores.base)}€</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(valores.iva)}€</td>
                        </tr>
                    `).join('')}
                    <tr style="background:#f1f5f9; font-weight: bold;">
                        <td style="padding: 8px;">TOTAL INGRESOS</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalBaseIngresos)}€</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalIvaIngresos)}€</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-bottom: 20px;">
                <strong>📉 GASTOS (Facturas de proveedores)</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background:#ffebee;">
                        <th style="padding: 8px; text-align: left;">Tipo IVA</th>
                        <th style="padding: 8px; text-align: right;">Base Imponible</th>
                        <th style="padding: 8px; text-align: right;">Cuota IVA</th>
                    </tr>
                    ${Object.entries(data.gastosPorIva).map(([tipo, valores]) => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding: 6px;">${tipo}%</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(valores.base)}€</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(valores.iva)}€</td>
                        </tr>
                    `).join('')}
                    <tr style="background:#f1f5f9; font-weight: bold;">
                        <td style="padding: 8px;">TOTAL GASTOS</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalBaseGastos)}€</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalIvaGastos)}€</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #f0fdf4; padding: 16px; border-radius: 12px; margin-top: 16px;">
                <table style="width:100%">
                    <tr>
                        <td><strong>IVA repercutido (ingresos):</strong></td>
                        <td style="text-align: right;">${formatMoney(data.totalIvaIngresos)}€</td>
                    </tr>
                    <tr>
                        <td><strong>IVA soportado (gastos):</strong></td>
                        <td style="text-align: right;">${formatMoney(data.totalIvaGastos)}€</td>
                    </tr>
                    <tr style="border-top: 2px solid #22c55e;">
                        <td><strong style="font-size: 16px;">RESULTADO (Casilla 52):</strong></td>
                        <td style="text-align: right; font-size: 18px; font-weight: bold; color: ${data.resultado >= 0 ? '#c2410c' : '#166534'};">${formatMoney(Math.abs(data.resultado))}€ ${data.resultado >= 0 ? 'a ingresar' : 'a devolver'}</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small>📅 Período: ${new Date(fechaDesde).toLocaleDateString()} - ${new Date(fechaHasta).toLocaleDateString()}</small>
                <br><small>✅ Los cálculos incluyen desglose por tipo de IVA (4%, 10%, 21%).</small>
            </div>
        </div>
    `;
}

function mostrarModelo390(data, anio) {
    const container = document.getElementById('modelo390Contenido');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 16px;">
            <div style="margin-bottom: 20px;">
                <strong>📊 RESUMEN ANUAL IVA - ${anio}</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding: 8px; text-align: left;">Concepto</th>
                        <th style="padding: 8px; text-align: right;">Base Imponible</th>
                        <th style="padding: 8px; text-align: right;">Cuota IVA</th>
                    </tr>
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding: 6px;">Operaciones (ingresos)</td>
                        <td style="padding: 6px; text-align: right;">${formatMoney(data.totalBaseIngresos)}€</td>
                        <td style="padding: 6px; text-align: right;">${formatMoney(data.totalIvaIngresos)}€</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding: 6px;">Adquisiciones (gastos)</td>
                        <td style="padding: 6px; text-align: right;">${formatMoney(data.totalBaseGastos)}€</td>
                        <td style="padding: 6px; text-align: right;">${formatMoney(data.totalIvaGastos)}€</td>
                    </tr>
                    <tr style="background:#f0fdf4; font-weight: bold;">
                        <td style="padding: 8px;">RESULTADO</td>
                        <td style="padding: 8px; text-align: right;"></td>
                        <td style="padding: 8px; text-align: right; font-size: 16px; color: ${data.resultado >= 0 ? '#c2410c' : '#166534'};">${formatMoney(Math.abs(data.resultado))}€ ${data.resultado >= 0 ? 'a ingresar' : 'a devolver'}</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small>📅 Año: ${anio}</small>
                <br><small>✅ El modelo 390 se presenta en enero del año siguiente.</small>
            </div>
        </div>
    `;
}

function calcularModelo130(facturas, gastos) {
    let totalIngresos = 0;
    let detalleIngresos = [];
    
    facturas?.forEach(f => {
        totalIngresos += f.subtotal || 0;
        detalleIngresos.push({
            numero: f.numero_factura,
            cliente: f.cliente_nombre,
            importe: f.subtotal || 0
        });
    });
    
    // Categorías profesionales para gastos deducibles
    const categoriasProfesionales = ['software', 'asesoria', 'internet', 'alquiler_oficina', 'material_oficina'];
    let totalGastos = 0;
    let detalleGastos = [];
    
    gastos?.forEach(g => {
        if (categoriasProfesionales.includes(g.categoria)) {
            const importe = g.subtotal || g.importe_total || 0;
            totalGastos += importe;
            detalleGastos.push({
                proveedor: g.proveedor,
                concepto: g.descripcion || g.categoria,
                importe: importe
            });
        }
    });
    
    const rendimientoNeto = totalIngresos - totalGastos;
    const pagoFraccionado = rendimientoNeto * 0.20;
    
    return {
        totalIngresos,
        detalleIngresos,
        totalGastos,
        detalleGastos,
        rendimientoNeto,
        pagoFraccionado
    };
}

function mostrarModelo130(data, fechaDesde, fechaHasta) {
    const container = document.getElementById('modelo130Contenido');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 16px;">
            <div style="margin-bottom: 20px;">
                <strong>📈 INGRESOS PROFESIONALES</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding: 8px; text-align: left;">Factura</th>
                        <th style="padding: 8px; text-align: left;">Cliente</th>
                        <th style="padding: 8px; text-align: right;">Importe</th>
                    </tr>
                    ${data.detalleIngresos.map(i => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding: 6px;">${escapeHtml(i.numero)}</td>
                            <td style="padding: 6px;">${escapeHtml(i.cliente)}</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(i.importe)}€</td>
                        </tr>
                    `).join('')}
                    <tr style="background:#e8f5e9; font-weight: bold;">
                        <td colspan="2" style="padding: 8px;">TOTAL INGRESOS</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalIngresos)}€</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-bottom: 20px;">
                <strong>📉 GASTOS PROFESIONALES DEDUCIBLES</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding: 8px; text-align: left;">Proveedor</th>
                        <th style="padding: 8px; text-align: left;">Concepto</th>
                        <th style="padding: 8px; text-align: right;">Importe</th>
                    </tr>
                    ${data.detalleGastos.map(g => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding: 6px;">${escapeHtml(g.proveedor)}</td>
                            <td style="padding: 6px;">${escapeHtml(g.concepto)}</td>
                            <td style="padding: 6px; text-align: right;">${formatMoney(g.importe)}€</td>
                        </tr>
                    `).join('')}
                    ${data.detalleGastos.length === 0 ? `
                        <tr>
                            <td colspan="3" style="padding: 20px; text-align: center;">No hay gastos profesionales registrados</td>
                        </tr>
                    ` : ''}
                    <tr style="background:#ffebee; font-weight: bold;">
                        <td colspan="2" style="padding: 8px;">TOTAL GASTOS</td>
                        <td style="padding: 8px; text-align: right;">${formatMoney(data.totalGastos)}€</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #f0fdf4; padding: 16px; border-radius: 12px; margin-top: 16px;">
                <table style="width:100%">
                    <tr>
                        <td><strong>Ingresos totales:</strong></td>
                        <td style="text-align: right;">${formatMoney(data.totalIngresos)}€</td>
                    </tr>
                    <tr>
                        <td><strong>Gastos totales:</strong></td>
                        <td style="text-align: right;">-${formatMoney(data.totalGastos)}€</td>
                    </tr>
                    <tr style="border-top: 1px solid #ccc;">
                        <td><strong>RENDIMIENTO NETO:</strong></td>
                        <td style="text-align: right;">${formatMoney(data.rendimientoNeto)}€</td>
                    </tr>
                    <tr style="border-top: 2px solid #22c55e;">
                        <td><strong style="font-size: 16px;">20% sobre rendimiento neto:</strong></td>
                        <td style="text-align: right; font-size: 18px; font-weight: bold; color: #c2410c;">${formatMoney(data.pagoFraccionado)}€</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small>📅 Período: ${new Date(fechaDesde).toLocaleDateString()} - ${new Date(fechaHasta).toLocaleDateString()}</small>
                <br><small>⚠️ Este documento es un INFORME de ayuda para calcular el Modelo 130.</small>
                <br><small>📌 Para presentar el Modelo 130, accede a la sede electrónica de la AEAT.</small>
                <br><small>💰 El pago fraccionado es del 20% sobre el rendimiento neto (ingresos - gastos).</small>
            </div>
        </div>
    `;
}

function descargarPDF(modelo) {
    const anio = document.getElementById('impuestoAnio').value;
    const trimestre = parseInt(document.getElementById('impuestoTrimestre').value);
    let fechaDesde = document.getElementById('contabilidadFechaDesde')?.value;
    let fechaHasta = document.getElementById('contabilidadFechaHasta')?.value;
    
    if (!fechaDesde || !fechaHasta) {
        if (trimestre === 0) {
            fechaDesde = `${anio}-01-01`;
            fechaHasta = `${anio}-12-31`;
        } else {
            const fechas = getFechasTrimestre(anio, trimestre);
            fechaDesde = fechas.inicio;
            fechaHasta = fechas.fin;
        }
    }
    
    let titulo = '';
    let contenido = '';
    
    if (modelo === '303') {
        const data = calcularIVA(datosActuales.facturas, datosActuales.lineasFacturas, datosActuales.gastos);
        const periodo = trimestre === 0 ? `Año ${anio}` : `${fechaDesde} al ${fechaHasta}`;
        titulo = `MODELO 303 - IVA (${periodo})`;
        
        contenido = `
            <h2>MODELO 303 - DECLARACIÓN TRIMESTRAL DE IVA</h2>
            <p><strong>Período:</strong> ${periodo}</p>
            
            <h3>INGRESOS (Facturas emitidas)</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr><th>Tipo IVA</th><th>Base Imponible</th><th>Cuota IVA</th></tr>
                ${Object.entries(data.ingresosPorIva).map(([tipo, v]) => `<tr><td>${tipo}%</td><td style="text-align:right">${formatMoney(v.base)}€</td><td style="text-align:right">${formatMoney(v.iva)}€</td></tr>`).join('')}
                <tr style="font-weight:bold"><td>TOTAL</td><td style="text-align:right">${formatMoney(data.totalBaseIngresos)}€</td><td style="text-align:right">${formatMoney(data.totalIvaIngresos)}€</td></tr>
            </table>
            
            <h3>GASTOS (Facturas de proveedores)</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr><th>Tipo IVA</th><th>Base Imponible</th><th>Cuota IVA</th></tr>
                ${Object.entries(data.gastosPorIva).map(([tipo, v]) => `<tr><td>${tipo}%</td><td style="text-align:right">${formatMoney(v.base)}€</td><td style="text-align:right">${formatMoney(v.iva)}€</td></tr>`).join('')}
                <tr style="font-weight:bold"><td>TOTAL</td><td style="text-align:right">${formatMoney(data.totalBaseGastos)}€</td><td style="text-align:right">${formatMoney(data.totalIvaGastos)}€</td></tr>
            </table>
            
            <h3>RESULTADO</h3>
            <p>IVA repercutido: ${formatMoney(data.totalIvaIngresos)}€</p>
            <p>IVA soportado: ${formatMoney(data.totalIvaGastos)}€</p>
            <p><strong>RESULTADO (Casilla 52): ${formatMoney(Math.abs(data.resultado))}€ ${data.resultado >= 0 ? 'a ingresar' : 'a devolver'}</strong></p>
        `;
        
    } else if (modelo === '390') {
        if (trimestre !== 0) {
            mostrarMensaje('El modelo 390 solo está disponible para el año completo', 'error');
            return;
        }
        const data = calcularIVA(datosActuales.facturas, datosActuales.lineasFacturas, datosActuales.gastos);
        titulo = `MODELO 390 - RESUMEN ANUAL IVA (${anio})`;
        
        contenido = `
            <h2>MODELO 390 - DECLARACIÓN ANUAL DE IVA</h2>
            <p><strong>Año:</strong> ${anio}</p>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr><th>Concepto</th><th>Base Imponible</th><th>Cuota IVA</th></tr>
                <tr><td>Operaciones (ingresos)</td><td style="text-align:right">${formatMoney(data.totalBaseIngresos)}€</td><td style="text-align:right">${formatMoney(data.totalIvaIngresos)}€</td></tr>
                <tr><td>Adquisiciones (gastos)</td><td style="text-align:right">${formatMoney(data.totalBaseGastos)}€</td><td style="text-align:right">${formatMoney(data.totalIvaGastos)}€</td></tr>
                <tr style="font-weight:bold"><td>RESULTADO</td><td></td><td style="text-align:right">${formatMoney(Math.abs(data.resultado))}€ ${data.resultado >= 0 ? 'a ingresar' : 'a devolver'}</td></tr>
            </table>
        `;
        
    } else if (modelo === '130') {
        const data = calcularModelo130(datosActuales.facturas, datosActuales.gastos);
        const periodo = trimestre === 0 ? `Año ${anio}` : `${fechaDesde} al ${fechaHasta}`;
        titulo = `MODELO 130 - IRPF (Pago fraccionado) - ${periodo}`;
        
        contenido = `
            <h2>MODELO 130 - PAGO FRACCIONADO IRPF</h2>
            <p><strong>Período:</strong> ${periodo}</p>
            
            <h3>INGRESOS PROFESIONALES</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr><th>Factura</th><th>Cliente</th><th>Importe</th></tr>
                ${data.detalleIngresos.map(i => `<tr><td>${escapeHtml(i.numero)}</td><td>${escapeHtml(i.cliente)}</td><td style="text-align:right">${formatMoney(i.importe)}€</td></tr>`).join('')}
                <tr style="font-weight:bold"><td colspan="2">TOTAL INGRESOS</td><td style="text-align:right">${formatMoney(data.totalIngresos)}€</td></tr>
            </table>
            
            <h3>GASTOS PROFESIONALES DEDUCIBLES</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr><th>Proveedor</th><th>Concepto</th><th>Importe</th></tr>
                ${data.detalleGastos.map(g => `<tr><td>${escapeHtml(g.proveedor)}</td><td>${escapeHtml(g.concepto)}</td><td style="text-align:right">${formatMoney(g.importe)}€</td></tr>`).join('')}
                ${data.detalleGastos.length === 0 ? '<tr><td colspan="3">No hay gastos profesionales registrados</td></table>' : ''}
                <tr style="font-weight:bold"><td colspan="2">TOTAL GASTOS</td><td style="text-align:right">${formatMoney(data.totalGastos)}€</td></tr>
            </table>
            
            <h3>CÁLCULO DEL PAGO FRACCIONADO</h3>
            <p>Ingresos: ${formatMoney(data.totalIngresos)}€</p>
            <p>Gastos: -${formatMoney(data.totalGastos)}€</p>
            <p><strong>Rendimiento Neto: ${formatMoney(data.rendimientoNeto)}€</strong></p>
            <p><strong style="font-size:16px">20% a pagar (Modelo 130): ${formatMoney(data.pagoFraccionado)}€</strong></p>
            
            <div style="margin-top: 20px; padding: 12px; background: #fef3c7;">
                <small>⚠️ Este documento es un INFORME de ayuda. Para presentar el Modelo 130, accede a la sede electrónica de la AEAT.</small>
            </div>
        `;
    }
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e3a8a; text-align: center; }
            h2 { color: #2563eb; margin-top: 30px; }
            h3 { color: #1e40af; margin-top: 20px; }
            table { margin-top: 10px; margin-bottom: 20px; }
            th { background: #f1f5f9; }
            .fecha { text-align: center; color: #6b7280; margin-bottom: 30px; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
    </head>
    <body>
        <h1>COMUTECH</h1>
        <div class="fecha">Documento generado el ${new Date().toLocaleString()}</div>
        ${contenido}
        <div class="footer">
            <p>Documento generado electrónicamente con validez informativa</p>
            <p>Entregue este documento a su asesor para su presentación en la AEAT.</p>
        </div>
    </body>
    </html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_${modelo}_${anio}_trimestre_${trimestre}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    mostrarMensaje(`✅ Modelo ${modelo} descargado`, 'exito');
}

export default { iniciar };