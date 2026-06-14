// tecnico/js/modules/materiales.js
// Gestión de materiales por tipo de servicio

import { sb } from '../config/supabase.js'
import { getCurrentTecnicoId } from './auth.js'
import { mostrarMensaje, formatMoney } from './utils.js'

// ============================================================
// CATÁLOGO DE MATERIALES POR SERVICIO
// ============================================================

export const materialesPorServicio = {
    'PISCINA': [
        { nombre: 'Cloro granulado', unidad: 'gramos', precio_por_unidad: 0.5 },
        { nombre: 'Cloro líquido', unidad: 'litros', precio_por_unidad: 1.2 },
        { nombre: 'Alguicida', unidad: 'litros', precio_por_unidad: 3.0 },
        { nombre: 'Floculante', unidad: 'litros', precio_por_unidad: 2.5 },
        { nombre: 'Regulador pH +', unidad: 'gramos', precio_por_unidad: 0.8 },
        { nombre: 'Regulador pH -', unidad: 'gramos', precio_por_unidad: 0.8 },
        { nombre: 'Filtro de arena', unidad: 'unidad', precio_por_unidad: 85.0 },
        { nombre: 'Junta de bomba', unidad: 'unidad', precio_por_unidad: 12.0 },
        { nombre: 'Cesto de skimmer', unidad: 'unidad', precio_por_unidad: 6.5 }
    ],
    'JARDIN': [
        { nombre: 'Abono orgánico', unidad: 'gramos', precio_por_unidad: 0.2 },
        { nombre: 'Fertilizante líquido', unidad: 'litros', precio_por_unidad: 1.5 },
        { nombre: 'Herbicida', unidad: 'litros', precio_por_unidad: 4.0 },
        { nombre: 'Tierra vegetal', unidad: 'gramos', precio_por_unidad: 0.1 },
        { nombre: 'Semillas césped', unidad: 'gramos', precio_por_unidad: 0.3 },
        { nombre: 'Fitosanitarios', unidad: 'litros', precio_por_unidad: 5.0 }
    ],
    'FONTANERIA': [
        { nombre: 'Tubería PVC', unidad: 'metros', precio_por_unidad: 2.0 },
        { nombre: 'Codo 90º', unidad: 'unidad', precio_por_unidad: 0.8 },
        { nombre: 'Llave de paso', unidad: 'unidad', precio_por_unidad: 5.0 },
        { nombre: 'Teflón', unidad: 'rollo', precio_por_unidad: 1.5 },
        { nombre: 'Junta tórica', unidad: 'unidad', precio_por_unidad: 0.2 },
        { nombre: 'Silicona', unidad: 'unidad', precio_por_unidad: 2.0 }
    ],
    'ELECTRICIDAD': [
        { nombre: 'Cable eléctrico', unidad: 'metros', precio_por_unidad: 0.8 },
        { nombre: 'Interruptor', unidad: 'unidad', precio_por_unidad: 3.0 },
        { nombre: 'Toma de corriente', unidad: 'unidad', precio_por_unidad: 2.5 },
        { nombre: 'Caja de conexiones', unidad: 'unidad', precio_por_unidad: 1.2 },
        { nombre: 'Termomagnético', unidad: 'unidad', precio_por_unidad: 7.0 },
        { nombre: 'Cinta aislante', unidad: 'rollo', precio_por_unidad: 0.5 }
    ],
    'LIMPIEZA': [
        { nombre: 'Detergente', unidad: 'litros', precio_por_unidad: 1.0 },
        { nombre: 'Desinfectante', unidad: 'litros', precio_por_unidad: 2.0 },
        { nombre: 'Bayetas', unidad: 'unidad', precio_por_unidad: 0.3 },
        { nombre: 'Fregona', unidad: 'unidad', precio_por_unidad: 5.0 },
        { nombre: 'Cubo', unidad: 'unidad', precio_por_unidad: 3.0 },
        { nombre: 'Lejía', unidad: 'litros', precio_por_unidad: 0.8 }
    ],
    'OTRO': [
        { nombre: 'Material varios', unidad: 'unidad', precio_por_unidad: 1.0 }
    ]
}

// ============================================================
// RENDERIZAR SELECT DE MATERIALES
// ============================================================

export function renderizarSelectMateriales(servicioTipo) {
    const materiales = materialesPorServicio[servicioTipo] || materialesPorServicio['OTRO']
    
    let html = '<option value="">-- Seleccionar material --</option>'
    materiales.forEach(m => {
        html += `<option value="${m.nombre}" data-unidad="${m.unidad}" data-precio="${m.precio_por_unidad}">
            ${m.nombre} (${formatMoney(m.precio_por_unidad)}€/${m.unidad})
        </option>`
    })
    
    return html
}

// ============================================================
// AGREGAR MATERIAL A LA TAREA
// ============================================================

export async function agregarMaterial(tareaId, materialData) {
    const { nombre, cantidad, precioUnitario, unidad } = materialData
    
    if (!nombre || cantidad <= 0) {
        mostrarMensaje('Selecciona un material y cantidad válida', 'error')
        return null
    }
    
    const precioFormateado = precioUnitario.toFixed(2)
    const importeTotal = cantidad * precioUnitario
    const importeSinIva = parseFloat((importeTotal / 1.21).toFixed(2))
    const ivaPorcentaje = 21
    const descripcion = `${nombre}: ${cantidad} ${unidad} (${precioFormateado}€/${unidad})`
    const totalCalculado = parseFloat((importeSinIva * (1 + ivaPorcentaje / 100)).toFixed(2))
    
    try {
        const { data, error } = await sb
            .from('gastos_tarea')
            .insert({
                tarea_id: tareaId,
                tecnico_id: getCurrentTecnicoId(),
                tipo_gasto: 'MATERIALES',
                descripcion: descripcion,
                importe_sin_iva: importeSinIva,
                iva_porcentaje: ivaPorcentaje,
                fecha_gasto: new Date().toISOString().split('T')[0],
                estado: 'PENDIENTE'
            })
            .select()
            .single()
        
        if (error) throw error
        
        mostrarMensaje(`✅ Material guardado: ${totalCalculado.toFixed(2)}€`, 'exito')
        
        return {
            id: data.id,
            descripcion: descripcion,
            importe_total: totalCalculado
        }
        
    } catch (error) {
        console.error('Error guardando material:', error)
        mostrarMensaje('❌ Error al guardar material', 'error')
        return null
    }
}

// ============================================================
// ELIMINAR MATERIAL
// ============================================================

export async function eliminarMaterial(materialId) {
    try {
        const { error } = await sb
            .from('gastos_tarea')
            .delete()
            .eq('id', materialId)
        
        if (error) throw error
        
        mostrarMensaje('Material eliminado', 'exito')
        return true
        
    } catch (error) {
        console.error(error)
        mostrarMensaje('Error al eliminar material', 'error')
        return false
    }
}

// ============================================================
// OBTENER MATERIALES DE UNA TAREA
// ============================================================

export async function getMaterialesTarea(tareaId) {
    const { data, error } = await sb
        .from('gastos_tarea')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('tipo_gasto', 'MATERIALES')
    
    if (error) {
        console.error(error)
        return []
    }
    
    return data || []
}

// ============================================================
// CALCULAR TOTAL DE MATERIALES
// ============================================================

export function calcularTotalMateriales(materiales) {
    return materiales.reduce((sum, m) => sum + (m.importe_total || 0), 0)
}