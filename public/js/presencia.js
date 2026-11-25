export function iniciarPresencia(mapa, L, contenedor) {
    const boton = document.getElementById('presencia-cercana');
    if (!boton || !navigator.geolocation) return;

    const estado = document.getElementById('estado-presencia');
    const capa = L.layerGroup().addTo(mapa);
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': boton.dataset.token,
    };
    let activo = false;
    let intervalo;
    let actualizacion;

    function obtenerUbicacion() {
        return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({
                latitude: Number(coords.latitude.toFixed(3)),
                longitude: Number(coords.longitude.toFixed(3)),
            }),
            () => reject(new Error('No se pudo obtener tu ubicación. Revisá el permiso del navegador.')),
            { timeout: 8000, maximumAge: 10000 },
        ));
    }

    function actualizar() {
        if (actualizacion) return actualizacion;
        actualizacion = (async () => {
            const posiciones = await obtenerUbicacion();
            if (!activo) return;

            const respuesta = await fetch(boton.dataset.url, {
                method: 'PUT', headers, body: JSON.stringify(posiciones),
            });
            if (!respuesta.ok) throw new Error('No pudimos actualizar los usuarios cercanos.');
            const { data } = await respuesta.json();
            if (!activo) return;

            capa.clearLayers();
            for (const avatar of data) {
                const icon = L.icon({
                    iconUrl: avatar.avatar || contenedor.dataset.iconos + '/dino-3.webp',
                    iconSize: [26, 26],
                });
                L.marker([avatar.latitude, avatar.longitude], { icon, alt: 'Usuario cercano (ubicación aproximada)' })
                    .bindTooltip('Ubicación aproximada').addTo(capa);
            }
            estado.textContent = data.length ? 'Compartiendo ubicación aproximada.' : 'Compartiendo ubicación. No hay otros usuarios cerca.';
        })().finally(() => { actualizacion = null; });
        return actualizacion;
    }

    boton.disabled = false;
    boton.addEventListener('click', async () => {
        boton.disabled = true;
        try {
            if (activo) {
                activo = false;
                clearInterval(intervalo);
                capa.clearLayers();
                await actualizacion?.catch(() => {});
                const respuesta = await fetch(boton.dataset.url, { method: 'DELETE', headers });
                estado.textContent = respuesta.ok ? 'Dejaste de compartir tu ubicación.' : 'La ubicación dejará de mostrarse al vencer.';
            } else {
                activo = true;
                estado.textContent = 'Buscando tu ubicación…';
                await actualizar();
                intervalo = setInterval(() => actualizar().catch(error => {
                    capa.clearLayers();
                    estado.textContent = error.message;
                }), 15000);
            }
        } catch (error) {
            activo = false;
            estado.textContent = error.message;
        } finally {
            boton.disabled = false;
            boton.setAttribute('aria-pressed', String(activo));
            boton.textContent = activo ? 'Dejar de compartir' : 'Compartir ubicación';
        }
    });
}
