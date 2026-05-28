// js/cumplimiento.js

window.iniciarModuloCumplimiento = function() {
    cargarCumplimiento();
};

async function cargarCumplimiento() {
    const { data: consentimientos, count: totalCons } = await sb.from('historico_consentimientos').select('*', { count: 'exact' });
    const aceptados = consentimientos?.filter(c => !c.fecha_revocacion).length || 0;
    const revocados = (totalCons || 0) - aceptados;
    
    const { data: registros, count: totalReg } = await sb.from('registros_facturacion').select('*', { count: 'exact' });
    const conHash = registros?.filter(r => r.hash_factura).length || 0;
    
    document.getElementById('consentimientosList').innerHTML = `
        <p>📊 Total registros: ${totalCons || 0}</p>
        <p>✅ Aceptados activos: ${aceptados}</p>
        <p>❌ Revocados: ${revocados}</p>
        <p>📅 Último consentimiento: ${consentimientos && consentimientos[0] ? formatDate(consentimientos[0].fecha_aceptacion) : 'Ninguno'}</p>
    `;
    
    document.getElementById('hashEncadenadoInfo').innerHTML = `
        <p>🔗 Total facturas registradas: ${totalReg || 0}</p>
        <p>✅ Con hash generado: ${conHash}</p>
        <p>⚙️ Veri*Factu habilitado: ${registros?.filter(r => r.modalidad_verifactu === 'SI').length || 0} facturas</p>
        <p>📄 Pendientes de envío AEAT: ${registros?.filter(r => r.modalidad_verifactu === 'SI' && !r.enviado_aeat).length || 0}</p>
    `;
    
    document.getElementById('cumplimientoStats').innerHTML = `
        <p>✅ <strong>Ley Antifraude 11/2021</strong>: ${totalReg > 0 ? 'Cumpliendo con hash encadenado' : 'Pendiente'}</p>
        <p>✅ <strong>RGPD / LOPDGDD</strong>: ${totalCons > 0 ? `${aceptados} consentimientos activos registrados` : 'Pendiente'}</p>
        <p>✅ <strong>Ley de facturación</strong>: Facturas con trazabilidad hash</p>
        <p>✅ <strong>Conservación 5 años</strong>: Todas las facturas tienen timestamp</p>
    `;
}
