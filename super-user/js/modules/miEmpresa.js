// js/modules/miEmpresa.js
// 🏢 DATOS DE FACTURACIÓN DE MI EMPRESA

import { sb } from './supabase.js'
import { mostrarModalInformativo, abrirModal, cerrarModal, mostrarModalCarga, cerrarModalCarga } from './modales/modalesGenerales.js'

const TEMPLATE_URL = 'templates/mi-empresa.html'
const CONTAINER_ID = 'miEmpresaContainer'

let empresaId = null

async function cargarTemplate() {
    try {
        const response = await fetch(TEMPLATE_URL)
        if (!response.ok) throw new Error(`Error cargando template`)
        const html = await response.text()
        document.getElementById(CONTAINER_ID).innerHTML = html
        return true
    } catch (error) {
        mostrarModalInformativo('Error', 'No se pudo cargar el formulario', 'error')
        return false
    }
}

async function cargarDatosEmpresa() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    
    const { data: perfil } = await sb
        .from('perfiles')
        .select('empresa_id')
        .eq('user_id', user.id)
        .single()
    
    if (!perfil?.empresa_id) {
        mostrarModalInformativo('Aviso', 'No tienes una empresa asociada. Crea una desde el panel de clientes.', 'error')
        return null
    }
    
    empresaId = perfil.empresa_id
    
    const { data: empresa } = await sb
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single()
    
    return empresa
}

function cargarDatosEnFormulario(empresa) {
    if (!empresa) return
    
    document.getElementById('empresaNombre').value = empresa.nombre_empresa || ''
    document.getElementById('empresaEmail').value = empresa.email || ''
    document.getElementById('empresaNif').value = empresa.nif_cif || ''
    document.getElementById('empresaTelefono').value = empresa.telefono || ''
    document.getElementById('empresaWeb').value = empresa.web || ''
    document.getElementById('empresaCalle').value = empresa.calle || ''
    document.getElementById('empresaNumero').value = empresa.numero || ''
    document.getElementById('empresaPiso').value = empresa.piso || ''
    document.getElementById('empresaCp').value = empresa.codigo_postal || ''
    document.getElementById('empresaCiudad').value = empresa.ciudad || empresa.municipio || ''
    document.getElementById('empresaProvincia').value = empresa.provincia || ''
    document.getElementById('empresaIban').value = empresa.iban || ''
    document.getElementById('empresaBanco').value = empresa.banco || ''
    document.getElementById('empresaSwift').value = empresa.swift || ''
}

function recogerDatosFormulario() {
    return {
        nombre_empresa: document.getElementById('empresaNombre')?.value.trim() || '',
        email: document.getElementById('empresaEmail')?.value.trim() || '',
        nif_cif: document.getElementById('empresaNif')?.value.trim() || '',
        telefono: document.getElementById('empresaTelefono')?.value.trim() || '',
        web: document.getElementById('empresaWeb')?.value.trim() || '',
        calle: document.getElementById('empresaCalle')?.value.trim() || '',
        numero: document.getElementById('empresaNumero')?.value.trim() || '',
        piso: document.getElementById('empresaPiso')?.value.trim() || '',
        codigo_postal: document.getElementById('empresaCp')?.value.trim() || '',
        ciudad: document.getElementById('empresaCiudad')?.value.trim() || '',
        provincia: document.getElementById('empresaProvincia')?.value.trim() || '',
        iban: document.getElementById('empresaIban')?.value.trim() || '',
        banco: document.getElementById('empresaBanco')?.value.trim() || '',
        swift: document.getElementById('empresaSwift')?.value.trim() || ''
    }
}

async function guardarCambios(datos) {
    if (!empresaId) {
        mostrarModalInformativo('Error', 'No se encontró la empresa', 'error')
        return
    }
    
    mostrarModalCarga('Guardando cambios...')
    
    try {
        const { error } = await sb
            .from('empresas')
            .update({
                nombre_empresa: datos.nombre_empresa,
                email: datos.email,
                nif_cif: datos.nif_cif,
                telefono: datos.telefono,
                web: datos.web,
                calle: datos.calle,
                numero: datos.numero,
                piso: datos.piso,
                codigo_postal: datos.codigo_postal,
                ciudad: datos.ciudad,
                provincia: datos.provincia,
                iban: datos.iban,
                banco: datos.banco,
                swift: datos.swift
            })
            .eq('id', empresaId)
        
        if (error) throw error
        
        cerrarModalCarga()
        cerrarModal('modalMiEmpresa')
        mostrarModalInformativo('✅ Empresa actualizada', 'Los datos de facturación se han guardado correctamente', 'exito')
        
        const nombreAdmin = document.getElementById('nombreAdmin')
        if (nombreAdmin) nombreAdmin.innerHTML = datos.nombre_empresa
        
    } catch (error) {
        cerrarModalCarga()
        console.error(error)
        mostrarModalInformativo('Error', error.message, 'error')
    }
}

export async function abrirModalMiEmpresa() {
    const empresa = await cargarDatosEmpresa()
    if (!empresa) return
    
    const cargado = await cargarTemplate()
    if (!cargado) return
    
    cargarDatosEnFormulario(empresa)
    
    const btnGuardar = document.getElementById('btnGuardarEmpresa')
    const btnCancelar = document.getElementById('btnCancelarEmpresa')
    
    if (btnGuardar) {
        const nuevoBtn = btnGuardar.cloneNode(true)
        btnGuardar.parentNode.replaceChild(nuevoBtn, btnGuardar)
        nuevoBtn.onclick = async () => {
            const datos = recogerDatosFormulario()
            await guardarCambios(datos)
        }
    }
    
    if (btnCancelar) {
        const nuevoBtn = btnCancelar.cloneNode(true)
        btnCancelar.parentNode.replaceChild(nuevoBtn, btnCancelar)
        nuevoBtn.onclick = () => cerrarModal('modalMiEmpresa')
    }
    
    abrirModal('modalMiEmpresa')
}

export default {
    abrirModalMiEmpresa
}