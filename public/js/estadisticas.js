const grafico = document.getElementById('grafico-resenas');
if (grafico && window.Chart) {
    const chart = new Chart(grafico, {
        type: 'bar',
        data: {
            labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
            datasets: [{ data: JSON.parse(grafico.dataset.valores), backgroundColor: '#3a7050' }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { x: { ticks: {} }, y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
    });

    function aplicarColores() {
        const estilo = getComputedStyle(document.body);
        const color = estilo.getPropertyValue('--tema-grafico').trim() || '#3a7050';
        const texto = estilo.getPropertyValue('--tema-texto').trim() || '#192c21';
        chart.data.datasets[0].backgroundColor = color;
        chart.options.scales.x.ticks.color = texto;
        chart.options.scales.y.ticks.color = texto;
        chart.update('none');
    }

    aplicarColores();
    document.addEventListener('dinomaps:color', aplicarColores);
    document.addEventListener('dinomaps:apariencia', aplicarColores);
}
