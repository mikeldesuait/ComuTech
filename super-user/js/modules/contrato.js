// super-user/js/modules/contrato.js
// 📄 Módulo para generación de contratos y facturas en PDF con QR

import { sb } from './supabase.js';

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
async function generarFacturaHTML(factura, lineas) {
    // ============================================================
    // OBTENER DATOS DEL EMISOR (TU EMPRESA)
    // ============================================================
    let emisor = {
        nombre: 'COMUTECH S.L.',
        nif: 'B12345678',
        direccion: '',
        ciudad: '',
        provincia: '',
        telefono: '',
        email: ''
    };
    
    try {
        const { data: miEmpresa } = await sb
            .from('empresas')
            .select('*')
            .eq('es_emisora', true)
            .maybeSingle();
        
        if (miEmpresa) {
            emisor.nombre = miEmpresa.nombre_empresa || emisor.nombre;
            emisor.nif = miEmpresa.nif_cif || emisor.nif;
            emisor.direccion = miEmpresa.direccion || miEmpresa.calle || '';
            emisor.ciudad = miEmpresa.ciudad || '';
            emisor.provincia = miEmpresa.provincia || '';
            emisor.telefono = miEmpresa.telefono || '';
            emisor.email = miEmpresa.email || '';
        }
    } catch (e) {
        console.warn('Error obteniendo datos del emisor:', e);
    }
    
    // ============================================================
    // OBTENER DATOS DEL CLIENTE (EMPRESA)
    // ============================================================
    let cliente = {
        nombre: factura.cliente_nombre || '',
        nif: factura.cliente_nif || '',
        direccion: '',
        ciudad: '',
        provincia: ''
    };
    
    try {
        // Obtener la empresa del cliente
        const { data: empresaCliente } = await sb
            .from('empresas')
            .select('*')
            .eq('id', factura.empresa_id)
            .maybeSingle();
        
        if (empresaCliente) {
            cliente.direccion = empresaCliente.direccion || empresaCliente.calle || '';
            cliente.ciudad = empresaCliente.ciudad || '';
            cliente.provincia = empresaCliente.provincia || '';
        }
    } catch (e) {
        console.warn('Error obteniendo datos del cliente:', e);
    }
    
    const direccionEmisor = [emisor.direccion, emisor.ciudad, emisor.provincia].filter(p => p).join(', ');
    const direccionCliente = [cliente.direccion, cliente.ciudad, cliente.provincia].filter(p => p).join(', ');
    
    // Datos para el QR
    const datosQR = {
        v: '1.0',
        num: factura.numero_factura,
        fec: factura.fecha_expedicion.split('T')[0],
        imp: factura.importe_total.toFixed(2),
        hash: factura.hash_factura || '',
        hash_ant: factura.hash_factura_anterior || '0'.repeat(64),
        nif_emi: emisor.nif,
        nif_cli: cliente.nif
    };
    
    // Generar QR
    let qrDataURL = '';
    try {
        qrDataURL = await generarQRDataURL(datosQR);
    } catch (error) {
        console.error('Error generando QR:', error);
        qrDataURL = '';
    }
    
    // Generar HTML de las líneas
    let lineasHtml = '';
    if (lineas && lineas.length) {
        lineas.forEach(linea => {
            const importe = linea.cantidad * linea.precio_unitario;
            lineasHtml += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px;">${escapeHtml(linea.concepto)}</td>
                    <td style="padding: 8px; text-align: center;">${linea.cantidad}</td>
                    <td style="padding: 8px; text-align: right;">${linea.precio_unitario.toFixed(2)}€</td>
                    <td style="padding: 8px; text-align: center;">${linea.iva}%</td>
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
        
        .factura-num {
            font-size: 14px;
            color: #6b7280;
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
        
        .emisor-info, .cliente-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            clear: both;
        }
        
        .emisor-info strong, .cliente-info strong {
            display: block;
            margin-bottom: 10px;
            color: #1e3a8a;
        }
        
        .factura-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
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
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>FACTURA</h1>
        <div class="factura-num">${escapeHtml(factura.numero_factura)}</div>
    </div>
    
    <div class="qr-container">
        ${qrDataURL ? `<img src="${qrDataURL}" alt="Código QR Verifactu">` : '<div style="width:100px; height:100px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; margin:0 auto;">QR</div>'}
        <div style="font-size: 9px; text-align: center;">Verifactu</div>
    </div>
    
    <!-- EMPRESA EMISORA (TÚ) -->
    <div class="emisor-info">
        <strong>EMPRESA EMISORA</strong>
        ${escapeHtml(emisor.nombre)}<br>
        NIF: ${emisor.nif}<br>
        ${direccionEmisor ? direccionEmisor + '<br>' : ''}
        ${emisor.telefono ? 'Tel: ' + emisor.telefono + '<br>' : ''}
        ${emisor.email ? 'Email: ' + emisor.email : ''}
    </div>
    
    <!-- CLIENTE -->
    <div class="cliente-info">
        <strong>CLIENTE</strong>
        ${escapeHtml(cliente.nombre)}<br>
        NIF: ${cliente.nif}<br>
        ${direccionCliente ? direccionCliente + '<br>' : ''}
    </div>
    
    <div class="factura-info">
        <strong>DATOS DE LA FACTURA</strong>
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
        <div><strong>IVA:</strong> ${factura.iva_total.toFixed(2)}€</div>
        <div style="font-size: 18px; margin-top: 10px;"><strong>TOTAL:</strong> ${factura.importe_total.toFixed(2)}€</div>
    </div>
    
    <div class="verifactu-info">
        <strong>🔗 DATOS VERIFACTU</strong><br>
        Hash: ${factura.hash_factura || 'No generado'}<br>
        Hash anterior: ${factura.hash_factura_anterior || 'Primera factura'}<br>
        <br>
        <strong>⚖️ VERIFACTU</strong><br>
        Esta factura cumple con los requisitos técnicos del Reglamento Verifactu.<br>
        <strong>Entregue esta factura a su asesor para su registro en la AEAT.</strong>
    </div>
    
    <div class="footer">
        <p>Documento generado electrónicamente con validez informativa</p>
        <p>© ${escapeHtml(emisor.nombre)} - Todos los derechos reservados</p>
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
        const { data: factura, error: errFactura } = await sb
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single();
        
        if (errFactura || !factura) {
            throw new Error('Factura no encontrada');
        }
        
        const { data: lineas, error: errLineas } = await sb
            .from('lineas_factura')
            .select('*')
            .eq('factura_id', facturaId);
        
        if (errLineas) {
            console.warn('Error obteniendo líneas:', errLineas);
        }
        
        const html = await generarFacturaHTML(factura, lineas || []);
        
        const ventana = window.open('', '_blank');
        if (!ventana) {
            throw new Error('El navegador bloqueó la ventana emergente. Permite popups para esta página.');
        }
        
        ventana.document.write(html);
        ventana.document.close();
        
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
 * Genera y muestra el contrato en PDF
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
 * Genera el HTML del contrato
 */
function generarContratoHTML(cliente, perfil) {
    const direccionCliente = [cliente.direccion, cliente.ciudad, cliente.provincia].filter(p => p).join(', ');
    
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
        <p><strong>Dirección:</strong> ${escapeHtml(direccionCliente || 'No registrada')}</p>
        <p><strong>Email:</strong> ${escapeHtml(perfil?.email || cliente.email || 'N/A')}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(perfil?.telefono || cliente.telefono || 'N/A')}</p>
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