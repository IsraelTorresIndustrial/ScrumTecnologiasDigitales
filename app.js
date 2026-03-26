const API_URL = 'https://script.google.com/macros/s/AKfycbzMUFExh_Pyb94BbeUSrQ6881VVf7Z9zQrubhgkaicKHDw0peEuH09Kf7vFfVwCoJk9Ng/exec';

let baseDatos = [];

const COLORES = {
    'Al Día': '#2563eb',
    'En seguimiento': '#d97706',
    'Crítico': '#dc2626'
};

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    
    document.getElementById('filtro-docente').addEventListener('change', (e) => {
        actualizarSelectorSecciones(e.target.value);
        renderizarDashboard();
    });

    document.getElementById('filtro-seccion').addEventListener('change', () => {
        renderizarDashboard();
    });
});

async function cargarDatos() {
    try {
        const respuesta = await fetch(API_URL);
        baseDatos = await respuesta.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('mensaje-inicio').classList.remove('hidden');
        
        poblarFiltroDocentes();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('loader').innerHTML = "❌ Error al conectar con el Motor Scrum.";
    }
}

function poblarFiltroDocentes() {
    const selector = document.getElementById('filtro-docente');
    const docentes = [...new Set(baseDatos.map(item => item['Docente']))].filter(Boolean);
    
    selector.innerHTML = '<option value="" disabled selected>Seleccione un docente...</option>';
    docentes.forEach(doc => {
        selector.innerHTML += `<option value="${doc}">${doc}</option>`;
    });
    
    actualizarSelectorSecciones('');
}

function actualizarSelectorSecciones(docenteSeleccionado) {
    const selectorSec = document.getElementById('filtro-seccion');
    
    if (!docenteSeleccionado || docenteSeleccionado === '') {
        selectorSec.innerHTML = '<option value="Todas">Seleccione docente primero</option>';
        selectorSec.disabled = true;
        return;
    }

    selectorSec.disabled = false;
    const datosDocente = baseDatos.filter(g => g['Docente'] === docenteSeleccionado);
    const secciones = [...new Set(datosDocente.map(item => item['Sección']))].filter(Boolean);
    
    selectorSec.innerHTML = '<option value="Todas">Todas sus secciones</option>';
    secciones.forEach(sec => {
        selectorSec.innerHTML += `<option value="${sec}">${sec}</option>`;
    });
}

function renderizarDashboard() {
    const docente = document.getElementById('filtro-docente').value;
    const seccion = document.getElementById('filtro-seccion').value;
    const grid = document.getElementById('dashboard-grid');
    const mensajeInicio = document.getElementById('mensaje-inicio');
    
    grid.innerHTML = ''; 

    // Bloqueo si no hay docente elegido
    if (!docente || docente === '') {
        document.getElementById('kpi-total').textContent = '0';
        document.getElementById('kpi-aldia').textContent = '0';
        document.getElementById('kpi-seguimiento').textContent = '0';
        document.getElementById('kpi-criticos').textContent = '0';
        mensajeInicio.classList.remove('hidden');
        grid.classList.add('hidden');
        return;
    }

    mensajeInicio.classList.add('hidden');
    grid.classList.remove('hidden');

    let datosFiltrados = baseDatos.filter(g => g['Docente'] === docente);
    if (seccion !== 'Todas' && seccion !== '') {
        datosFiltrados = datosFiltrados.filter(g => g['Sección'].toString() === seccion);
    }

    // Ordenamiento Triage y luego por ID
    const jerarquia = { 'Crítico': 1, 'En seguimiento': 2, 'Al Día': 3 };
    datosFiltrados.sort((a, b) => {
        if (jerarquia[a['ESTADO_GENERAL']] !== jerarquia[b['ESTADO_GENERAL']]) {
            return jerarquia[a['ESTADO_GENERAL']] - jerarquia[b['ESTADO_GENERAL']];
        }
        return a['ID_Grupo'].localeCompare(b['ID_Grupo']);
    });

    // Actualizar KPIs
    document.getElementById('kpi-total').textContent = datosFiltrados.length;
    document.getElementById('kpi-aldia').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'Al Día').length;
    document.getElementById('kpi-seguimiento').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'En seguimiento').length;
    document.getElementById('kpi-criticos').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'Crítico').length;

    // Dibujar Tarjetas
    datosFiltrados.forEach(grupo => {
        const estado = grupo['ESTADO_GENERAL'];
        const color = COLORES[estado] || '#ccc';

        let equipoHtml = `<li class="lider">👤 ${grupo['Líder']} (Líder)</li>`;
        try {
            const equipoArr = JSON.parse(grupo['Equipo_JSON']);
            equipoArr.forEach(int => { equipoHtml += `<li>${int}</li>`; });
        } catch(e) {}

        let alertasHtml = '';
        try {
            const alertasArr = JSON.parse(grupo['Alertas_JSON']);
            alertasArr.forEach(alerta => {
                alertasHtml += `<span class="badge-alerta">⚠️ ${alerta}</span>`;
            });
        } catch(e) {}

        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderTopColor = color;

        card.innerHTML = `
            <div class="card-left">
                <h4>Integrantes</h4>
                <ul class="lista-integrantes">${equipoHtml}</ul>
            </div>
            
            <div class="card-right">
                <div class="card-header">
                    <div>
                        <h2>${grupo['ID_Grupo']} <span class="tema">| Proyecto: ${grupo['Tema']}</span></h2>
                    </div>
                    <span class="badge-estado" style="background-color: ${color};">${estado}</span>
                </div>

                ${alertasHtml ? `<div class="alertas-container">${alertasHtml}</div>` : ''}

                <div class="hitos-tracker">
                    ${generarTrackerHitos([grupo['Data_H1'], grupo['Data_H2'], grupo['Data_H3'], grupo['Data_H4'], grupo['Data_H5']])}
                </div>

                <div class="metricas-rapidas">
                    <div class="metrica">
                        <span>Nota Proyectada</span>
                        <strong>${grupo['NOTA_FINAL_PROYECTADA']}</strong>
                    </div>
                    <div class="metrica">
                        <span>Prom. Hitos</span>
                        <strong>${grupo['Prom_Hitos_Calculado']}</strong>
                    </div>
                    <div class="metrica">
                        <span>Riesgo Actual</span>
                        <strong>${grupo['Riesgo_Actual']}</strong>
                    </div>
                </div>
            </div>

            <div class="card-footer">
                <div class="contact-item"><strong>Líder:</strong> ${grupo['Líder']}</div>
                <div class="contact-item">✉️ ${grupo['Correo_Líder']}</div>
                <div class="contact-item">📞 ${grupo['Tel_Líder']}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function generarTrackerHitos(hitosArray) {
    let html = '';
    hitosArray.forEach((h, index) => {
        const partes = h.split('|');
        const estadoStr = partes[0] || 'Pendiente';
        const nota = partes[1] || '-';
        
        let icon = '⏳';
        if (estadoStr.includes('Cumplido') || estadoStr.includes('mismo día')) icon = '✅';
        else if (estadoStr.includes('atraso') || estadoStr.includes('Atrasado')) icon = '⚠️';
        else if (estadoStr.includes('No entrega')) icon = '❌';

        html += `
            <div class="hito-node">
                <span class="hito-icon">${icon}</span>
                <span class="hito-label">H${index + 1}</span>
                <span class="hito-nota">${nota !== '-' ? nota : ''}</span>
            </div>
        `;
        if(index < 4) html += `<div class="timeline-line"></div>`;
    });
    return html;
}
