import { leerPreferencia } from './configuracion.js';

export function iniciarRecorrido(mapa, L) {
    const boton = document.getElementById('trazar-recorrido');
    if (!boton || !navigator.geolocation) return;

    const estado = document.getElementById('estado-recorrido');
    const capa = L.layerGroup().addTo(mapa);
    boton.disabled = false;
    boton.addEventListener('click', async () => {
        boton.disabled = true;
        estado.textContent = 'Calculando recorrido…';
        try {
            const { coords } = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
                resolve, () => reject(new Error('No se pudo obtener tu ubicación.')), { timeout: 8000 },
            ));
            const respuesta = await fetch(boton.dataset.url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': boton.dataset.token,
                },
                body: JSON.stringify({ latitud: coords.latitude, longitud: coords.longitude, modo: leerPreferencia('dinomaps-viaje') }),
            });
            const resultado = await respuesta.json();
            if (!respuesta.ok) throw new Error(resultado.message || 'No pudimos calcular el recorrido.');

            capa.clearLayers();
            const trazo = L.geoJSON(resultado.geometria, { style: { className: 'trazo-recorrido', weight: 5 } }).addTo(capa);
            for (const aviso of resultado.avisos) {
                const descripcion = document.createElement('p');
                descripcion.textContent = aviso.description;
                L.circleMarker([aviso.latitude, aviso.longitude], { className: 'aviso-recorrido', radius: 7, fillOpacity: 1 })
                    .bindPopup(descripcion).addTo(capa);
            }
            mapa.fitBounds(trazo.getBounds(), { paddingTopLeft: [35, 110], paddingBottomRight: [35, 35] });
            const unidad = leerPreferencia('dinomaps-unidades');
            const distancia = Number(resultado.metros) / (unidad === 'mi' ? 1609.344 : 1000);
            const texto = distancia > 0 ? distancia.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' '+unidad+' · ' : '';
            estado.textContent = texto + (resultado.avisos.length
                ? resultado.avisos.length + ' avisos comunitarios cerca del recorrido.'
                : 'Sin avisos comunitarios cerca del recorrido.');
        } catch (error) {
            estado.textContent = error.message;
        } finally {
            boton.disabled = false;
        }
    });
}
