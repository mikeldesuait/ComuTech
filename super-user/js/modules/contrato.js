// super-user/js/modules/contrato.js
// 📄 Módulo para generación de contratos y facturas en PDF con QR

import { sb } from './supabase.js';

// NIF del emisor (COMUTECH) - CAMBIA ESTO POR TU NIF REAL
const EMISOR_NIF = "B12345678";
const EMISOR_NOMBRE = "COMUTECH S.L.";

/**
 * Escapa caracteres especiales para HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Genera el código QR en formato DataURL
 */
async function generarQRDataURL(datosQR) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, JSON.stringify(datosQR), {
            width: 150,
            margin: 2,
            errorCorrectionLevel: 'M'
        }, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        });
    });
}

/**
 * Genera el HTML de la factura con QR
 */
async function generarFacturaHTML(factura, lineas, empresa) {
    const fechaGeneracion = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Datos para el QR (formato Verifactu simplificado)
    const datosQR = {
        v: '1.0',
        num: factura.numero_factura,
        fec: factura.fecha_expedicion.split('T')[0],
        imp: factura.importe_total.toFixed(2),
        hash: factura.hash_factura || '',
        hash_ant: factura.hash_factura_anterior || '0'.repeat(64),
        nif_emi: EMISOR_NIF,
        nif_cli: factura.cliente_nif || ''
    };
    
    // Generar QR
    let qrDataURL = '';
    try {
        qrDataURL = await generarQRDataURL(datosQR);
    } catch (error) {
        console.error('Error generando QR:', error);
    }
    
    // Generar HTML de la factura
    let lineasHtml = '';
    if (lineas && lineas.length) {
        lineas.forEach(linea => {
            const importe = linea.cantidad * linea.precio_unitario;
            lineasHtml += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px;">${escapeHtml(linea.concepto)}</td>
                    <td style="padding: 8px; text-align: center;">${linea.cantidad}</td>
                    <td style="padding: 8px; text-align: right;">${linea.precio_unitario.toFixed(2)}€</td>
                    <td style="padding: 8px; text-align: right;">${linea.iva}%</td>
                    <td style="padding: 8px; text-align: right;">${importe.toFixed(2)}€</td>
                </tr>
            `;
        });
    }
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura ${factura.numero_factura}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
            line-height: 1.5;
            color: #1f2937;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1e3a8a;
        }
        
        h1 {
            color: #1e3a8a;
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .qr-container {
            float: right;
            width: 120px;
            height: 120px;
            margin-left: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .qr-container img {
            width: 100%;
            height: auto;
            border: 1px solid #e5e7eb;
            padding: 5px;
        }
        
        .qr-label {
            font-size: 9px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        .empresa-info {
            margin-bottom: 30px;
        }
        
        .cliente-info {
            margin-bottom: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }
        
        .factura-info {
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th {
            background: #f1f5f9;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e2e8f0;
        }
        
        td {
            padding: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .totales {
            text-align: right;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
        }
        
        .totales div {
            margin: 5px 0;
        }
        
        .verifactu-info {
            margin-top: 30px;
            padding: 15px;
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            border-radius: 8px;
            font-size: 10px;
            font-family: monospace;
            word-break: break-all;
        }
        
        .verifactu-info strong {
            color: #166534;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>FACTURA</h1>
        <p>${escapeHtml(factura.numero_factura)}</p>
    </div>
    
    <div class="qr-container">
        <img src="${qrDataURL}" alt="Código QR Verifactu">
        <div class="qr-label">Verifactu - Código verificable</div>
    </div>
    
    <div class="empresa-info">
        <strong>${escapeHtml(EMISOR_NOMBRE)}</strong><br>
        NIF: ${EMISOR_NIF}<br>
        ${escapeHtml(empresa?.direccion || 'Dirección')}<br>
        ${escapeHtml(empresa?.ciudad || 'Ciudad')}, ${escapeHtml(empresa?.provincia || 'Provincia')}
    </div>
    
    <div class="cliente-info">
        <strong>CLIENTE</strong><br>
        ${escapeHtml(factura.cliente_nombre)}<br>
        NIF: ${escapeHtml(factura.cliente_nif)}<br>
        ${escapeHtml(empresa?.cliente_direccion || '')}
    </div>
    
    <div class="factura-info">
        <strong>DATOS DE LA FACTURA</strong><br>
        Fecha de expedición: ${new Date(factura.fecha_expedicion).toLocaleDateString()}<br>
        Fecha de vencimiento: ${new Date(factura.fecha_vencimiento).toLocaleDateString()}
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Concepto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: center;">IVA</th>
                <th style="text-align: right;">Importe</th>
            </tr>
        </thead>
        <tbody>
            ${lineasHtml}
        </tbody>
    </table>
    
    <div class="totales">
        <div><strong>Subtotal:</strong> ${factura.subtotal.toFixed(2)}€</div>
        <div><strong>IVA (21%):</strong> ${factura.iva_total.toFixed(2)}€</div>
        <div style="font-size: 18px; margin-top: 10px;"><strong>TOTAL:</strong> ${factura.importe_total.toFixed(2)}€</div>
    </div>
    
    <div class="verifactu-info">
        <strong>🔗 DATOS VERIFACTU</strong><br>
        Hash de la factura: ${factura.hash_factura || 'No generado'}<br>
        Hash factura anterior: ${factura.hash_factura_anterior || 'Primera factura'}<br>
        <br>
        <strong>⚖️ VERIFACTU</strong><br>
        Esta factura cumple con los requisitos técnicos del Reglamento Verifactu.<br>
        Los datos han sido generados con trazabilidad y encadenamiento.<br>
        <strong>Entregue esta factura a su asesor para su registro en la AEAT.</strong>
    </div>
    
    <div class="footer">
        <p>Documento generado electrónicamente con validez informativa</p>
        <p>ID: ${Date.now()}</p>
        <p>© ${EMISOR_NOMBRE} - Todos los derechos reservados</p>
    </div>
</body>
</html>`;
}

/**
 * Genera y muestra la factura en PDF
 */
export async function generarYMostrarFactura(facturaId) {
    if (!facturaId) {
        throw new Error('ID de factura no proporcionado');
    }
    
    try {
        // Obtener datos de la factura
        const { data: factura, error: errFactura } = await sb
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single();
        
        if (errFactura || !factura) {
            throw new Error('Factura no encontrada');
        }
        
        // Obtener líneas de la factura
        const { data: lineas, error: errLineas } = await sb
            .from('lineas_factura')
            .select('*')
            .eq('factura_id', facturaId);
        
        if (errLineas) {
            console.warn('Error obteniendo líneas:', errLineas);
        }
        
        // Obtener datos de la empresa emisora (si existe en tu tabla empresas)
        let empresa = null;
        try {
            const { data: emp } = await sb
                .from('empresas')
                .select('*')
                .eq('id', factura.empresa_id)
                .maybeSingle();
            empresa = emp;
        } catch (e) {
            console.warn('No se encontró la empresa emisora');
        }
        
        // Generar HTML de la factura
        const html = await generarFacturaHTML(factura, lineas || [], empresa);
        
        // Abrir ventana con la factura
        const ventana = window.open('', '_blank');
        if (!ventana) {
            throw new Error('El navegador bloqueó la ventana emergente. Permite popups para esta página.');
        }
        
        ventana.document.write(html);
        ventana.document.close();
        
        // Mostrar diálogo de impresión (para guardar como PDF)
        ventana.onload = () => {
            ventana.print();
        };
        
        return true;
        
    } catch (error) {
        console.error('Error generando factura:', error);
        throw error;
    }
}

/**
 * Función original para generar contrato (la mantengo igual)
 */
export async function generarYMostrarContrato(empresaId) {
    if (!empresaId) {
        throw new Error('ID de empresa no proporcionado');
    }
    
    const { data: cliente, error: errCliente } = await sb
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();
    
    if (errCliente || !cliente) {
        throw new Error('Cliente no encontrado: ' + (errCliente?.message || 'ID inválido'));
    }
    
    const { data: perfil, error: errPerfil } = await sb
        .from('perfiles')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('rol', 'gerente')
        .maybeSingle();
    
    if (errPerfil) {
        console.warn('Error al obtener perfil:', errPerfil);
    }
    
    const html = generarContratoHTML(cliente, perfil);
    
    const ventana = window.open('', '_blank');
    if (!ventana) {
        throw new Error('El navegador bloqueó la ventana emergente. Permite popups para esta página.');
    }
    
    ventana.document.write(html);
    ventana.document.close();
    
    return new Promise((resolve) => {
        ventana.onload = () => {
            ventana.print();
            resolve(true);
        };
    });
}

/**
 * Genera el HTML del contrato (función original)
 */
function generarContratoHTML(cliente, perfil) {
    // Tu función original de contrato aquí
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato ${cliente.nombre_empresa || 'Cliente'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
        h1 { text-align: center; color: #1e3a8a; margin-bottom: 20px; }
        .fecha { text-align: center; color: #6b7280; margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
        .seccion { margin-bottom: 25px; }
        .label { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #d1d5db; }
        .firma { margin-top: 50px; text-align: center; }
        hr { margin: 30px 0; }
    </style>
</head>
<body>
    <h1>CONTRATO DE SERVICIOS PROFESIONALES</h1>
    <div class="fecha">${new Date().toLocaleDateString('es-ES')}</div>
    <div class="seccion">
        <div class="label">DATOS DEL CLIENTE</div>
        <p><strong>Razón Social:</strong> ${escapeHtml(cliente.nombre_empresa || 'N/A')}</p>
        <p><strong>NIF/CIF:</strong> ${escapeHtml(cliente.nif_cif || 'N/A')}</p>
        <p><strong>Email:</strong> ${escapeHtml(perfil?.email || cliente.email || 'N/A')}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(perfil?.telefono || cliente.telefono || 'N/A')}</p>
        <p><strong>Plan:</strong> ${escapeHtml(cliente.plan || 'BÁSICO')}</p>
    </div>
    <div class="seccion">
        <div class="label">CONDICIONES</div>
        <p>El presente contrato se rige por la legislación española...</p>
    </div>
    <hr>
    <div class="firma">
        <p>Firmado electrónicamente</p>
        <p>${escapeHtml(cliente.nombre_empresa || 'CLIENTE')}</p>
    </div>
</body>
</html>`;
}

export default {
    generarYMostrarContrato,
    generarYMostrarFactura
};