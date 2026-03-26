const API_URL = 'https://script.google.com/macros/s/AKfycbzMUFExh_Pyb94BbeUSrQ6881VVf7Z9zQrubhgkaicKHDw0peEuH09Kf7vFfVwCoJk9Ng/exec';

let baseDatos = [];
let graficos = {}; // Almacena instancias de Chart.js para destruirlas al actualizar

const COLORES = {
    'Al Día': '#2563eb',
    'En seguimiento': '#d97706',
    'Crítico': '#dc2626'
};

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    document.getElementById('filtro-docente').addEventListener('change', (e) => {
        actualizarSelectorSecciones(e.target.value);
        renderizarTodo();
    });
    document.getElementById('filtro-seccion').addEventListener('change', renderizarTodo);
});

async function cargarDatos() {
    try {
        const respuesta = await fetch(API_URL);
        baseDatos = await respuesta.json();
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('mensaje-inicio').classList.remove('hidden');
        poblarFiltroDocentes();
    } catch (error) {
        document.getElementById('loader').innerHTML = "❌ Error al conectar con el Motor Scrum.";
    }
}

function poblarFiltroDocentes() {
    const selector = document.getElementById('filtro-docente');
    const docentes = [...new Set(baseDatos.map(item => item['Docente']))].filter(Boolean);
    selector.innerHTML = '<option value="" disabled selected>Seleccione un docente...</option>';
    docentes.forEach(doc => { selector.innerHTML += `<option value="${doc}">${doc}</option>`; });
    actualizarSelectorSecciones('');
}

function actualizarSelectorSecciones(docenteSeleccionado) {
    const selectorSec = document.getElementById('filtro-seccion');
    if (!docenteSeleccionado) {
        selectorSec.innerHTML = '<option value="Todas">Seleccione docente primero</option>';
        selectorSec.disabled = true;
        return;
    }
    selectorSec.disabled = false;
    const datosDocente = baseDatos.filter(g => g['Docente'] === docenteSeleccionado);
    const secciones = [...new Set(datosDocente.map(item => item['Sección']))].filter(Boolean);
    selectorSec.innerHTML = '<option value="Todas">Todas sus secciones</option>';
    secciones.forEach(sec => { selectorSec.innerHTML += `<option value="${sec}">${sec}</option>`; });
}

// Lógica de Pestañas (Tabs)
function cambiarVista(vista) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('vista-operativa').classList.add('hidden');
    document.getElementById('vista-analitica').classList.add('hidden');

    if(vista === 'operativa') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('vista-operativa').classList.remove('hidden');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('vista-analitica').classList.remove('hidden');
    }
}

// Renderizador Principal
function renderizarTodo() {
    const docente = document.getElementById('filtro-docente').value;
    const seccion = document.getElementById('filtro-seccion').value;
    const msgInicio = document.getElementById('mensaje-inicio');
    const tabs = document.getElementById('tabs-container');
    const gridOperativa = document.getElementById('vista-operativa');
    const gridAnalitica = document.getElementById('vista-analitica');
    
    if (!docente) return;

    msgInicio.classList.add('hidden');
    tabs.classList.remove('hidden');

    let datosFiltrados = baseDatos.filter(g => g['Docente'] === docente);
    if (seccion !== 'Todas' && seccion !== '') {
        datosFiltrados = datosFiltrados.filter(g => g['Sección'].toString() === seccion);
    }

    // Actualizar KPIs
    document.getElementById('kpi-total').textContent = datosFiltrados.length;
    document.getElementById('kpi-aldia').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'Al Día').length;
    document.getElementById('kpi-seguimiento').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'En seguimiento').length;
    document.getElementById('kpi-criticos').textContent = datosFiltrados.filter(g => g['ESTADO_GENERAL'] === 'Crítico').length;

    // Solo mostramos el grid de la tab activa
    if(document.querySelector('.tab-btn.active').textContent.includes('Operativa')) {
        gridOperativa.classList.remove('hidden');
    } else {
        gridAnalitica.classList.remove('hidden');
    }

    renderizarTarjetas(datosFiltrados);
    renderizarGraficos(datosFiltrados);
}

// Convertir número chileno "5,9" a "5.9" matemático
function parseNota(notaStr) {
    if(!notaStr || notaStr === '-' || notaStr === 'Pendiente') return null;
    return parseFloat(notaStr.toString().replace(',', '.'));
}

// -----------------------------------------------------
// VISTA 1: TARJETAS (CÓDIGO ANTERIOR INTACTO)
// -----------------------------------------------------
function renderizarTarjetas(datos) {
    const grid = document.getElementById('vista-operativa');
    grid.innerHTML = ''; 
    const jerarquia = { 'Crítico': 1, 'En seguimiento': 2, 'Al Día': 3 };
    
    let ordenados = [...datos].sort((a, b) => {
        if (jerarquia[a['ESTADO_GENERAL']] !== jerarquia[b['ESTADO_GENERAL']]) return jerarquia[a['ESTADO_GENERAL']] - jerarquia[b['ESTADO_GENERAL']];
        return a['ID_Grupo'].localeCompare(b['ID_Grupo']);
    });

    ordenados.forEach(grupo => {
        const estado = grupo['ESTADO_GENERAL'];
        const color = COLORES[estado] || '#ccc';

        let equipoHtml = `<li class="lider">👤 ${grupo['Líder']} (Líder)</li>`;
        try { JSON.parse(grupo['Equipo_JSON']).forEach(int => { equipoHtml += `<li>${int}</li>`; }); } catch(e) {}

        let alertasHtml = '';
        try { JSON.parse(grupo['Alertas_JSON']).forEach(alerta => { alertasHtml += `<span class="badge-alerta">⚠️ ${alerta}</span>`; }); } catch(e) {}

        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderTopColor = color;

        card.innerHTML = `
            <div class="card-left">
                <h4>Integrantes</h4><ul class="lista-integrantes">${equipoHtml}</ul>
            </div>
            <div class="card-right">
                <div class="card-header">
                    <h2>${grupo['ID_Grupo']} <span class="tema">| Proyecto: ${grupo['Tema']}</span></h2>
                    <span class="badge-estado" style="background-color: ${color};">${estado}</span>
                </div>
                ${alertasHtml ? `<div class="alertas-container">${alertasHtml}</div>` : ''}
                <div class="hitos-tracker">${generarTrackerHitos([grupo['Data_H1'], grupo['Data_H2'], grupo['Data_H3'], grupo['Data_H4'], grupo['Data_H5']])}</div>
                <div class="metricas-rapidas">
                    <div class="metrica"><span>Nota Proyectada</span><strong>${grupo['NOTA_FINAL_PROYECTADA']}</strong></div>
                    <div class="metrica"><span>Prom. Hitos</span><strong>${grupo['Prom_Hitos_Calculado']}</strong></div>
                    <div class="metrica"><span>Riesgo Actual</span><strong>${grupo['Riesgo_Actual']}</strong></div>
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

        html += `<div class="hito-node"><span class="hito-icon">${icon}</span><span class="hito-label">H${index + 1}</span><span class="hito-nota">${nota !== '-' ? nota : ''}</span></div>`;
        if(index < 4) html += `<div class="timeline-line"></div>`;
    });
    return html;
}

// -----------------------------------------------------
// VISTA 2: ANALÍTICA (CHART.JS)
// -----------------------------------------------------
function renderizarGraficos(datos) {
    // Destruir gráficos anteriores si existen para evitar solapamiento
    if(graficos.dispersion) graficos.dispersion.destroy();
    if(graficos.alertas) graficos.alertas.destroy();
    if(graficos.tendencia) graficos.tendencia.destroy();

    // 1. Data Dispersión (X: Proceso, Y: Hitos)
    const dataDispersion = datos.map(g => ({
        x: parseNota(g['Prom_Proceso_Scrum']),
        y: parseNota(g['Prom_Hitos_Calculado']),
        label: g['ID_Grupo'],
        estado: g['ESTADO_GENERAL']
    })).filter(d => d.x !== null && d.y !== null);

    // 2. Data Alertas (Frecuencias)
    let conteoAlertas = {};
    datos.forEach(g => {
        try {
            JSON.parse(g['Alertas_JSON']).forEach(alerta => {
                conteoAlertas[alerta] = (conteoAlertas[alerta] || 0) + 1;
            });
        } catch(e) {}
    });

    // 3. Data Tendencia (Promedios H1 a H5)
    let sumasHitos = [0,0,0,0,0];
    let cuentasHitos = [0,0,0,0,0];
    
    datos.forEach(g => {
        [g['Data_H1'], g['Data_H2'], g['Data_H3'], g['Data_H4'], g['Data_H5']].forEach((hData, i) => {
            let nota = parseNota(hData.split('|')[1]);
            if(nota) {
                sumasHitos[i] += nota;
                cuentasHitos[i]++;
            }
        });
    });
    const promediosHitos = sumasHitos.map((suma, i) => cuentasHitos[i] > 0 ? (suma / cuentasHitos[i]).toFixed(1) : null);

    // DIBUJAR GRÁFICOS
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.color = "#475569";

    // G1: Dispersión
    const ctxDisp = document.getElementById('chartDispersion').getContext('2d');
    graficos.dispersion = new Chart(ctxDisp, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Grupos',
                data: dataDispersion,
                backgroundColor: dataDispersion.map(d => COLORES[d.estado] || '#ccc'),
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Promedio Proceso (Reuniones)' }, min: 1, max: 7 },
                y: { title: { display: true, text: 'Promedio Producto (Hitos)' }, min: 1, max: 7 }
            },
            plugins: {
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.label}: Proceso ${ctx.raw.x}, Hitos ${ctx.raw.y}` } },
                legend: { display: false }
            }
        }
    });

    // G2: Alertas
    const ctxAlert = document.getElementById('chartAlertas').getContext('2d');
    graficos.alertas = new Chart(ctxAlert, {
        type: 'bar',
        data: {
            labels: Object.keys(conteoAlertas).length > 0 ? Object.keys(conteoAlertas) : ['Sin alertas esta semana'],
            datasets: [{
                label: 'Cantidad de Grupos',
                data: Object.keys(conteoAlertas).length > 0 ? Object.values(conteoAlertas) : [0],
                backgroundColor: '#ef4444',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: 'y', // Barras horizontales
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { stepSize: 1 }, min: 0 } }
        }
    });

    // G3: Tendencia Hitos
    const ctxTendencia = document.getElementById('chartTendencia').getContext('2d');
    graficos.tendencia = new Chart(ctxTendencia, {
        type: 'line',
        data: {
            labels: ['Hito 1', 'Hito 2', 'Hito 3', 'Hito 4', 'Hito 5'],
            datasets: [{
                label: 'Promedio de Sección',
                data: promediosHitos,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#2563eb',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { min: 1, max: 7, title: { display: true, text: 'Nota Promedio' } } }
        }
    });
}
