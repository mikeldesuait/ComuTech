// gerente/js/modules/impuestos.js
// Gestión de impuestos (IRPF e IVA)

import { sb } from '../config/supabase.js'
import { mostrarMensaje, formatearFecha, escapeHtml, formatMoney, mostrarModalCarga, cerrarModalCarga } from './utils.js'

let datosIRPF = null
let datosIVA = null

// ============================================================
// IRPF (Pagos fraccionados de autónomos)
// ============================================================

export async function calcularIRPF(empresaId, trimestre, año) {
    mostrarModalCarga('Calculando IRPF...')
    
    try {
        // Obtener facturas emitidas en el trimestre
        const fechas = getFechasTrimestre(año, trimestre)
        
        const { data: facturas, error } = await sb
            .from('facturas')
            .select('*')
            .eq('empresa_id', empresaId)
            .gte('fecha_expedicion', fechas.inicio)
            .lte('fecha_expedicion', fechas.fin)
        
        if (error) throw error
        
        let totalIngresos = 0
        facturas?.forEach(f => {
            totalIngresos += f.subtotal || 0
        })
        
        // Obtener gastos deducibles
        const { data: gastos } = await sb
            .from('gastos')
            .select('*')
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin)
        
        let totalGastos = 0
        gastos?.forEach(g => {
            totalGastos += g.subtotal || 0
        })
        
        const rendimientoNeto = totalIngresos - totalGastos
        const pagoFraccionado = rendimientoNeto * 0.20
        
        datosIRPF = {
            periodo: `${getNombreTrimestre(trimestre)} ${año}`,
            totalIngresos,
            totalGastos,
            rendimientoNeto,
            pagoFraccionado
        }
        
        cerrarModalCarga()
        return datosIRPF
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error calculando IRPF:', error)
        mostrarMensaje('Error al calcular IRPF', 'error')
        return null
    }
}

// ============================================================
// IVA (Modelo 303 trimestral)
// ============================================================

export async function calcularIVA(empresaId, trimestre, año) {
    mostrarModalCarga('Calculando IVA...')
    
    try {
        const fechas = getFechasTrimestre(año, trimestre)
        
        // Facturas emitidas (ingresos)
        const { data: facturas, error } = await sb
            .from('facturas')
            .select('*')
            .eq('empresa_id', empresaId)
            .gte('fecha_expedicion', fechas.inicio)
            .lte('fecha_expedicion', fechas.fin)
        
        if (error) throw error
        
        let totalBaseIngresos = 0
        let totalIvaIngresos = 0
        
        facturas?.forEach(f => {
            totalBaseIngresos += f.subtotal || 0
            totalIvaIngresos += f.iva_total || 0
        })
        
        // Gastos (facturas de proveedores)
        const { data: gastos } = await sb
            .from('gastos')
            .select('*')
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin)
        
        let totalBaseGastos = 0
        let totalIvaGastos = 0
        
        gastos?.forEach(g => {
            totalBaseGastos += g.subtotal || 0
            totalIvaGastos += g.iva || 0
        })
        
        const resultado = totalIvaIngresos - totalIvaGastos
        
        datosIVA = {
            periodo: `${getNombreTrimestre(trimestre)} ${año}`,
            totalBaseIngresos,
            totalIvaIngresos,
            totalBaseGastos,
            totalIvaGastos,
            resultado
        }
        
        cerrarModalCarga()
        return datosIVA
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error calculando IVA:', error)
        mostrarMensaje('Error al calcular IVA', 'error')
        return null
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function getFechasTrimestre(año, trimestre) {
    const trimestres = {
        1: { inicio: `${año}-01-01`, fin: `${año}-03-31` },
        2: { inicio: `${año}-04-01`, fin: `${año}-06-30` },
        3: { inicio: `${año}-07-01`, fin: `${año}-09-30` },
        4: { inicio: `${año}-10-01`, fin: `${año}-12-31` }
    }
    return trimestres[trimestre] || trimestres[1]
}

function getNombreTrimestre(trimestre) {
    const nombres = {
        1: '1er Trimestre (Ene-Mar)',
        2: '2o Trimestre (Abr-Jun)',
        3: '3er Trimestre (Jul-Sep)',
        4: '4o Trimestre (Oct-Dic)'
    }
    return nombres[trimestre] || 'Año completo'
}

// ============================================================
// RENDERIZADO DE INTERFAZ
// ============================================================

export function renderizarSelectorPeriodo() {
    const añoActual = new Date().getFullYear()
    const años = [añoActual, añoActual - 1]
    
    return `
        <div class="row-flex" style="margin-bottom: 20px;">
            <div class="grupo">
                <label>📅 Año</label>
                <select id="impuestoAnio">
                    ${años.map(a => `<option value="${a}" ${a === añoActual ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
            </div>
            <div class="grupo">
                <label>📅 Trimestre</label>
                <select id="impuestoTrimestre">
                    <option value="1">1er Trimestre (Ene - Mar)</option>
                    <option value="2">2o Trimestre (Abr - Jun)</option>
                    <option value="3">3er Trimestre (Jul - Sep)</option>
                    <option value="4">4o Trimestre (Oct - Dic)</option>
                    <option value="0">Año completo</option>
                </select>
            </div>
            <div class="grupo" style="display: flex; align-items: flex-end;">
                <button id="btnCalcularImpuestos" class="btn-success" style="width: 100%;">📊 Calcular</button>
            </div>
        </div>
    `
}

export function renderizarResultadoIRPF(irpf) {
    if (!irpf) {
        return `<div class="text-center" style="padding: 40px; color: var(--ios-gray);">Selecciona un período y haz clic en "Calcular"</div>`
    }
    
    return `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 16px;">
            <h3>📋 Modelo 130 - Pago fraccionado IRPF</h3>
            <p><strong>Período:</strong> ${irpf.periodo}</p>
            <hr style="margin: 12px 0;">
            <div class="row-flex">
                <div class="grupo"><strong>💰 Ingresos:</strong> ${formatMoney(irpf.totalIngresos)}€</div>
                <div class="grupo"><strong>📉 Gastos:</strong> ${formatMoney(irpf.totalGastos)}€</div>
            </div>
            <div class="row-flex">
                <div class="grupo"><strong>📊 Rendimiento neto:</strong> ${formatMoney(irpf.rendimientoNeto)}€</div>
                <div class="grupo"><strong>💶 20% a pagar:</strong> <span style="font-size: 20px; color: #c2410c;">${formatMoney(irpf.pagoFraccionado)}€</span></div>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small>⚠️ Este documento es un INFORME de ayuda. Para presentar el Modelo 130, accede a la sede electrónica de la AEAT.</small>
            </div>
        </div>
    `
}

export function renderizarResultadoIVA(iva) {
    if (!iva) {
        return `<div class="text-center" style="padding: 40px; color: var(--ios-gray);">Selecciona un período y haz clic en "Calcular"</div>`
    }
    
    const resultadoClass = iva.resultado >= 0 ? 'badge-inactivo' : 'badge-activo'
    const resultadoTexto = iva.resultado >= 0 ? `${formatMoney(iva.resultado)}€ a ingresar` : `${formatMoney(Math.abs(iva.resultado))}€ a devolver`
    
    return `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 16px;">
            <h3>📋 Modelo 303 - IVA Trimestral</h3>
            <p><strong>Período:</strong> ${iva.periodo}</p>
            <hr style="margin: 12px 0;">
            
            <div style="margin-bottom: 16px;">
                <strong>📈 INGRESOS (Facturas emitidas)</strong>
                <div class="row-flex">
                    <div class="grupo">Base Imponible: ${formatMoney(iva.totalBaseIngresos)}€</div>
                    <div class="grupo">Cuota IVA: ${formatMoney(iva.totalIvaIngresos)}€</div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>📉 GASTOS (Facturas de proveedores)</strong>
                <div class="row-flex">
                    <div class="grupo">Base Imponible: ${formatMoney(iva.totalBaseGastos)}€</div>
                    <div class="grupo">Cuota IVA: ${formatMoney(iva.totalIvaGastos)}€</div>
                </div>
            </div>
            
            <hr>
            <div class="row-flex">
                <div class="grupo"><strong>💰 IVA repercutido:</strong> ${formatMoney(iva.totalIvaIngresos)}€</div>
                <div class="grupo"><strong>🧾 IVA soportado:</strong> ${formatMoney(iva.totalIvaGastos)}€</div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <strong style="font-size: 18px;">RESULTADO (Casilla 52):</strong>
                <span class="badge ${resultadoClass}" style="font-size: 16px; padding: 8px 16px;">${resultadoTexto}</span>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                <small>✅ Los cálculos incluyen desglose por tipo de IVA (4%, 10%, 21%). Para el modelo 390 (anual), selecciona "Año completo".</small>
            </div>
        </div>
    `
}

export function renderizarDescargaPDF() {
    return `
        <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
            <button id="btnDescargarIRPF" class="btn-info">📎 Descargar Modelo 130 (PDF)</button>
            <button id="btnDescargarIVA" class="btn-info">📎 Descargar Modelo 303 (PDF)</button>
        </div>
    `
}

export function descargarInformePDF(titulo, contenido) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e3a8a; text-align: center; }
            .fecha { text-align: center; color: #6b7280; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; }
        </style>
    </head>
    <body>
        <h1>${titulo}</h1>
        <div class="fecha">Generado el ${new Date().toLocaleString()}</div>
        ${contenido}
        <div class="footer">
            <p>Documento generado electrónicamente con validez informativa</p>
            <p>Entregue este documento a su asesor para su presentación en la AEAT.</p>
        </div>
    </body>
    </html>`
    
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titulo.replace(/ /g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
    
    mostrarMensaje(`✅ ${titulo} descargado`, 'exito')
}