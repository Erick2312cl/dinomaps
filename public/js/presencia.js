const { presenciaUrl, presenciaToken, presenciaCuenta } = document.body.dataset;
const presencia = presenciaUrl && navigator.geolocation ? iniciarCompartirUbicacion() : null;

export function iniciarPresencia(mapa, L, contenedor) {
    presencia?.conectarMapa(mapa, L, contenedor);
}

function iniciarCompartirUbicacion() {
    const boton = document.getElementById('presencia-cercana');
    const estado = document.getElementById('estado-presencia');
    const clave = 'dinomaps-presencia:' + presenciaCuenta;
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': presenciaToken,
    };
    let activo = false;
    let intervalo;
    let actualizacion;
    let posiciones;
    let dibujar;

    function guardarActivacion(valor) {
        try {
            if (valor) sessionStorage.setItem(clave, '1');
            else sessionStorage.removeItem(clave);
        } catch {
            // La ubicación sigue funcionando en la página si el navegador bloquea el almacenamiento.
        }
    }

    function recuperarActivacion() {
        try {
            return sessionStorage.getItem(clave) === '1';
        } catch {
            return false;
        }
    }

    function mostrarEstado(mensaje) {
        if (estado) estado.textContent = mensaje;
    }

    function actualizarBoton(ocupado = false) {
        if (!boton) return;
        boton.disabled = ocupado;
        boton.setAttribute('aria-pressed', String(activo));
        boton.textContent = activo ? 'Dejar de compartir' : 'Compartir nombre y ubicación';
    }

    function mostrarPosiciones(datos, centrar = false) {
        posiciones = datos;
        dibujar?.(posiciones, centrar);
    }

    function detener() {
        activo = false;
        guardarActivacion(false);
        clearInterval(intervalo);
        mostrarPosiciones(null);
    }

    function obtenerUbicacion() {
        return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({
                latitude: Number(coords.latitude.toFixed(3)),
                longitude: Number(coords.longitude.toFixed(3)),
            }),
            error => reject(Object.assign(
                new Error('No se pudo obtener tu ubicación. Revisá el permiso del navegador.'),
                { permisoDenegado: error.code === 1 },
            )),
            { timeout: 8000, maximumAge: 10000 },
        ));
    }

    function actualizar(renovar, centrar = false) {
        if (actualizacion) return actualizacion;
        actualizacion = (async () => {
            const ubicacion = await obtenerUbicacion();
            if (!activo) return;
            const respuesta = await fetch(presenciaUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ ...ubicacion, share_name: true, renew: renovar }),
            });
            if (!activo) return;
            if (respuesta.status === 410 || respuesta.status === 401 || respuesta.status === 419) {
                detener();
                mostrarEstado('La ubicación dejó de compartirse.');
                actualizarBoton();
                return;
            }
            if (!respuesta.ok) throw new Error('No pudimos actualizar los usuarios cercanos.');
            const datos = await respuesta.json();
            if (!activo) return;
            if (!datos.own) {
                detener();
                mostrarEstado('La ubicación dejó de compartirse.');
                actualizarBoton();
                return;
            }
            mostrarPosiciones(datos, centrar);
            mostrarEstado(datos.data.length
                ? 'Compartiendo tu nombre y ubicación aproximada.'
                : 'Compartiendo tu nombre y ubicación aproximada. No hay otros usuarios cerca.');
        })().finally(() => { actualizacion = null; });
        return actualizacion;
    }

    function renovarUbicacion() {
        actualizar(true).catch(error => {
            if (!activo) return;
            if (error.permisoDenegado) {
                detener();
                actualizarBoton();
            } else {
                mostrarPosiciones(null);
            }
            mostrarEstado(error.message);
        });
    }

    function programarRenovacion() {
        clearInterval(intervalo);
        intervalo = setInterval(renovarUbicacion, 15000);
    }

    function recuperar() {
        if (!recuperarActivacion()) {
            if (activo) detener();
        } else {
            activo = true;
            programarRenovacion();
            renovarUbicacion();
        }
        actualizarBoton();
    }

    boton?.addEventListener('click', async () => {
        actualizarBoton(true);
        try {
            if (activo) {
                detener();
                await actualizacion?.catch(() => {});
                const respuesta = await fetch(presenciaUrl, { method: 'DELETE', headers });
                mostrarEstado(respuesta.ok ? 'Dejaste de compartir tu ubicación.' : 'La ubicación dejará de mostrarse al vencer.');
            } else {
                activo = true;
                mostrarEstado('Buscando tu ubicación.');
                await actualizar(false, true);
                if (activo) {
                    guardarActivacion(true);
                    programarRenovacion();
                }
            }
        } catch (error) {
            detener();
            mostrarEstado(error.message);
        } finally {
            actualizarBoton();
        }
    });

    window.addEventListener('pageshow', evento => {
        if (evento.persisted) recuperar();
    });
    recuperar();

    return {
        conectarMapa(mapa, L, contenedor) {
            const capa = L.layerGroup().addTo(mapa);
            dibujar = (datos, centrar) => {
                capa.clearLayers();
                if (!datos) return;
                dibujarAvatares(datos, capa, L, contenedor);
                const puntoPropio = [datos.own.latitude, datos.own.longitude];
                if (centrar && !mapa.getBounds().contains(puntoPropio)) mapa.panTo(puntoPropio);
            };
            dibujar(posiciones, false);
        },
    };
}

function dibujarAvatares({ own, data }, capa, L, contenedor) {
    const grupos = new Map();
    for (const posicion of [own, ...data]) {
        const punto = posicion.latitude + ',' + posicion.longitude;
        if (!grupos.has(punto)) grupos.set(punto, []);
        grupos.get(punto).push(posicion);
    }

    for (const grupo of grupos.values()) {
        for (const [indice, posicion] of grupo.entries()) {
            const esPropia = posicion === own;
            // Separá en pantalla los avatares con las mismas coordenadas redondeadas.
            const desplazamiento = (indice - (grupo.length - 1) / 2) * 34;
            const icon = L.icon({
                iconUrl: posicion.avatar || contenedor.dataset.iconos + '/dino-3.webp',
                iconSize: [28, 28],
                iconAnchor: [14 - desplazamiento, 14],
                tooltipAnchor: [desplazamiento, -14],
                className: esPropia ? 'presencia-marcador presencia-marcador-propio' : 'presencia-marcador',
            });
            const etiqueta = 'Ubicación Aproximada de ' + posicion.name;
            const contenido = document.createElement('span');
            contenido.textContent = esPropia ? etiqueta + ' (vos)' : etiqueta;
            L.marker([posicion.latitude, posicion.longitude], { icon, alt: contenido.textContent })
                .bindTooltip(contenido)
                .bindPopup(contenido.cloneNode(true))
                .addTo(capa);
        }
    }
}
