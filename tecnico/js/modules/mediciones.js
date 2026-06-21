// tecnico/js/modules/mediciones.js
import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { mostrarMensaje } from '../utils/utils.js'

export function renderizarMediciones(servicioTipo, soloLectura = false) {
    if (servicioTipo === 'PISCINA') {
        return `<div class="form-group"><label>🔬 MEDICIONES PISCINA</label>
            <div class="mediciones-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <input type="number" step="0.1" min="0" max="10" id="medCloro" placeholder="Cloro (ppm)" ${soloLectura ? 'disabled' : ''}>
                <input type="number" step="0.1" min="0" max="14" id="medPh" placeholder="pH" ${soloLectura ? 'disabled' : ''}>
                <input type="number" step="1" id="medTemp" placeholder="Temperatura (°C)" ${soloLectura ? 'disabled' : ''}>
            </div>
        </div>`
    } else if (servicioTipo === 'JARDIN') {
        return `<div class="form-group"><label>🌳 MEDICIONES JARDÍN</label>
            <div class="mediciones-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <input type="number" step="0.5" id="medAltura" placeholder="Altura césped (cm)" ${soloLectura ? 'disabled' : ''}>
                <select id="medEstado" ${soloLectura ? 'disabled' : ''}><option value="">-- Estado --</option>
                    <option value="Excelente">🌿 Excelente</option><option value="Bueno">✅ Bueno</option>
                    <option value="Regular">⚠️ Regular</option><option value="Malo">❌ Malo</option>
                </select>
            </div>
        </div>`
    } else {
        return `<div class="form-group"><label>📝 OBSERVACIONES</label>
            <textarea id="medObservaciones" rows="2" placeholder="Observaciones del trabajo..." ${soloLectura ? 'disabled' : ''}></textarea>
        </div>`
    }
}

export function obtenerMediciones(servicioTipo) {
    if (servicioTipo === 'PISCINA') {
        return { cloro: document.getElementById('medCloro')?.value || null, ph: document.getElementById('medPh')?.value || null, temperatura: document.getElementById('medTemp')?.value || null }
    } else if (servicioTipo === 'JARDIN') {
        return { altura: document.getElementById('medAltura')?.value || null, estado: document.getElementById('medEstado')?.value || null }
    } else {
        return { observaciones: document.getElementById('medObservaciones')?.value || null }
    }
}

export function limpiarMediciones(servicioTipo) {
    const ids = servicioTipo === 'PISCINA' ? ['medCloro', 'medPh', 'medTemp'] : servicioTipo === 'JARDIN' ? ['medAltura', 'medEstado'] : ['medObservaciones']
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
}

export function validarMediciones(mediciones, servicioTipo) {
    if (!mediciones) return false
    if (servicioTipo === 'PISCINA') return mediciones.cloro || mediciones.ph || mediciones.temperatura
    if (servicioTipo === 'JARDIN') return mediciones.altura || mediciones.estado
    return mediciones.observaciones && mediciones.observaciones.trim() !== ''
}

export async function guardarMedicion(tareaId, medicion) {
    const tecnicoId = getCurrentTecnicoId()
    const { error } = await sb.from('mediciones_dinamicas').insert({
        tarea_id: tareaId, tecnico_id: tecnicoId, servicio_tipo: medicion.servicio_tipo,
        parametros: medicion.parametros, notas_tecnico: medicion.notas_tecnico || '',
        created_at: medicion.fecha || new Date().toISOString()
    })
    if (error) { console.error(error); mostrarMensaje('Error al guardar medición', 'error'); return false }
    return true
}

export async function getMedicionesTarea(tareaId) {
    const { data, error } = await sb.from('mediciones_dinamicas').select('*').eq('tarea_id', tareaId).order('created_at', { ascending: true })
    if (error) { console.error(error); return [] }
    return data || []
}

export function formatearMedicion(medicion) {
    const params = medicion.parametros
    const fecha = new Date(medicion.created_at).toLocaleTimeString()
    let texto = `${fecha} → `
    if (params.cloro) texto += `Cloro: ${params.cloro} ppm, `
    if (params.ph) texto += `pH: ${params.ph}, `
    if (params.temperatura) texto += `Temp: ${params.temperatura}°C, `
    if (params.altura) texto += `Altura: ${params.altura} cm, `
    if (params.estado) texto += `Estado: ${params.estado}, `
    if (params.observaciones) texto += `Obs: ${params.observaciones}`
    return texto.replace(/,\s*$/, '')
}