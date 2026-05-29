// js/modules/facturacion.js
import { sb } from './supabase.js'
import { mostrarMensaje, formatDate, generarHash, obtenerUltimoHash } from './utils.js'
import { getCurrentUser } from './main.js'

let lineasFactura = [{ descripcion: "Suscripción COMUTECH", cantidad: 1, precio: 49 }]
let currentHash = null

export async function cargarFacturas() {
    const desde = document.getElementById('facturaDesde')?.value
    const hasta = document.getElementById('facturaHasta')?.value
    let query = sb.from('facturas').select('*, empresas(nombre_empresa, nif_cif), registros_facturacion(hash_factura, modalidad_verifactu)').order('created_at', { ascending: false })
    if (desde) query = query.gte('fecha_expedicion', desde)
    if (hasta) query = query.lte('fecha_expedicion', hasta)
    const { data: facturas, error } = await query
    const tbody = document.getElementById('facturasBody')
    if (!tbody) return
    if (error || !facturas?.length) { 
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">📋 No hay facturas</td></tr>'
        return
    }
    tbody.innerHTML = facturas.map(f => `
        <tr>
            <td>${formatDate(f.fecha_expedicion)}</td>
            <td>${f.empresas?.nombre_empresa || '-'}</td>
            <td>${f.numero_factura || f.id.slice(0,8)}</td>
            <td>${f.concepto || '-'}</td>
            <td>${(f.importe_total || 0).toFixed(2)}€</td>
            <td><small class="hash-text">${f.registros_facturacion?.hash_factura?.slice(0,16) || 'Sin hash'}...</small></td>
            <td><span class="badge ${f.estado === 'pagada' ? 'badge-pagada' : 'badge-pendiente'}">${f.estado === 'pagada' ? 'Pagada' : 'Pendiente'}</span></td>
            <td><button class="btn-sm toggle-factura" data-id="${f.id}" data-estado="${f.estado}">${f.estado === 'pagada' ? '❌' : '✅'}</button></td>
        </tr>
    `).join('')
    document.querySelectorAll('.toggle-factura').forEach(btn => { 
        btn.onclick = async () => { 
            const id = btn.dataset.id
            const nuevoEstado = btn.dataset.estado === 'pagada' ? 'pendiente' : 'pagada'
            await sb.from('facturas').update({ estado: nuevoEstado }).eq('id', id)
            mostrarMensaje(nuevoEstado === 'pagada' ? 'Marcada pagada' : 'Marcada pendiente')
            await cargarFacturas()
            const { cargarStats } = await import('./main.js')
            cargarStats()
        }
    })
}

async function cargarSelectorClientesFactura() {
    const { data: empresas } = await sb.from('empresas').select('id, nombre_empresa, nif_cif').eq('activo', true).order('nombre_empresa')
    const select = document.getElementById('selectorClienteFactura')
    if (select && empresas) select.innerHTML = '<option value="">-- Selecciona un cliente --</option>' + empresas.map(e => `<option value="${e.id}" data-nif="${e.nif_cif}">${e.nombre_empresa}</option>`).join('')
}

function initSelectorFactura() {
    const btn = document.getElementById('btnCrearFacturaDesdeSelector')
    if (btn) btn.onclick = () => { 
        const select = document.getElementById('selectorClienteFactura')
        const clienteId = select.value
        const clienteNombre = select.options[select.selectedIndex]?.text
        if (!clienteId) { 
            mostrarMensaje("❌ Selecciona un cliente", 'error')
            return
        }
        mostrarModalFactura(clienteId, clienteNombre)
    }
}

function mostrarModalFactura(id, nombre) {
    lineasFactura = [{ descripcion: "Suscripción COMUTECH", cantidad: 1, precio: 49 }]
    renderizarLineasFactura()
    document.getElementById('facturaEmpresaId').value = id
    document.getElementById('facturaClienteNombre').value = nombre
    document.getElementById('facturaFecha').value = new Date().toISOString().split('T')[0]
    document.getElementById('facturaNumero').value = `F${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    document.getElementById('facturaVencimiento').value = ''
    document.getElementById('facturaNotas').value = "Gracias por confiar en COMUTECH"
    renderizarFacturaPreview()
    document.getElementById('modalCrearFactura').style.display = 'flex'
}

function renderizarLineasFactura() {
    const container = document.getElementById('facturaLineas')
    if (!container) return
    container.innerHTML = ''
    lineasFactura.forEach((linea, idx) => { 
        const div = document.createElement('div')
        div.className = 'row-flex'
        div.style.alignItems = 'center'
        div.innerHTML = `
            <div class="grupo" style="flex:3;"><input type="text" placeholder="Descripción" value="${linea.descripcion.replace(/"/g, '&quot;')}" data-idx="${idx}" data-campo="descripcion" class="linea-input"></div>
            <div class="grupo"><input type="number" placeholder="Cantidad" step="1" value="${linea.cantidad}" data-idx="${idx}" data-campo="cantidad" class="linea-input"></div>
            <div class="grupo"><input type="number" placeholder="Precio (€)" step="0.01" value="${linea.precio}" data-idx="${idx}" data-campo="precio" class="linea-input"></div>
            <div class="grupo" style="flex:0.5;"><button class="btn-sm btn-danger eliminar-linea" data-idx="${idx}">✖</button></div>
        `
        container.appendChild(div)
    })
    document.querySelectorAll('.linea-input').forEach(input => { 
        input.addEventListener('change', (e) => { 
            const idx = parseInt(e.target.dataset.idx)
            const campo = e.target.dataset.campo
            let valor = e.target.value
            if (campo === 'precio') valor = parseFloat(valor)
            if (campo === 'cantidad') valor = parseInt(valor)
            lineasFactura[idx][campo] = valor
            renderizarFacturaPreview()
        })
    })
    document.querySelectorAll('.eliminar-linea').forEach(btn => { 
        btn.onclick = () => { 
            lineasFactura.splice(parseInt(btn.dataset.idx), 1)
            if (lineasFactura.length === 0) lineasFactura = [{ descripcion: "Suscripción COMUTECH", cantidad: 1, precio: 49 }]
            renderizarLineasFactura()
            renderizarFacturaPreview()
        }
    })
}

async function renderizarFacturaPreview() {
    let subtotal = 0
    const lineasHtml = lineasFactura.map(linea => { 
        const importe = linea.cantidad * linea.precio
        subtotal += importe
        return `<div class="factura-linea"><span>${linea.descripcion} (${linea.cantidad} x ${linea.precio.toFixed(2)}€)</span><span>${importe.toFixed(2)}€</span></div>`
    }).join('')
    const iva = subtotal * 0.21
    const total = subtotal + iva
    const empresaId = document.getElementById('facturaEmpresaId').value
    const select = document.getElementById('selectorClienteFactura')
    const nifEmisor = select?.options[select.selectedIndex]?.dataset.nif || 'B00000000'
    const numeroFactura = document.getElementById('facturaNumero').value || `F${Date.now()}`
    const fecha = document.getElementById('facturaFecha').value || new Date().toISOString().split('T')[0]
    const hashAnterior = await obtenerUltimoHash(nifEmisor)
    const contenidoHash = `${hashAnterior || ''}${numeroFactura}${fecha}${total}${nifEmisor}`
    currentHash = await generarHash(contenidoHash)
    document.getElementById('facturaPreview').innerHTML = `<div><strong>COMUTECH SOLUCIONES S.L.</strong><br>C/ Tecnología 123, 28001 Madrid<br>NIF: B12345678</div><div style="margin:12px 0;">${lineasHtml}</div><div class="factura-linea"><span>Subtotal</span><span>${subtotal.toFixed(2)}€</span></div><div class="factura-linea"><span>IVA (21%)</span><span>${iva.toFixed(2)}€</span></div><div class="factura-linea factura-total"><span>TOTAL</span><span>${total.toFixed(2)}€</span></div>`
    document.getElementById('hashPreview').innerHTML = `🔗 Hash SHA256: ${currentHash}`
    const qrData = JSON.stringify({ factura: numeroFactura, fecha, total, emisor: "COMUTECH SOLUCIONES SL", nif_emisor: "B12345678", hash: currentHash, verificacion: `https://comutech.es/verificar/${currentHash}` })
    const qrContainer = document.getElementById('qrContainer')
    qrContainer.innerHTML = ''
    new QRCode(qrContainer, { text: qrData, width: 128, height: 128 })
}

async function guardarFactura() {
    const empresaId = document.getElementById('facturaEmpresaId').value
    const fecha = document.getElementById('facturaFecha').value
    const numero = document.getElementById('facturaNumero').value
    const vencimiento = document.getElementById('facturaVencimiento').value
    const notas = document.getElementById('facturaNotas').value
    const modalidadVerifactu = document.getElementById('modalidadVerifactu').value
    let subtotal = 0
    const lineas = lineasFactura.map(linea => { 
        const importe = linea.cantidad * linea.precio
        subtotal += importe
        return { ...linea, importe }
    })
    const iva = subtotal * 0.21
    const total = subtotal + iva
    const { data: empresa } = await sb.from('empresas').select('nombre_empresa, nif_cif').eq('id', empresaId).single()
    const select = document.getElementById('selectorClienteFactura')
    const nifEmisor = select.options[select.selectedIndex]?.dataset.nif || empresa?.nif_cif || 'B00000000'
    const hashAnterior = await obtenerUltimoHash(nifEmisor)
    const contenidoHash = `${hashAnterior || ''}${numero}${fecha}${total}${nifEmisor}`
    const hashFactura = await generarHash(contenidoHash)
    const { data: registro, error: regError } = await sb.from('registros_facturacion').insert({
        perfil_id: getCurrentUser().id,
        nif_emisor: nifEmisor,
        nombre_razon_social_emisor: "COMUTECH SOLUCIONES SL",
        numero_factura: numero,
        serie_factura: "F",
        fecha_expedicion: new Date(fecha).toISOString(),
        importe_total: total,
        hash_factura: hashFactura,
        hash_factura_anterior: hashAnterior,
        modalidad_verifactu: modalidadVerifactu,
        enviado_aeat: false
    }).select().single()
    if (regError) { 
        mostrarMensaje("❌ Error en registro antifraude: " + regError.message, 'error')
        return
    }
    const { error: factError } = await sb.from('facturas').insert({
        registro_facturacion_id: registro.id,
        empresa_id: empresaId,
        perfil_id: getCurrentUser().id,
        numero_factura: numero,
        fecha_expedicion: new Date(fecha).toISOString(),
        fecha_vencimiento: vencimiento ? new Date(vencimiento).toISOString() : null,
        cliente_nif: nifEmisor,
        cliente_nombre: empresa?.nombre_empresa || '',
        subtotal: subtotal,
        iva_total: iva,
        importe_total: total,
        estado: 'pendiente',
        observaciones: notas
    })
    if (factError) { 
        mostrarMensaje("❌ Error: " + factError.message, 'error')
    } else { 
        mostrarMensaje("✅ Factura creada con hash")
        document.getElementById('modalCrearFactura').style.display = 'none'
        await cargarFacturas()
        const { cargarStats } = await import('./main.js')
        cargarStats()
        const { cargarCumplimiento } = await import('./cumplimiento.js')
        if (typeof cargarCumplimiento === 'function') await cargarCumplimiento()
    }
}

async function descargarFacturaPDF() { 
    const element = document.getElementById('facturaPreview')
    html2pdf().set({ margin: 10, filename: `factura_${new Date().toISOString().split('T')[0]}.pdf` }).from(element).save()
}

export function iniciarModuloFacturacion() {
    cargarFacturas()
    cargarSelectorClientesFactura()
    initSelectorFactura()
    document.getElementById('btnGuardarFactura').onclick = guardarFactura
    document.getElementById('btnCancelarFactura').onclick = () => {
        document.getElementById('modalCrearFactura').style.display = 'none'
    }
    document.getElementById('btnAgregarLinea').onclick = () => {
        lineasFactura.push({ descripcion: "Nuevo servicio", cantidad: 1, precio: 0 })
        renderizarLineasFactura()
        renderizarFacturaPreview()
    }
    document.getElementById('btnFiltrarFacturas').onclick = cargarFacturas
    document.getElementById('btnDescargarFacturaPDF').onclick = descargarFacturaPDF
}
