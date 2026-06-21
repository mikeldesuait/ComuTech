// tecnico/js/modules/perfil.js
import { escapeHtml } from '../utils/utils.js'

export function renderizarPerfil(tecnicoNombre, tecnicoEmail, isExterno, onCerrarSesion) {
    return `<div class="container"><div class="card"><div class="card-header">👤 Mi perfil</div>
        <p><strong>Nombre:</strong> ${escapeHtml(tecnicoNombre)}</p>
        <p><strong>Email:</strong> ${escapeHtml(tecnicoEmail)}</p>
        ${isExterno ? '<p><strong>Tipo:</strong> Técnico externo</p>' : ''}
        <hr><button class="btn-danger" id="btnCerrarSesionPerfil" style="padding:12px 24px; border-radius:30px; border:none; cursor:pointer; color:white;">🚪 Cerrar sesión</button>
    </div></div>`
}