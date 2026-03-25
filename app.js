// Tu URL exacta de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbwyJMORPZ1QSfcC-Cd3BhXANlRdQ2kL_8hKDsGaInIgfSAqJ8sLZBNDgctwh5iO0L0d/exec';

let gruposTotales = []; 

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    document.getElementById('filtro-seccion').addEventListener('change', (e) => {
        renderizarDashboard(e.target.value);
    });
});

async function cargarDatos() {
    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();
        
        gruposTotales = datos;
        
        // Ocultar Loader
        document.getElementById('loader').classList.add('hidden');
        
        // Llenar el selector
        poblarFiltroSecciones(datos);
        
        // Renderizar la vista principal
        renderizarDashboard('Todas');

    } catch (error) {
        console.error("Error cargando los datos:", error);
        document.getElementById('loader').innerHTML = "❌ Error al conectar con la base de datos de Sheets. Revisa la consola.";
    }
}

function poblarFiltroSecciones(datos) {
    const selector = document.getElementById('filtro-seccion');
    const seccionesUnicas = [...new Set(datos.map(item => item['Sección']))].filter(Boolean);
    
    seccionesUnicas.forEach(seccion => {
        const option = document.createElement('option');
        option.value = seccion;
        option.textContent = `Sección ${seccion}`;
        selector.appendChild(option);
    });
}

function renderizarDashboard(seccionFiltrada) {
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = ''; 

    // Filtrar los datos si selecciona una sección específica
    const datosFiltrados = seccionFiltrada === 'Todas' 
        ? gruposTotales 
        : gruposTotales.filter(g => g['Sección'].toString() === seccionFiltrada.toString());

    // Actualizar KPIs de arriba
    document.getElementById('kpi-total').textContent = datosFiltrados.length;
    document.getElementById('kpi-criticos').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'Crítico').length;

    // Crear las tarjetas para cada grupo
    datosFiltrados.forEach(grupo => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Lógica de colores del semáforo adaptados a tu paleta
        let colorBorde = '#059669'; // Verde
        let badgeColor = '#059669';
        
        if (grupo['ESTADO_GENERAL'] === 'Crítico') {
            colorBorde = '#dc2626'; // Rojo
            badgeColor = '#dc2626';
        } else if (grupo['ESTADO_GENERAL'] === 'En seguimiento') {
            colorBorde = '#b45309'; // Ámbar
            badgeColor = '#b45309';
        }

        card.style.borderTopColor = colorBorde;

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h2>Grupo ${grupo['ID_Grupo']}</h2>
                    <span class="docente">Sección ${grupo['Sección']} - Docente: ${grupo['Docente']}</span>
                </div>
                <span class="badge" style="background-color: ${badgeColor};">${grupo['ESTADO_GENERAL']}</span>
            </div>
            
            <div class="metricas">
                <div class="metrica-item">
                    <span>Asistencia</span>
                    <strong>${grupo['%_Asistencia']}</strong>
                </div>
                <div class="metrica-item">
                    <span>Nota Final</span>
                    <strong>${grupo['NOTA_FINAL']}</strong>
                </div>
                <div class="metrica-item">
                    <span>Promedio Hitos</span>
                    <strong>${grupo['Prom_Hitos']}</strong>
                </div>
                <div class="metrica-item">
                    <span>Riesgo Actual</span>
                    <strong style="color: ${badgeColor};">${grupo['Riesgo_Actual']}</strong>
                </div>
            </div>

            ${grupo['Alerta_Manual'] === 'Sí' ? `<div class="alerta-row">⚠️ Alerta activada por Scrum Master</div>` : ''}
        `;

        grid.appendChild(card);
    });
}
