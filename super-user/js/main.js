// js/main.js

let currentUser = null;
let paginaActual = 1;
const registrosPorPagina = 10;
let empresasData = [];
let clientesFiltrados = [];

async function hacerLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { 
        document.getElementById('errorMsg').innerText = "Introduce email y contraseña"; 
        return false; 
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { 
        document.getElementById('errorMsg').innerText = error.message; 
        return false; 
    }
    const { data: perfil } = await sb.from('perfiles')
        .select('rol, nombre_razon_social')
        .eq('user_id', data.user.id)
        .maybeSingle();
    if (!perfil || perfil.rol !== 'super_admin') { 
        await sb.auth.signOut(); 
        document.getElementById('errorMsg').innerText = "Acceso no autorizado"; 
        return false; 
    }
    currentUser = data.user;
    document.getElementById('nombreAdmin').innerHTML = perfil.nombre_razon_social || 'Super Admin';
    document.getElementById('emailAdmin').innerHTML = currentUser.email;
    return true;
}

async function cargarStats() {
    const { data: empresas } = await sb.from('empresas').select('*');
    const total = empresas?.length || 0;
    const activos = empresas?.filter(e => e.activo).length || 0;
    document.getElementById('statsPanel').innerHTML = `
        <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Total Clientes</div></div>
        <div class="stat-card"><div class="stat-number">${activos}</div><div class="stat-label">Activos</div></div>
    `;
}

function cargarModulo(modulo) {
    fetch(`modules/${modulo}.html`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('moduloContainer').innerHTML = html;
            if (modulo === 'clientes' && typeof window.iniciarModuloClientes === 'function') {
                window.iniciarModuloClientes();
            } else if (modulo === 'facturacion' && typeof window.iniciarModuloFacturacion === 'function') {
                window.iniciarModuloFacturacion();
            } else if (modulo === 'cumplimiento' && typeof window.iniciarModuloCumplimiento === 'function') {
                window.iniciarModuloCumplimiento();
            }
        })
        .catch(error => console.error('Error cargando módulo:', error));
}

// Event Listeners
document.getElementById('btnLogin').onclick = async() => {
    if (await hacerLogin()) {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('dashboardPanel').style.display = 'block';
        await cargarStats();
        cargarModulo('clientes');
    }
};

document.querySelectorAll('.browser-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.browser-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        cargarModulo(tab.dataset.tab);
    };
});

document.getElementById('btnLogoutHeader').onclick = async() => { 
    await sb.auth.signOut(); 
    location.reload(); 
};

document.getElementById('btnLogoutFooter').onclick = async() => { 
    await sb.auth.signOut(); 
    location.reload(); 
};

document.getElementById('btnRefrescar').onclick = () => {
    if (typeof window.cargarClientes === 'function') window.cargarClientes();
    if (typeof window.cargarCumplimiento === 'function') window.cargarCumplimiento();
    cargarStats();
};
