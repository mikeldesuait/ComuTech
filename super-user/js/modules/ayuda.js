// js/modules/ayuda.js

const FAQS = [
    {
        id: 'crear-cliente',
        titulo: '📝 ¿Cómo crear un cliente?',
        modulo: 'clientes',
        pasos: [
            '1️⃣ Ve a la pestaña "Clientes" (🏢) en la parte inferior',
            '2️⃣ Haz clic en el botón "+ Nuevo cliente" (arriba a la derecha)',
            '3️⃣ Selecciona "Empresa" o "Autónomo" según el tipo',
            '4️⃣ Completa los datos obligatorios: Razón Social y Email',
            '5️⃣ Haz clic en "Guardar cliente"',
            '6️⃣ Acepta el RGPD y el Contrato de servicios',
            '7️⃣ ¡Cliente creado! La contraseña se generará automáticamente'
        ]
    },
    {
        id: 'crear-factura',
        titulo: '💰 ¿Cómo generar una factura?',
        modulo: 'facturacion',
        pasos: [
            '1️⃣ Ve a la pestaña "Facturación" (💰)',
            '2️⃣ Haz clic en "+ Nueva factura"',
            '3️⃣ Selecciona el cliente',
            '4️⃣ Añade productos/servicios (selecciona cantidad y producto)',
            '5️⃣ Verifica el total',
            '6️⃣ Haz clic en "Generar"',
            '7️⃣ Confirma con tu contraseña',
            '8️⃣ ¡Factura creada! Puedes descargar PDF o XML'
        ]
    },
    {
        id: 'subir-gasto',
        titulo: '📸 ¿Cómo subir una factura de gasto?',
        modulo: 'gastos',
        pasos: [
            '1️⃣ Ve a la pestaña "Gastos" (📉)',
            '2️⃣ Haz clic en "Subir factura"',
            '3️⃣ Selecciona la imagen de la factura (foto o escaneo)',
            '4️⃣ Espera a que el OCR extraiga los datos automáticamente',
            '5️⃣ Revisa los datos extraídos (proveedor, importe, fecha)',
            '6️⃣ Completa la categoría y el email de destino',
            '7️⃣ Haz clic en "Procesar y guardar"',
            '8️⃣ El gasto se guardará y recibirás una copia por email'
        ]
    },
    {
        id: 'gastos',
        titulo: '📉 ¿Cómo gestionar gastos?',
        modulo: 'gastos',
        pasos: [
            '1️⃣ Ve a la pestaña "Gastos" (📉)',
            '2️⃣ Puedes añadir gastos manualmente con "+ Nuevo gasto"',
            '3️⃣ O subir facturas escaneadas con "Subir factura"',
            '4️⃣ Usa los filtros por fecha y categoría para buscar',
            '5️⃣ El resumen muestra total de gastos e IVA soportado',
            '6️⃣ Los gastos se usan para el informe trimestral de IVA'
        ]
    },
    {
        id: 'rectificar-factura',
        titulo: '🔄 ¿Cómo rectificar una factura?',
        modulo: 'facturacion',
        pasos: [
            '1️⃣ Ve a "Facturación" y busca la factura',
            '2️⃣ Haz clic en 👁️ para verla',
            '3️⃣ Selecciona "Rectificar"',
            '4️⃣ Elige el tipo: Abono total, Abono parcial o Sustitutiva',
            '5️⃣ Indica el motivo',
            '6️⃣ Confirma',
            '7️⃣ Se generará una factura rectificativa'
        ]
    },
    {
        id: 'registrar-cobro',
        titulo: '💵 ¿Cómo registrar un cobro?',
        modulo: 'facturacion',
        pasos: [
            '1️⃣ Ve a "Facturación"',
            '2️⃣ Localiza la factura pendiente',
            '3️⃣ Haz clic en el botón 💵 (cobro rápido)',
            '4️⃣ Introduce el importe cobrado',
            '5️⃣ Selecciona fecha y forma de pago',
            '6️⃣ Confirma',
            '7️⃣ El saldo pendiente se actualizará automáticamente'
        ]
    },
    {
        id: 'crear-producto',
        titulo: '📦 ¿Cómo crear un producto?',
        modulo: 'productos',
        pasos: [
            '1️⃣ Ve a la pestaña "Productos" (📦)',
            '2️⃣ Haz clic en "+ Nuevo producto"',
            '3️⃣ Completa: Nombre, precio e IVA',
            '4️⃣ Opcional: Código, descripción, unidad',
            '5️⃣ Haz clic en "Guardar"',
            '6️⃣ El producto aparecerá en el catálogo y en las facturas'
        ]
    },
    {
        id: 'mi-perfil',
        titulo: '👤 ¿Cómo cambiar mis datos personales?',
        modulo: 'perfil',
        pasos: [
            '1️⃣ Haz clic en el botón 👤 (arriba a la derecha)',
            '2️⃣ Edita tu nombre y teléfono',
            '3️⃣ Guarda los cambios',
            '4️⃣ También puedes cambiar tu contraseña'
        ]
    },
    {
        id: 'mi-empresa',
        titulo: '🏢 ¿Cómo configurar mis datos fiscales?',
        modulo: 'empresa',
        pasos: [
            '1️⃣ Haz clic en el botón 🏢 (arriba a la derecha)',
            '2️⃣ Completa: Razón Social, NIF, dirección',
            '3️⃣ Añade tus datos bancarios (IBAN, banco, SWIFT)',
            '4️⃣ Guarda los cambios',
            '5️⃣ Estos datos aparecerán en tus facturas'
        ]
    }
];

export function initAyuda() {
    setupBotonAyuda();
}

function setupBotonAyuda() {
    const btnAyuda = document.getElementById('btnAyuda');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            abrirModalAyuda();
        };
    }
}

function abrirModalAyuda() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">❓ Centro de Ayuda</div>
            <div class="ayuda-buscador" style="padding: 12px 16px; border-bottom: 1px solid var(--ios-border);">
                <input type="text" id="buscadorAyudaModal" placeholder="🔍 Buscar ayuda..." style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--ios-border); font-size: 14px;">
            </div>
            <div id="ayudaContenidoModal" class="ayuda-contenido" style="flex: 1; overflow-y: auto; padding: 16px;">
                ${renderizarFaqs(FAQS)}
            </div>
            <div class="btn-group" style="padding: 16px; border-top: 1px solid var(--ios-border);">
                <button id="btnCerrarAyudaModal" class="btn-primary">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const buscador = document.getElementById('buscadorAyudaModal');
    if (buscador) {
        buscador.oninput = (e) => {
            const texto = e.target.value.toLowerCase();
            const filtrados = FAQS.filter(faq => 
                faq.titulo.toLowerCase().includes(texto) ||
                faq.pasos.some(p => p.toLowerCase().includes(texto))
            );
            document.getElementById('ayudaContenidoModal').innerHTML = renderizarFaqs(filtrados);
            setupEventosItems(modal);
        };
    }
    
    setupEventosItems(modal);
    
    document.getElementById('btnCerrarAyudaModal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function renderizarFaqs(faqs) {
    if (!faqs.length) {
        return '<div style="padding: 20px; text-align: center; color: gray;">❌ No hay resultados</div>';
    }
    
    return faqs.map(faq => `
        <div class="ayuda-item" data-id="${faq.id}" data-modulo="${faq.modulo}" style="padding: 12px; border-bottom: 1px solid var(--ios-border); cursor: pointer; transition: background 0.2s;">
            <div class="ayuda-item-titulo" style="font-weight: 600; margin-bottom: 5px;">${faq.titulo}</div>
            <div class="ayuda-item-desc" style="font-size: 12px; color: var(--ios-gray);">${faq.pasos[0].substring(3, 60)}...</div>
        </div>
    `).join('');
}

function setupEventosItems(modal) {
    modal.querySelectorAll('.ayuda-item').forEach(item => {
        item.onclick = () => {
            const faqId = item.dataset.id;
            const faq = FAQS.find(f => f.id === faqId);
            if (faq) {
                mostrarModalDetalleAyuda(faq, modal);
            }
        };
        
        item.onmouseenter = () => {
            item.style.background = 'var(--ios-gray-light)';
        };
        item.onmouseleave = () => {
            item.style.background = 'transparent';
        };
    });
}

function mostrarModalDetalleAyuda(faq, modalAnterior) {
    modalAnterior.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10002';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header">${faq.titulo}</div>
            <div style="padding: 16px 0;">
                ${faq.pasos.map(paso => `<p style="margin-bottom: 12px; line-height: 1.5;">${paso}</p>`).join('')}
            </div>
            <div class="btn-group">
                <button id="btnIrModulo" class="btn-success">📂 Ir a ${faq.modulo}</button>
                <button id="btnVolverAyuda" class="btn-info">◀ Volver</button>
                <button id="btnCerrarDetalle" class="btn-primary">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('btnIrModulo').onclick = () => {
        modal.remove();
        const tab = document.querySelector(`.tab-btn[data-tab="${faq.modulo}"]`);
        if (tab) tab.click();
    };
    
    document.getElementById('btnVolverAyuda').onclick = () => {
        modal.remove();
        abrirModalAyuda();
    };
    
    document.getElementById('btnCerrarDetalle').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}