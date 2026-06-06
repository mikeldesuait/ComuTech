// super-user/js/modules/generarPDF.js
import { sb } from './supabase.js'
import { mostrarMensaje, mostrarModalCarga, cerrarModalCarga } from './utils.js'

// Textos legales completos para incluir en el PDF
const TEXTO_RGPD_COMPLETO = `
POLÍTICA DE PROTECCIÓN DE DATOS (RGPD)

De acuerdo con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos (RGPD), y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), se le informa:

1. RESPONSABLE DEL TRATAMIENTO
   - Identidad: COMUTECH S.L.
   - NIF: B12345678
   - Dirección: [TU DIRECCIÓN]
   - Email: dpd@comutech.es

2. FINALIDAD DEL TRATAMIENTO
   Sus datos serán tratados para:
   - Gestión de la relación contractual
   - Emisión de facturas y gestión contable
   - Comunicaciones relacionadas con el servicio
   - Cumplimiento de obligaciones legales

3. LEGITIMACIÓN
   La base legal para el tratamiento de sus datos es:
   - Ejecución de un contrato
   - Cumplimiento de obligaciones legales
   - Consentimiento explícito

4. DESTINATARIOS
   Sus datos podrán ser comunicados a:
   - Agencia Tributaria (obligación legal)
   - Entidades bancarias (gestión de cobros)
   - Proveedores de servicios tecnológicos

5. DERECHOS
   Usted tiene derecho a:
   - Acceder a sus datos
   - Rectificarlos
   - Suprimirlos (derecho al olvido)
   - Limitar su tratamiento
   - Oponerse al tratamiento
   - Portabilidad de los datos

6. PLAZO DE CONSERVACIÓN
   Los datos se conservarán mientras dure la relación contractual y, una vez finalizada, durante los plazos legales establecidos.

Fecha de esta versión: 1 de junio de 2026
Versión: 2.0
`

function generarTextoContrato(datosCliente) {
    const fecha = new Date().toLocaleDateString('es-ES')
    const nombreCliente = datosCliente?.nombre_empresa || 'EL CLIENTE'
    const nifCliente = datosCliente?.nif_cif || '___'
    const direccionCliente = datosCliente?.direccion || '___'
    const plan = datosCliente?.plan || 'BASICO'
    const importe = plan === 'PRO' ? '99' : (plan === 'EMPRESA' ? '199' : '49')
    
    return `
CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

En [CIUDAD], a ${fecha}.

REUNIDOS

De una parte, COMUTECH S.L., con NIF B12345678, y domicilio a efectos de notificaciones en [DIRECCIÓN COMUTECH] (en adelante, "EL PRESTADOR").

De otra parte, ${nombreCliente}, con NIF ${nifCliente}, y domicilio en ${direccionCliente} (en adelante, "EL CLIENTE").

EXPONEN

Que EL CLIENTE desea contratar los servicios de facturación y gestión ofrecidos por EL PRESTADOR.

CLAUSULAS

PRIMERA. - OBJETO
EL PRESTADOR prestará al CLIENTE servicios de facturación, gestión contable y emisión de facturas Verifactu según el plan contratado.

SEGUNDA. - DURACIÓN
El contrato tendrá una duración inicial de DOCE (12) MESES, renovable automáticamente.

TERCERA. - PRECIO
El precio será de ${importe}€/mes (plan ${plan}), pagadero por domiciliación bancaria.

CUARTA. - PROTECCIÓN DE DATOS
Ambas partes cumplirán con el RGPD. EL PRESTADOR tratará los datos conforme a su política de privacidad.

QUINTA. - RESOLUCIÓN
Cualquiera de las partes puede resolver el contrato con 30 días de antelación.

SEXTA. - LEGISLACIÓN
Rige la legislación española.

En prueba de conformidad, ambas partes firman digitalmente.

_________________________
COMUTECH S.L.

_________________________
${nombreCliente}
Fecha de firma: ${fecha}
`
}

export async function descargarDocumentacionCliente(empresaId, empresaNombre) {
    mostrarModalCarga('Generando documentación...')
    
    try {
        // Obtener datos de la empresa
        const { data: empresa } = await sb
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single()
        
        // Obtener el perfil del gerente
        const { data: perfil } = await sb
            .from('perfiles')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('rol', 'gerente')
            .maybeSingle()
        
        // Obtener consentimientos
        const { data: consentimientos } = await sb
            .from('historico_consentimientos')
            .select('*')
            .eq('perfil_id', perfil?.id)
            .order('fecha_aceptacion', { ascending: false })
        
        // Obtener contratos
        const { data: contratos } = await sb
            .from('historico_contratos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('fecha_aceptacion', { ascending: false })
        
        // Generar HTML con TODA la documentación
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Documentación legal - ${escapeHtml(empresaNombre)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; }
                h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                h2 { color: #2563eb; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                .seccion { margin-bottom: 40px; }
                .fecha { color: #666; font-size: 12px; margin-bottom: 10px; }
                .dato { margin: 5px 0; }
                .label { font-weight: bold; display: inline-block; width: 150px; }
                .documento-texto { 
                    white-space: pre-wrap; 
                    font-family: monospace; 
                    font-size: 11px; 
                    background: #f8fafc; 
                    padding: 16px; 
                    border-radius: 8px; 
                    border: 1px solid #e2e8f0;
                    margin: 16px 0;
                    max-height: 400px;
                    overflow-y: auto;
                }
                .firma { margin-top: 50px; text-align: center; }
                .firma-linea { border-top: 1px solid #000; width: 300px; margin: 20px auto 10px auto; }
                .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
                .pagina { page-break-before: always; }
                .pagina:first-child { page-break-before: avoid; }
            </style>
        </head>
        <body>
            <h1>Documentación Legal</h1>
            <p><strong>Cliente:</strong> ${escapeHtml(empresa?.nombre_empresa || empresaNombre)}</p>
            <p><strong>NIF/CIF:</strong> ${escapeHtml(empresa?.nif_cif || 'No registrado')}</p>
            <p><strong>Email:</strong> ${escapeHtml(empresa?.email || perfil?.email || '-')}</p>
            <p><strong>Teléfono:</strong> ${escapeHtml(empresa?.telefono || '-')}</p>
            <p><strong>Fecha generación:</strong> ${new Date().toLocaleString()}</p>
            
            <div class="seccion">
                <h2>📋 Datos del Cliente</h2>
                <div class="dato"><span class="label">Razón Social:</span> ${escapeHtml(empresa?.nombre_empresa || '-')}</div>
                <div class="dato"><span class="label">NIF/CIF:</span> ${escapeHtml(empresa?.nif_cif || '-')}</div>
                <div class="dato"><span class="label">Dirección:</span> ${escapeHtml(empresa?.direccion || empresa?.calle || '-')}</div>
                <div class="dato"><span class="label">Plan contratado:</span> ${escapeHtml(empresa?.plan || 'BASICO')}</div>
            </div>
        `
        
        // === CONSENTIMIENTOS RGPD (texto completo) ===
        if (consentimientos && consentimientos.length > 0) {
            html += `<div class="pagina">
                <h2>📜 Consentimiento RGPD</h2>`
            
            consentimientos.forEach((c, idx) => {
                html += `
                    <div style="margin-bottom: 30px; padding: 10px; background: #f0fdf4; border-left: 4px solid #22c55e;">
                        <p class="fecha"><strong>✅ Aceptado:</strong> ${new Date(c.fecha_aceptacion).toLocaleString()}</p>
                        <p><strong>IP:</strong> ${c.ip_aceptacion || 'No registrada'}</p>
                        <p><strong>Versión:</strong> ${c.consentimiento_version || '1.0'}</p>
                        <p><strong>Finalidades aceptadas:</strong> ${c.finalidades_aceptadas?.join(', ') || 'Todas'}</p>
                    </div>
                    <div class="documento-texto">
                        <strong>TEXTO COMPLETO DEL CONSENTIMIENTO RGPD:</strong><br><br>
                        ${TEXTO_RGPD_COMPLETO}
                    </div>
                `
            })
            html += `</div>`
        } else {
            html += `<div class="seccion">
                <h2>📜 Consentimiento RGPD</h2>
                <p>No hay registros de consentimiento RGPD.</p>
            </div>`
        }
        
        // === CONTRATOS (texto completo) ===
        if (contratos && contratos.length > 0) {
            html += `<div class="pagina">
                <h2>📄 Contratos de Servicios</h2>`
            
            contratos.forEach((c, idx) => {
                const textoContrato = c.contrato_texto_completo || generarTextoContrato(empresa)
                html += `
                    <div style="margin-bottom: 30px; padding: 10px; background: #eff6ff; border-left: 4px solid #3b82f6;">
                        <p class="fecha"><strong>📅 Aceptado:</strong> ${new Date(c.fecha_aceptacion).toLocaleString()}</p>
                        <p><strong>IP:</strong> ${c.ip_aceptacion || 'No registrada'}</p>
                        <p><strong>Versión contrato:</strong> ${c.contrato_version || '1.0'}</p>
                        <p><strong>Plan contratado:</strong> ${c.plan_contratado}</p>
                        <p><strong>Importe mensual:</strong> ${c.importe_mensual}€</p>
                    </div>
                    <div class="documento-texto">
                        <strong>TEXTO COMPLETO DEL CONTRATO:</strong><br><br>
                        ${textoContrato}
                    </div>
                `
            })
            html += `</div>`
        } else {
            html += `<div class="seccion">
                <h2>📄 Contratos de Servicios</h2>
                <p>No hay contratos registrados.</p>
            </div>`
        }
        
        html += `
            <div class="firma">
                <div class="firma-linea"></div>
                <p>Documento generado electrónicamente con validez informativa</p>
                <p>ID: ${Date.now()}</p>
                <p>© COMUTECH - Todos los derechos reservados</p>
            </div>
        </body>
        </html>
        `
        
        // Descargar el HTML
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `documentacion_${empresaNombre.replace(/\s/g, '_')}_${Date.now()}.html`
        a.click()
        URL.revokeObjectURL(url)
        
        cerrarModalCarga()
        mostrarMensaje('✅ Documentación generada correctamente', 'exito')
        
    } catch (error) {
        cerrarModalCarga()
        console.error('Error:', error)
        mostrarMensaje('Error: ' + error.message, 'error')
    }
}

function escapeHtml(text) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}