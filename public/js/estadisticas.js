const lienzoResenas = document.getElementById('grafico-resenas');
const selectorGrafico = document.getElementById('tipo-grafico-resenas');

if (lienzoResenas && selectorGrafico && window.Chart) {
    const valores = JSON.parse(lienzoResenas.dataset.valores);
    const etiquetas = valores.map((_, i) => (i + 1) + ' ★');
    const coloresCirculares = ['#6653a6', '#207397', '#c77a2b', '#bd4f77', '#3a7050'];
    let chart;

    function mostrarGrafico() {
        const tipo = selectorGrafico.value === 'pie' ? 'pie' : 'bar';
        const circular = tipo === 'pie';
        const estilo = getComputedStyle(document.body);
        const color = estilo.getPropertyValue('--tema-grafico').trim() || '#3a7050';
        const texto = estilo.getPropertyValue('--tema-texto').trim() || '#192c21';
        const superficie = estilo.getPropertyValue('--tema-superficie').trim() || '#fff';

        chart?.destroy();
        chart = new Chart(lienzoResenas, {
            type: tipo,
            data: {
                labels: etiquetas,
                datasets: [{
                    data: valores,
                    backgroundColor: circular ? [...coloresCirculares.slice(0, -1), color] : color,
                    borderColor: superficie,
                }],
            },
            options: {
                color: texto,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: circular ? {
                        position: 'bottom',
                        labels: {
                            generateLabels: grafico => Chart.overrides.pie.plugins.legend.labels.generateLabels(grafico)
                                .map(item => ({ ...item, text: item.text + ' · ' + valores[item.index] })),
                        },
                    } : { display: false },
                    tooltip: {
                        callbacks: {
                            label: ({ raw }) => raw + (raw === 1 ? ' usuario' : ' usuarios'),
                        },
                    },
                },
                ...(circular ? {} : {
                    scales: {
                        x: { ticks: { color: texto } },
                        y: { beginAtZero: true, ticks: { color: texto, precision: 0 } },
                    },
                }),
            },
        });
    }

    lienzoResenas.parentElement.hidden = false;
    mostrarGrafico();
    selectorGrafico.closest('label').hidden = false;
    selectorGrafico.addEventListener('change', mostrarGrafico);
    document.addEventListener('dinomaps:color', mostrarGrafico);
    document.addEventListener('dinomaps:apariencia', mostrarGrafico);
}
