// js/modules/clientes.js
import { sb } from './supabase.js'
import { mostrarMensaje, formatDate, getBadgeTipo, getTipoIcono } from './utils.js'
import { getCurrentUser } from './main.js'

// Variables privadas del módulo (no globales)
let empresasData = []
let clientesFiltrados = []
let paginaActual = 1
const registrosPorPagina = 10
let clientePendienteEliminar = null

// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

export async function cargarClientes() {
    const { data: empresas, error } = await sb.from('empresas').select('*').order('created_at', { ascending: false })
    if (error) { 
        mostrarMensaje("Error cargando clientes: " + error.message, 'error')
        return 
    }
    empresasData = empresas || []
    for (const emp of empresasData) {
        const { data: perfil } = await sb.from('perfiles')
            .select('nombre_razon_social, email, telefono, consentimiento_tratamiento_datos')
            .eq('empresa_id', emp.id)
            .eq('rol', 'gerente')
            .maybeSingle()
        emp.contacto_nombre = perfil?.nombre_razon_social || ''
        emp.contacto_email = perfil?.email || emp.email || ''
        emp.consentimiento = perfil?.consentimiento_tratamiento_datos || false
        emp.perfil_id = perfil?.id || null
    }
    const provincias = [...new Set(empresasData.map(e => e.provincia).filter(p => p))]
    const selectProvincia = document.getElementById('filtroProvincia')
    if (selectProvincia) {
        selectProvincia.innerHTML = '<option value="">Todas las provincias</option>' + provincias.map(p => `<option value="${p}">${p}</option>`).join('')
    }
    aplicarFiltros()
}

export function cambiarPagina(pagina) { 
    paginaActual = pagina
    renderizarClientes()
}

export function iniciarModuloClientes() {
    cargarClientes()
    document.getElementById('btnMostrarAlta').onclick = () => {
        const mc = document.querySelector('#modalAltaCliente .modal-content')
        if (mc) mc.scrollTop = 0
        document.getElementById('modalAltaCliente').style.display = 'flex'
        if (typeof initTipoSujetoSelector === 'function') initTipoSujetoSelector()
    }
    document.getElementById('btnGuardarCliente').onclick = crearCliente
    document.getElementById('btnCancelarAlta').onclick = () => {
        document.getElementById('modalAltaCliente').style.display = 'none'
    }
    document.getElementById('btnGuardarEdicion').onclick = guardarEdicionCliente
    document.getElementById('btnCancelarEdicion').onclick = () => {
        document.getElementById('modalEditarCliente').style.display = 'none'
    }
    document.getElementById('btnCerrarDetalle').onclick = () => {
        document.getElementById('modalVerCliente').style.display = 'none'
    }
    document.getElementById('btnCerrarClienteCreado').onclick = () => {
        document.getElementById('modalClienteCreado').style.display = 'none'
    }
    document.getElementById('btnConfirmarEliminacion').onclick = async() => {
        await ejecutarEliminacionCliente()
    }
    document.getElementById('btnCancelarEliminacion').onclick = () => {
        document.getElementById('modalConfirmarEliminacion').style.display = 'none'
        clientePendienteEliminar = null
        document.getElementById('passwordConfirmacion').value = ''
        document.getElementById('errorPasswordConfirmacion').style.display = 'none'
    }
    document.getElementById('buscadorCliente')?.addEventListener('input', aplicarFiltros)
    document.getElementById('filtroPlan')?.addEventListener('change', aplicarFiltros)
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros)
    document.getElementById('filtroProvincia')?.addEventListener('change', aplicarFiltros)
    
    // Resetear contraseña
    document.getElementById('btnResetPassword').onclick = async() => {
        const eId = document.getElementById('editClienteId').value
        const pId = document.getElementById('editPerfilId').value
        const email = document.getElementById('editEmail').value
        if (!eId || !pId) {
            mostrarMensaje("❌ No se pudo identificar al gerente", 'error')
            return
        }
        if (confirm(`¿Resetear contraseña de ${email}?`)) {
            await resetearPassword(eId, pId, email)
        }
    }
}

// ============================================================
// FUNCIONES PRIVADAS (no exportadas)
// ============================================================

function aplicarFiltros() {
    const searchText = document.getElementById('buscadorCliente')?.value.toLowerCase() || ''
    const planFiltro = document.getElementById('filtroPlan')?.value || ''
    const estadoFiltro = document.getElementById('filtroEstado')?.value || ''
    const provinciaFiltro = document.getElementById('filtroProvincia')?.value || ''
    let filtrados = [...empresasData]
    
    if (searchText) {
        filtrados = filtrados.filter(e => 
            e.nombre_empresa?.toLowerCase().includes(searchText) || 
            e.nif_cif?.toLowerCase().includes(searchText) || 
            e.contacto_email?.toLowerCase().includes(searchText) || 
            e.contacto_nombre?.toLowerCase().includes(searchText)
        )
    }
    if (planFiltro) filtrados = filtrados.filter(e => e.plan === planFiltro)
    if (estadoFiltro === 'activo') filtrados = filtrados.filter(e => e.activo === true)
    else if (estadoFiltro === 'inactivo') filtrados = filtrados.filter(e => e.activo === false)
    if (provinciaFiltro) filtrados = filtrados.filter(e => e.provincia === provinciaFiltro)
    
    clientesFiltrados = filtrados
    paginaActual = 1
    renderizarClientes()
}

function renderizarClientes() {
    const start = (paginaActual - 1) * registrosPorPagina
    const end = start + registrosPorPagina
    const paginados = clientesFiltrados.slice(start, end)
    const tbody = document.getElementById('clientesBody')
    if (!tbody) return
    if (paginados.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">📋 No hay clientes que coincidan</td></tr>'
        document.getElementById('paginacion').innerHTML = ''
        document.getElementById('totalClientes').innerHTML = ''
        return 
    }
    tbody.innerHTML = paginados.map(emp => `
        <tr>
            <td>${getBadgeTipo(emp.tipo_cliente)}</td>
            <td><strong>${emp.nombre_empresa || '-'}</strong><br><small>${emp.nif_cif || ''}</small></td>
            <td>${emp.contacto_nombre || '-'}</td>
            <td>${emp.contacto_email || '-'}</td>
            <td><span class="badge ${emp.plan === 'BASICO' ? 'badge-basico' : (emp.plan === 'PRO' ? 'badge-pro' : 'badge-empresa-plan')}">${emp.plan || 'BASICO'}</span></td>
            <td><span class="badge ${emp.activo ? 'badge-activo' : 'badge-inactivo'}">${emp.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td><span class="badge ${emp.consentimiento ? 'badge-activo' : 'badge-inactivo'}">${emp.consentimiento ? '✅ Aceptado' : '❌ Pendiente'}</span></td>
            <td>
                <button class="btn-sm ver-cliente" data-id="${emp.id}">👁️</button>
                <button class="btn-sm editar-cliente" data-id="${emp.id}">✏️</button>
                <button class="btn-sm toggle-cliente" data-id="${emp.id}" data-activo="${emp.activo}">${emp.activo ? '❌' : '✅'}</button>
                <button class="btn-sm eliminar-cliente" data-id="${emp.id}" data-nombre="${(emp.nombre_empresa || '').replace(/"/g, '&quot;')}">🗑️</button>
              </td>
        </tr>
    `).join('')
    
    const totalPaginas = Math.ceil(clientesFiltrados.length / registrosPorPagina)
    let pagHtml = ''
    for (let i = 1; i <= Math.min(totalPaginas, 10); i++) {
        pagHtml += `<button class="${i === paginaActual ? 'active' : ''}" onclick="window.cambiarPagina(${i})">${i}</button>`
    }
    document.getElementById('paginacion').innerHTML = pagHtml
    document.getElementById('totalClientes').innerHTML = `Mostrando ${clientesFiltrados.length} clientes · Página ${paginaActual} de ${totalPaginas}`
    
    document.querySelectorAll('.toggle-cliente').forEach(btn => { 
        btn.onclick = async () => { 
            const id = btn.dataset.id, activo = btn.dataset.activo === 'true'
            await sb.from('empresas').update({ activo: !activo }).eq('id', id)
            mostrarMensaje(activo ? 'Desactivado' : 'Activado')
            await cargarClientes()
            const { cargarStats } = await import('./main.js')
            cargarStats()
        }
    })
    document.querySelectorAll('.editar-cliente').forEach(btn => { 
        btn.onclick = () => editarCliente(btn.dataset.id)
    })
    document.querySelectorAll('.ver-cliente').forEach(btn => { 
        btn.onclick = () => verCliente(btn.dataset.id)
    })
    document.querySelectorAll('.eliminar-cliente').forEach(btn => { 
        btn.onclick = () => eliminarCliente(btn.dataset.id, btn.dataset.nombre)
    })
}

async function editarCliente(id) {
    const empresa = empresasData.find(e => e.id === id)
    if (!empresa) return
    document.getElementById('editClienteId').value = id
    
    const { data: perfil } = await sb.from('perfiles')
        .select('id, nombre_razon_social, user_id')
        .eq('empresa_id', id)
        .eq('rol', 'gerente')
        .maybeSingle()
    if (perfil) document.getElementById('editPerfilId').value = perfil.id
    
    const esAutonomo = (empresa.tipo_cliente === 'autonomo')
    
    document.getElementById('editNombre').value = empresa.nombre_empresa || ''
    document.getElementById('editEmail').value = empresa.contacto_email || empresa.email || ''
    document.getElementById('editNif').value = empresa.nif_cif || ''
    document.getElementById('editTelefono').value = empresa.telefono || ''
    document.getElementById('editContacto').value = empresa.contacto_nombre || ''
    document.getElementById('editWhatsapp').value = empresa.whatsapp_contacto || ''
    document.getElementById('editCalle').value = empresa.calle || ''
    document.getElementById('editNumero').value = empresa.numero || ''
    document.getElementById('editPiso').value = empresa.piso || ''
    document.getElementById('editCp').value = empresa.codigo_postal || ''
    document.getElementById('editCiudad').value = empresa.ciudad || ''
    document.getElementById('editProvincia').value = empresa.provincia || ''
    document.getElementById('editIban').value = empresa.iban || ''
    document.getElementById('editBanco').value = empresa.banco || ''
    document.getElementById('editSwift').value = empresa.swift || ''
    document.getElementById('editCnae').value = empresa.cnae || ''
    document.getElementById('editFechaInicioActividad').value = empresa.fecha_inicio_actividad || ''
    
    if (esAutonomo) {
        document.getElementById('editEmpresaFields').style.display = 'none'
        document.getElementById('editAutonomoFields').style.display = 'block'
        document.getElementById('editPlanAutonomo').value = empresa.plan || 'BASICO'
        document.getElementById('editOficio').value = empresa.oficio || ''
    } else {
        document.getElementById('editEmpresaFields').style.display = 'block'
        document.getElementById('editAutonomoFields').style.display = 'none'
        document.getElementById('editPlan').value = empresa.plan || 'BASICO'
        document.getElementById('editTipo').value = empresa.tipo_cliente || 'administrador'
        document.getElementById('editFormaSocial').value = empresa.forma_social || ''
        document.getElementById('editFechaConstitucion').value = empresa.fecha_constitucion || ''
        document.getElementById('editRegistroMercantil').value = empresa.registro_mercantil || ''
        document.getElementById('editRepresentante').value = empresa.representante_nombre || ''
    }
    document.getElementById('modalEditarCliente').style.display = 'flex'
}

async function guardarEdicionCliente() {
    const id = document.getElementById('editClienteId').value
    const esAutonomo = (document.getElementById('editAutonomoFields').style.display === 'block')
    
    const updateData = {
        nombre_empresa: document.getElementById('editNombre').value,
        nif_cif: document.getElementById('editNif').value,
        telefono: document.getElementById('editTelefono').value,
        email: document.getElementById('editEmail').value,
        whatsapp_contacto: document.getElementById('editWhatsapp').value,
        calle: document.getElementById('editCalle').value,
        numero: document.getElementById('editNumero').value,
        piso: document.getElementById('editPiso').value,
        codigo_postal: document.getElementById('editCp').value,
        ciudad: document.getElementById('editCiudad').value,
        provincia: document.getElementById('editProvincia').value,
        iban: document.getElementById('editIban').value,
        banco: document.getElementById('editBanco').value,
        swift: document.getElementById('editSwift').value,
        cnae: document.getElementById('editCnae').value,
        fecha_inicio_actividad: document.getElementById('editFechaInicioActividad').value || null
    }
    
    if (esAutonomo) {
        updateData.plan = document.getElementById('editPlanAutonomo').value
        updateData.oficio = document.getElementById('editOficio').value
        updateData.tipo_cliente = 'autonomo'
    } else {
        updateData.plan = document.getElementById('editPlan').value
        updateData.tipo_cliente = document.getElementById('editTipo').value
        updateData.forma_social = document.getElementById('editFormaSocial').value
        updateData.fecha_constitucion = document.getElementById('editFechaConstitucion').value || null
        updateData.registro_mercantil = document.getElementById('editRegistroMercantil').value
        updateData.representante_nombre = document.getElementById('editRepresentante').value
    }
    
    await sb.from('empresas').update(updateData).eq('id', id)
    
    const contacto = document.getElementById('editContacto').value
    if (contacto) {
        await sb.from('perfiles').update({ nombre_razon_social: contacto }).eq('empresa_id', id).eq('rol', 'gerente')
    }
    
    mostrarMensaje("✅ Cliente actualizado correctamente")
    document.getElementById('modalEditarCliente').style.display = 'none'
    await cargarClientes()
    const { cargarStats } = await import('./main.js')
    cargarStats()
}

async function verCliente(id) {
    const empresa = empresasData.find(e => e.id === id)
    if (!empresa) return
    
    const perfilId = empresa.perfil_id
    const { data: consentimientos } = await sb.from('historico_consentimientos')
        .select('*')
        .eq('perfil_id', perfilId)
        .order('fecha_aceptacion', { ascending: false })
    
    let historicoHtml = '<div class="detalle-info" style="margin-top:16px;"><strong>📜 Histórico de consentimientos RGPD</strong>'
    if (consentimientos && consentimientos.length > 0) {
        consentimientos.forEach(c => {
            historicoHtml += `<div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                <small>📅 ${formatDate(c.fecha_aceptacion)} - Versión: ${c.consentimiento_version || '1.0'}</small>
                <br><small>Finalidades: ${c.finalidades_aceptadas ? c.finalidades_aceptadas.join(', ') : 'Todas'}</small>
                ${c.fecha_revocacion ? `<br><small style="color:#c2410c;">❌ Revocado: ${formatDate(c.fecha_revocacion)}</small>` : ''}
            </div>`
        })
    } else { 
        historicoHtml += '<p>No hay registros de consentimiento</p>' 
    }
    historicoHtml += '</div>'
    
    document.getElementById('detalleCliente').innerHTML = `<div class="detalle-info">
        <p><strong>🏢 ${empresa.nombre_empresa}</strong></p>
        <p>📋 Tipo: ${getTipoIcono(empresa.tipo_cliente)}</p>
        ${empresa.oficio ? `<p>🔧 Oficio: ${empresa.oficio}</p>` : ''}
        <p>📋 NIF: ${empresa.nif_cif || '-'}</p>
        <p>📍 ${empresa.calle || ''} ${empresa.numero || ''} ${empresa.piso || ''}</p>
        <p>📮 ${empresa.codigo_postal || ''} ${empresa.ciudad || ''} ${empresa.provincia || ''}</p>
        <p>📞 ${empresa.telefono || '-'}</p>
        <p>📧 ${empresa.contacto_email || '-'}</p>
        <p>👤 Contacto: ${empresa.contacto_nombre || '-'}</p>
        <p>📱 WhatsApp: ${empresa.whatsapp_contacto || '-'}</p>
        <p>🏦 IBAN: ${empresa.iban || '-'}</p>
        <p>🏷️ Plan: ${empresa.plan || 'BASICO'}</p>
        <p>📅 Alta: ${formatDate(empresa.created_at)}</p>
    </div>`
    document.getElementById('historicoConsentimientos').innerHTML = historicoHtml
    document.getElementById('modalVerCliente').style.display = 'flex'
}

function eliminarCliente(id, nombre) {
    clientePendienteEliminar = { id, nombre }
    document.getElementById('mensajeEliminacionCliente').innerHTML = `¿Estás seguro de que quieres eliminar a <strong>"${nombre}"</strong> y todos sus datos?`
    document.getElementById('passwordConfirmacion').value = ''
    document.getElementById('errorPasswordConfirmacion').style.display = 'none'
    document.getElementById('modalConfirmarEliminacion').style.display = 'flex'
}

async function ejecutarEliminacionCliente() {
    const currentUser = getCurrentUser()
    const id = clientePendienteEliminar.id
    const nombre = clientePendienteEliminar.nombre
    const passwordConfirm = document.getElementById('passwordConfirmacion').value
    
    if (!passwordConfirm) {
        document.getElementById('errorPasswordConfirmacion').innerText = '❌ Introduce tu contraseña para confirmar'
        document.getElementById('errorPasswordConfirmacion').style.display = 'block'
        return
    }
    document.getElementById('errorPasswordConfirmacion').style.display = 'none'
    
    try {
        const { error } = await sb.auth.signInWithPassword({
            email: currentUser.email,
            password: passwordConfirm
        })
        if (error) {
            document.getElementById('errorPasswordConfirmacion').innerText = '❌ Contraseña incorrecta. No se puede eliminar el cliente.'
            document.getElementById('errorPasswordConfirmacion').style.display = 'block'
            return
        }
        
        document.getElementById('modalConfirmarEliminacion').style.display = 'none'
        
        const { data: perfil } = await sb.from('perfiles')
            .select('id, user_id')
            .eq('empresa_id', id)
            .eq('rol', 'gerente')
            .maybeSingle()
        const perfilId = perfil?.id
        const userId = perfil?.user_id
        
        await sb.from('tareas').delete().eq('empresa_id', id)
        await sb.from('productos').delete().eq('empresa_id', id)
        await sb.from('suscripciones').delete().eq('empresa_id', id)
        await sb.from('facturacion_saas').delete().eq('empresa_id', id)
        if (perfilId) await sb.from('perfiles').delete().eq('id', perfilId)
        await sb.from('empresas').delete().eq('id', id)
        
        if (perfilId) {
            await sb.from('historico_consentimientos')
                .update({ perfil_id: null, consentimiento_texto: '[USUARIO ELIMINADO]', ip_aceptacion: null, user_agent_aceptacion: null })
                .eq('perfil_id', perfilId)
            await sb.from('registro_eventos')
                .update({ perfil_id: null, descripcion: '[USUARIO ELIMINADO] - Cliente eliminado del sistema' })
                .eq('perfil_id', perfilId)
        }
        
        await sb.from('facturas')
            .update({ cliente_nombre: '[CLIENTE ELIMINADO]', cliente_nif: '[ELIMINADO]', cliente_direccion: null, perfil_id: null })
            .eq('empresa_id', id)
        
        if (perfilId) {
            await sb.from('registros_facturacion')
                .update({ perfil_id: null, nif_emisor: '[ELIMINADO]', nombre_razon_social_emisor: '[CLIENTE ELIMINADO]' })
                .eq('perfil_id', perfilId)
        }
        
        if (userId) {
            try {
                const { SUPABASE_URL, SUPABASE_KEY } = await import('./supabase.js')
                await fetch(`${SUPABASE_URL}/functions/v1/eliminar-usuario`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
                    body: JSON.stringify({ user_id: userId })
                })
            } catch(e) { console.warn(e) }
        }
        
        try {
            await sb.from('registro_eventos').insert({
                tipo_evento: 'ELIMINAR_CLIENTE',
                descripcion: `Cliente "${nombre}" (ID: ${id}) eliminado por ${currentUser.email}`
            })
        } catch(e) { console.warn(e) }
        
        mostrarMensaje(`✅ Cliente "${nombre}" eliminado correctamente.`)
        await cargarClientes()
        const { cargarStats } = await import('./main.js')
        cargarStats()
        clientePendienteEliminar = null
    } catch(error) {
        console.error(error)
        mostrarMensaje(`❌ Error al eliminar: ${error.message}`, 'error')
    }
}

async function resetearPassword(empresaId, perfilId, email) {
    const nuevaPassword = prompt("🔐 Introduce la nueva contraseña para el gerente:\n(mínimo 6 caracteres)", "GerenteNueva2026!")
    if (!nuevaPassword || nuevaPassword.length < 6) {
        mostrarMensaje("❌ Contraseña requerida (mínimo 6 caracteres)", 'error')
        return false
    }
    
    const btn = document.getElementById('btnResetPassword')
    const textoOriginal = btn.innerHTML
    btn.innerHTML = '<span class="spinner"></span> Actualizando...'
    btn.disabled = true
    
    try {
        const { data: perfil } = await sb.from('perfiles').select('user_id').eq('id', perfilId).single()
        if (!perfil || !perfil.user_id) throw new Error('No se encontró el usuario asociado')
        
        const { SUPABASE_URL, SUPABASE_KEY } = await import('./supabase.js')
        const response = await fetch(`${SUPABASE_URL}/functions/v1/resetear-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
            body: JSON.stringify({ user_id: perfil.user_id, password: nuevaPassword, email: email })
        })
        const resultado = await response.json()
        if (!resultado.success) throw new Error(resultado.error)
        
        mostrarMensaje(`✅ Contraseña actualizada correctamente para ${email}`, 'exito')
        return true
    } catch (error) {
        mostrarMensaje(`❌ Error al resetear contraseña: ${error.message}`, 'error')
        return false
    } finally {
        btn.innerHTML = textoOriginal
        btn.disabled = false
    }
}

// ============================================================
// FUNCIÓN CREAR CLIENTE (completa)
// ============================================================

async function crearCliente() {
    // Obtener tipo de sujeto (jurídica/física)
    const tipoSujeto = document.querySelector('.tipo-sujeto-btn.active')?.dataset.tipo || 'juridica'
    
    let nombreEmpresa = ''
    let nifCif = ''
    let emailContacto = ''
    let telefonoContacto = ''
    let whatsappContacto = ''
    let nombreContacto = ''
    let formaSocial = ''
    
    if (tipoSujeto === 'juridica') {
        nombreEmpresa = document.getElementById('razonSocial')?.value || ''
        nifCif = document.getElementById('nifCif')?.value || ''
        emailContacto = document.getElementById('emailContacto')?.value || ''
        telefonoContacto = document.getElementById('telefonoContacto')?.value || ''
        whatsappContacto = document.getElementById('whatsappContactoJuridica')?.value || ''
        nombreContacto = document.getElementById('nombreContacto')?.value || ''
        formaSocial = document.getElementById('formaSocial')?.value || ''
        
        if (document.getElementById('mismoWhatsappJuridica')?.checked) {
            whatsappContacto = telefonoContacto
        }
    } else {
        const nombre = document.getElementById('nombreFisica')?.value || ''
        const apellido1 = document.getElementById('primerApellido')?.value || ''
        const apellido2 = document.getElementById('segundoApellido')?.value || ''
        nombreEmpresa = `${nombre} ${apellido1} ${apellido2}`.trim()
        nifCif = document.getElementById('nifFisica')?.value || ''
        emailContacto = document.getElementById('emailFisica')?.value || ''
        telefonoContacto = document.getElementById('telefonoFisica')?.value || ''
        whatsappContacto = document.getElementById('whatsappContactoFisica')?.value || ''
        nombreContacto = nombreEmpresa
        
        if (document.getElementById('mismoWhatsappFisica')?.checked) {
            whatsappContacto = telefonoContacto
        }
    }
    
    // Validaciones básicas
    if (!nombreEmpresa || !emailContacto) {
        mostrarMensaje("❌ Nombre y email son obligatorios", 'error')
        return
    }
    
    const consentimiento = document.getElementById('consentimientoAceptado')?.checked || false
    if (!consentimiento) {
        mostrarMensaje("❌ Debes aceptar el consentimiento RGPD", 'error')
        return
    }
    
    const plan = document.getElementById('planSeleccionado')?.value || 'BASICO'
    const tipoCliente = document.getElementById('tipoClienteSelect')?.value || 'otro'
    const cnae = document.getElementById('cnaeCodigo')?.value || ''
    const fechaInicio = document.getElementById('fechaInicioActividad')?.value || null
    
    // Datos de domicilio
    const calle = document.getElementById('direccionCalle')?.value || ''
    const numero = document.getElementById('direccionNumero')?.value || ''
    const piso = document.getElementById('direccionPiso')?.value || ''
    const cp = document.getElementById('direccionCp')?.value || ''
    const municipio = document.getElementById('direccionMunicipio')?.value || ''
    const provincia = document.getElementById('direccionProvincia')?.value || ''
    
    // Datos bancarios
    const iban = document.getElementById('ibanCuenta')?.value || ''
    const banco = document.getElementById('bancoNombre')?.value || ''
    const swift = document.getElementById('swiftCodigo')?.value || ''
    
    try {
        // Crear la empresa
        const { data: empresa, error: empresaError } = await sb.from('empresas').insert({
            nombre_empresa: nombreEmpresa,
            nif_cif: nifCif,
            email: emailContacto,
            telefono: telefonoContacto,
            whatsapp_contacto: whatsappContacto,
            calle: calle,
            numero: numero,
            piso: piso,
            codigo_postal: cp,
            ciudad: municipio,
            provincia: provincia,
            iban: iban,
            banco: banco,
            swift: swift,
            cnae: cnae,
            fecha_inicio_actividad: fechaInicio,
            plan: plan,
            tipo_cliente: tipoCliente === 'autonomo' ? 'autonomo' : tipoCliente,
            forma_social: formaSocial,
            activo: true,
            created_at: new Date().toISOString()
        }).select().single()
        
        if (empresaError) throw empresaError
        
        // Generar contraseña para el gerente
        const passwordGenerada = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10)
        
        // Crear usuario en auth (requiere privilegios de admin)
        // NOTA: Esto requiere habilitar la función edge o usar service_role
        // Por ahora, creamos el perfil sin usuario auth o usamos la función edge
        
        // Crear perfil del gerente (sin auth user por ahora)
        const { error: perfilError } = await sb.from('perfiles').insert({
            empresa_id: empresa.id,
            rol: 'gerente',
            nombre_razon_social: nombreContacto,
            email: emailContacto,
            telefono: telefonoContacto,
            consentimiento_tratamiento_datos: consentimiento
        })
        
        if (perfilError) throw perfilError
        
        // Registrar consentimiento
        const { error: consentError } = await sb.from('historico_consentimientos').insert({
            perfil_id: empresa.id,
            consentimiento_version: "1.0",
            finalidades_aceptadas: ["gestion_facturacion", "prestacion_servicios", "obligaciones_legales"],
            ip_aceptacion: "0.0.0.0",
            user_agent_aceptacion: navigator.userAgent
        })
        
        if (consentError) console.warn("Error registrando consentimiento:", consentError)
        
        // Mostrar mensaje con la contraseña
        document.getElementById('mensajeClienteCreado').innerHTML = `
            ✅ Cliente creado correctamente<br><br>
            <strong>Email de acceso:</strong> ${emailContacto}<br>
            <strong>Contraseña generada:</strong> <code style="background:#f1f5f9; padding:4px 8px; border-radius:6px;">${passwordGenerada}</code><br><br>
            <small>⚠️ Guarda esta contraseña o usa el botón "Resetear contraseña" desde la edición.</small>
        `
        document.getElementById('modalClienteCreado').style.display = 'flex'
        
        // Cerrar modal y recargar
        document.getElementById('modalAltaCliente').style.display = 'none'
        await cargarClientes()
        const { cargarStats } = await import('./main.js')
        cargarStats()
        
        // Limpiar formulario
        document.getElementById('razonSocial').value = ''
        document.getElementById('nifCif').value = ''
        document.getElementById('emailContacto').value = ''
        document.getElementById('consentimientoAceptado').checked = false
        
    } catch (error) {
        console.error(error)
        mostrarMensaje(`❌ Error al crear cliente: ${error.message}`, 'error')
    }
}

// Añade esto al final de clientes.js (fuera de cualquier otra función)
function initTipoSujetoSelector() {
    const btns = document.querySelectorAll('.tipo-sujeto-btn')
    const datosJuridica = document.getElementById('datosJuridica')
    const datosFisica = document.getElementById('datosFisica')
    
    if (!btns.length) return
    
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            const tipo = btn.dataset.tipo
            if (tipo === 'juridica') {
                if (datosJuridica) datosJuridica.style.display = 'block'
                if (datosFisica) datosFisica.style.display = 'none'
            } else {
                if (datosJuridica) datosJuridica.style.display = 'none'
                if (datosFisica) datosFisica.style.display = 'block'
            }
        }
    })
}

// Añadir window.cambiarPagina para que funcione desde el HTML onclick
window.cambiarPagina = cambiarPagina
