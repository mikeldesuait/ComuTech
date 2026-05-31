// super-user/js/modules/contrato.js
// 📄 Módulo para generación de contratos en PDF

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
 * Genera el HTML del contrato con los datos del cliente
 */
function generarContratoHTML(cliente, perfil, politicas) {
    const fechaGeneracion = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const fechaISO = new Date().toISOString();
    
    const nombreEmpresa = cliente.nombre_empresa || 'N/A';
    const nif = cliente.nif_cif || 'N/A';
    const plan = cliente.plan || 'BÁSICO';
    const email = perfil?.email || cliente.email || 'N/A';
    const telefono = perfil?.telefono || cliente.telefono || 'N/A';
    const consentimiento = perfil?.consentimiento_tratamiento_datos || false;
    const direccion = cliente.direccion || 'No especificada';
    const provincia = cliente.provincia || 'No especificada';
    
    const consentimientoTexto = consentimiento 
        ? '✅ ACEPTADO' 
        : '❌ PENDIENTE';
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato ${nombreEmpresa}</title>
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
        
        h1 {
            text-align: center;
            color: #1e3a8a;
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .fecha {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .seccion {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .label {
            font-weight: bold;
            font-size: 14px;
            color: #1e3a8a;
            margin-top: 15px;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #d1d5db;
        }
        
        .campo {
            margin: 8px 0;
        }
        
        .campo strong {
            display: inline-block;
            min-width: 140px;
            color: #374151;
        }
        
        .clausula {
            margin: 12px 0;
            padding-left: 20px;
        }
        
        .clausula strong {
            color: #1e3a8a;
        }
        
        hr {
            margin: 30px 0;
            border: none;
            border-top: 1px solid #e5e7eb;
        }
        
        .firma {
            margin-top: 50px;
            text-align: center;
        }
        
        .firma p {
            margin: 5px 0;
        }
        
        .sello {
            margin-top: 30px;
            text-align: center;
            font-family: monospace;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .badge-aceptado {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .badge-pendiente {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .pagina-numero {
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            margin-top: 30px;
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
    <h1>CONTRATO DE SERVICIOS PROFESIONALES</h1>
    <div class="fecha">
        Generado en ${fechaGeneracion}
    </div>
    
    <div class="seccion">
        <div class="label">📋 DATOS DEL CLIENTE</div>
        <div class="campo">
            <strong>Razón Social:</strong> ${escapeHtml(nombreEmpresa)}
        </div>
        <div class="campo">
            <strong>NIF / CIF:</strong> ${escapeHtml(nif)}
        </div>
        <div class="campo">
            <strong>Dirección:</strong> ${escapeHtml(direccion)}
        </div>
        <div class="campo">
            <strong>Provincia:</strong> ${escapeHtml(provincia)}
        </div>
        <div class="campo">
            <strong>Persona de contacto:</strong> ${escapeHtml(perfil?.nombre_razon_social || 'No especificado')}
        </div>
        <div class="campo">
            <strong>Teléfono:</strong> ${escapeHtml(telefono)}
        </div>
        <div class="campo">
            <strong>Email:</strong> ${escapeHtml(email)}
        </div>
        <div class="campo">
            <strong>Plan contratado:</strong> ${escapeHtml(plan)}
        </div>
    </div>
    
    <div class="seccion">
        <div class="label">🔒 CONSENTIMIENTO RGPD (Art. 13 RGPD)</div>
        <div class="campo">
            <span class="badge ${consentimiento ? 'badge-aceptado' : 'badge-pendiente'}">
                ${consentimientoTexto}
            </span>
        </div>
        <p style="margin-top: 10px; font-size: 12px; color: #4b5563;">
            El cliente declara haber sido informado de forma clara y expresa sobre el tratamiento de sus datos personales,
            la finalidad de los mismos, el plazo de conservación y sus derechos de acceso, rectificación, supresión,
            limitación, portabilidad y oposición, de acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
        </p>
    </div>
    
    <div class="seccion">
        <div class="label">📜 CLÁUSULAS CONTRACTUALES</div>
        
        <div class="clausula">
            <strong>PRIMERA. - Objeto del contrato.</strong><br>
            COMUTECH se obliga a prestar al CLIENTE los servicios de administración de fincas, asesoría legal,
            gestión contable y fiscal, así como la administración integral de comunidades de propietarios y/o empresas,
            según lo acordado en la oferta de servicios y plan contratado.
        </div>
        
        <div class="clausula">
            <strong>SEGUNDA. - Duración y renovación.</strong><br>
            El presente contrato tendrá una duración inicial de DOCE (12) MESES, renovándose automáticamente por períodos
            iguales salvo denuncia expresa de cualquiera de las partes mediante comunicación escrita con al menos TREINTA (30)
            días de antelación a la fecha de finalización del contrato.
        </div>
        
        <div class="clausula">
            <strong>TERCERA. - Obligaciones de las partes.</strong><br>
            El CLIENTE se obliga a proporcionar toda la documentación necesaria para la correcta prestación de los servicios,
            así como a abonar las cuotas en los plazos establecidos. COMUTECH se obliga a prestar los servicios con la debida
            diligencia y profesionalidad, manteniendo la confidencialidad de la información del CLIENTE.
        </div>
        
        <div class="clausula">
            <strong>CUARTA. - Precio y forma de pago.</strong><br>
            El precio se determinará según el plan contratado (${escapeHtml(plan)}), con pagos mensuales mediante
            domiciliación bancaria o transferencia. Los precios podrán ser actualizados anualmente según el IPC.
        </div>
        
        <div class="clausula">
            <strong>QUINTA. - Cancelación anticipada.</strong><br>
            En caso de cancelación anticipada por parte del CLIENTE antes de la finalización del período mínimo de duración,
            el CLIENTE deberá abonar en concepto de penalización el 20% del importe restante hasta completar los DOCE MESES
            de duración mínima.
        </div>
        
        <div class="clausula">
            <strong>SEXTA. - Protección de datos.</strong><br>
            Los datos personales serán tratados por COMUTECH con la finalidad de gestionar la relación contractual.
            El CLIENTE consiente expresamente el tratamiento de sus datos para la ejecución del presente contrato.
            Puede ejercer sus derechos mediante comunicación escrita a la dirección de COMUTECH.
        </div>
        
        <div class="clausula">
            <strong>SÉPTIMA. - Legislación aplicable.</strong><br>
            El presente contrato se rige por la legislación española. Las partes se someten a los Juzgados y Tribunales
            de la ciudad de Madrid, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.
        </div>
    </div>
    
    <div class="seccion">
        <div class="label">📎 POLÍTICAS DE PRIVACIDAD Y RGPD</div>
        <p style="font-size: 11px; margin: 10px 0; text-align: justify;">
            De acuerdo con lo establecido en el RGPD, le informamos que sus datos serán tratados por COMUTECH con la finalidad
            de gestionar la relación contractual, mantenerle informado sobre nuestros servicios y cumplir con obligaciones legales.
            Sus datos no serán cedidos a terceros salvo obligación legal. Tiene derecho a acceder, rectificar y suprimir sus datos,
            así como a limitar u oponerse a su tratamiento, mediante solicitud escrita a nuestra dirección de correo electrónico
            dpd@comutech.es. Para más información, consulte nuestra política de privacidad completa.
        </p>
    </div>
    
    <hr>
    
    <div class="firma">
        <p>_________________________</p>
        <p><strong>Firma y sello del cliente</strong></p>
        <p style="font-size: 11px; margin-top: 5px;">
            ${escapeHtml(nombreEmpresa)}
        </p>
        <p style="font-size: 10px; margin-top: 10px;">
            NIF: ${escapeHtml(nif)}
        </p>
    </div>
    
    <div class="sello">
        <p>📄 Documento generado electrónicamente con validez informativa</p>
        <p>ID de transacción: ${Date.now()}-${Math.random().toString(36).substring(2, 10)}</p>
        <p>${fechaISO}</p>
        <p style="margin-top: 10px;">© COMUTECH - Todos los derechos reservados</p>
    </div>
    
    <div class="pagina-numero">
        Página 1 de 1
    </div>
</body>
</html>`;
}

/**
 * Función principal para generar y mostrar el contrato
 * @param {string} empresaId - ID de la empresa
 * @returns {Promise<void>}
 */
export async function generarYMostrarContrato(empresaId) {
    if (!empresaId) {
        throw new Error('ID de empresa no proporcionado');
    }
    
    // Obtener datos del cliente (empresa)
    const { data: cliente, error: errCliente } = await sb
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();
    
    if (errCliente || !cliente) {
        throw new Error('Cliente no encontrado: ' + (errCliente?.message || 'ID inválido'));
    }
    
    // Obtener perfil del gerente (contacto principal)
    const { data: perfil, error: errPerfil } = await sb
        .from('perfiles')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('rol', 'gerente')
        .maybeSingle();
    
    if (errPerfil) {
        console.warn('Error al obtener perfil:', errPerfil);
    }
    
    // Generar HTML del contrato
    const html = generarContratoHTML(cliente, perfil);
    
    // Abrir ventana con el contrato e imprimir (guardar como PDF)
    const ventana = window.open('', '_blank');
    if (!ventana) {
        throw new Error('El navegador bloqueó la ventana emergente. Permite popups para esta página.');
    }
    
    ventana.document.write(html);
    ventana.document.close();
    
    // Esperar a que cargue el contenido y abrir diálogo de impresión
    return new Promise((resolve) => {
        ventana.onload = () => {
            ventana.print();
            resolve(true);
        };
    });
}

/**
 * Enviar contrato por correo electrónico al cliente
 * @param {string} empresaId - ID de la empresa
 * @param {string} emailDestino - Email del destinatario
 * @returns {Promise<boolean>}
 */
export async function enviarContratoPorEmail(empresaId, emailDestino) {
    if (!empresaId || !emailDestino) {
        throw new Error('Faltan parámetros: empresaId y emailDestino');
    }
    
    // Obtener datos del cliente
    const { data: cliente, error: errCliente } = await sb
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();
    
    if (errCliente || !cliente) {
        throw new Error('Cliente no encontrado');
    }
    
    const { data: perfil } = await sb
        .from('perfiles')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('rol', 'gerente')
        .maybeSingle();
    
    const html = generarContratoHTML(cliente, perfil);
    
    // Aquí llamarías a tu Edge Function o servicio de email
    // Por ahora solo retorna true simulando el envío
    console.log('Enviando email a:', emailDestino);
    console.log('Contenido HTML generado (longitud):', html.length);
    
    // TODO: Implementar llamada a Edge Function
    // const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/enviar-contrato', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ to: emailDestino, subject: 'Contrato de servicios', html })
    // });
    // return response.ok;
    
    return true;
}

export default {
    generarYMostrarContrato,
    enviarContratoPorEmail
};