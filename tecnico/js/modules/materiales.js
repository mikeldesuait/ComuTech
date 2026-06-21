// tecnico/js/modules/materiales.js
import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { mostrarMensaje, formatMoney } from '../utils/utils.js'

export const materialesPorServicio = {
    'PISCINA': [
        { nombre: 'Cloro granulado', unidad: 'gramos', precio: 0.5 },
        { nombre: 'Cloro líquido', unidad: 'litros', precio: 1.2 },
        { nombre: 'Alguicida', unidad: 'litros', precio: 3.0 }
    ],
    'JARDIN': [
        { nombre: 'Abono orgánico', unidad: 'gramos', precio: 0.2 },
        { nombre: 'Fertilizante líquido', unidad: 'litros', precio: 1.5 },
        { nombre: 'Herbicida', unidad: 'litros', precio: 4.0 }
    ],
    'OTRO': [
        { nombre: 'Material varios', unidad: 'unidad', precio: 1.0 }
    ]
}

export function renderizarSelectMateriales(servicioTipo) {
    const materiales = materialesPorServicio[servicioTipo] || materialesPorServicio['OTRO']
    let html = '<option value="">-- Seleccionar material --</option>'
    materiales.forEach(m => {
        html += `<option value="${m.nombre}" data-unidad="${m.unidad}" data-precio="${m.precio}">
            ${m.nombre} (${formatMoney(m.precio)}€/${m.unidad})
        </option>`
    })
    return html
}

export function renderizarListaMateriales() {
    return `<div class="container"><div class="card">
        <div class="card-header">📦 Materiales disponibles</div>
        <div class="text-center" style="padding:40px; color:var(--ios-gray);">
            <p>📦 Catálogo de materiales por servicio</p>
            <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top:16px;">
                ${Object.keys(materialesPorServicio).map(s => `
                    <div class="card" style="min-width:150px; text-align:left; padding:12px;">
                        <strong>${s}</strong>
                        <ul style="list-style:none; padding:0; margin-top:8px; font-size:13px;">
                            ${materialesPorServicio[s].map(m => `<li>• ${m.nombre} (${formatMoney(m.precio)}€/${m.unidad})</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
    </div></div>`
}

export async function agregarMaterial(tareaId, materialData) {
    const { nombre, cantidad, precioUnitario, unidad } = materialData
    if (!nombre || cantidad <= 0) {
        mostrarMensaje('Selecciona un material y cantidad válida', 'error')
        return null
    }
    const descripcion = `${nombre}: ${cantidad} ${unidad} (${precioUnitario.toFixed(2)}€/${unidad})`
    const total = cantidad * precioUnitario
    try {
        const { data, error } = await sb.from('gastos_tarea').insert({
            tarea_id: tareaId,
            tecnico_id: getCurrentTecnicoId(),
            tipo_gasto: 'MATERIALES',
            descripcion,
            importe_sin_iva: total / 1.21,
            iva_porcentaje: 21,
            fecha_gasto: new Date().toISOString().split('T')[0],
            estado: 'PENDIENTE'
        }).select().single()
        if (error) throw error
        mostrarMensaje(`✅ Material guardado: ${total.toFixed(2)}€`, 'exito')
        return { id: data.id, descripcion, importe_total: total }
    } catch (error) {
        console.error(error)
        mostrarMensaje('❌ Error al guardar material', 'error')
        return null
    }
}

// ✅ ELIMINAR MATERIAL - AHORA SÍ EXPORTADO
export async function eliminarMaterial(materialId) {
    try {
        const { error } = await sb.from('gastos_tarea').delete().eq('id', materialId)
        if (error) throw error
        mostrarMensaje('✅ Material eliminado', 'exito')
        return true
    } catch (error) {
        console.error(error)
        mostrarMensaje('❌ Error al eliminar material', 'error')
        return false
    }
}

export async function getMaterialesTarea(tareaId) {
    const { data, error } = await sb.from('gastos_tarea')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('tipo_gasto', 'MATERIALES')
    if (error) {
        console.error(error)
        return []
    }
    return data || []
}

export function calcularTotalMateriales(materiales) {
    return materiales.reduce((sum, m) => sum + (m.importe_total || 0), 0)
}