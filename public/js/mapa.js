import { iniciarPresencia } from './presencia.js';
import { iniciarRecorrido } from './recorrido.js';
import { leerPreferencia } from './configuracion.js';
import { aplicarPaletaDinoMaps } from './estilo-mapa.js';
import { iniciarTransito } from './transito.js';
import { iniciarSelectorMapa } from './tipo-mapa.js';
import { iniciarUsuariosDemo } from './usuarios-demo.js';

let L;

const contenedor = document.getElementById('mapa');
const estado = document.getElementById('estado-mapa');
const ubicar = document.getElementById('mi-ubicacion');

async function iniciarMapa() {
    try {
        L = await import('leaflet');
    } catch {
        estado.textContent = 'El mapa no pudo cargar. Podés seguir usando el catálogo.';
        return;
    }

    const neuquen = [-38.9556, -68.0591];
    const mapa = L.map(contenedor, {
        minZoom: 4,
        maxZoom: 19,
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
    }).setView(neuquen, 13);
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
    iniciarSelectorMapa(mapa, L, () => iniciarCartografia(mapa));

    let posicion;
    ubicar.disabled = !navigator.geolocation;
    ubicar.addEventListener('click', () => {
        ubicar.disabled = true;
        estado.textContent = 'Buscando tu ubicación…';
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            const punto = [coords.latitude, coords.longitude];
            if (posicion) posicion.remove();
            posicion = L.circleMarker(punto, { color: '#28597b', radius: 7 }).addTo(mapa);
            posicion.bindTooltip('Tu ubicación');
            mapa.setView(punto, 16);
            estado.textContent = 'Ubicación encontrada.';
            ubicar.disabled = false;
        }, () => {
            estado.textContent = 'No pudimos obtener tu ubicación. Revisá el permiso del navegador.';
            ubicar.disabled = false;
        }, { timeout: 10000 });
    });

    const iconos = contenedor.dataset.iconos;
    const muestra = document.getElementById('usuarios-demo');
    if (muestra) iniciarUsuariosDemo(mapa, L, muestra, iconos);
    iniciarPresencia(mapa, L, contenedor);
    iniciarRecorrido(mapa, L);

    if (document.getElementById('panel-transito')) {
        iniciarTransito(mapa, L);
        return;
    }

    const slugSolicitado = () => new URLSearchParams(location.hash.slice(1)).get('lugar');
    const ocultarLugares = leerPreferencia('dinomaps-lugares') === 'ocultar';
    if (ocultarLugares && !slugSolicitado() && !document.querySelector('[data-turismo-en-mapa]')) return;

    try {
        const respuesta = await fetch(contenedor.dataset.puntos, { headers: { Accept: 'application/json' } });
        if (!respuesta.ok) throw new Error('No se pudieron consultar los lugares.');
        const lugares = await respuesta.json();
        const marcadores = new Map();
        for (const lugar of lugares) {
            const ficha = document.createElement('a');
            ficha.href = lugar.ficha;
            ficha.textContent = lugar.nombre;
            const contenido = document.createElement('img');
            const categoria = ['hoteles', 'museos', 'farmacias', 'cajeros', 'bancos', 'turismo', 'transporte', 'restaurantes'].includes(lugar.categoria)
                ? lugar.categoria
                : null;
            contenido.src = categoria ? iconos + '/categorias/' + categoria + '.svg' : iconos + '/dino-2.webp';
            contenido.alt = '';
            const pin = document.createElement('span');
            pin.className = 'pin-lugar';
            pin.append(contenido);
            const icon = L.divIcon({
                className: 'marcador-lugar marcador-lugar--' + (categoria ?? 'general'),
                html: pin,
                iconSize: [31, 31],
                iconAnchor: [15, 30],
                popupAnchor: [0, -29],
            });
            const etiqueta = lugar.nombre + ' · ' + lugar.categoria_nombre;
            const marcador = L.marker([lugar.latitud, lugar.longitud], { icon, title: etiqueta })
                .bindPopup(ficha);
            marcador.on('add', () => marcador.getElement().setAttribute('aria-label', etiqueta));
            marcador.on('popupopen', () => marcador.getElement().classList.add('marcador-lugar-activo'));
            marcador.on('popupclose', () => marcador.getElement()?.classList.remove('marcador-lugar-activo'));
            if (!ocultarLugares) marcador.addTo(mapa);
            marcadores.set(lugar.slug, marcador);
        }

        const avisoLugarNoDisponible = 'Este lugar no está disponible en el mapa.';

        function enfocarLugar() {
            const slug = slugSolicitado();
            if (ocultarLugares) {
                for (const [clave, marcador] of marcadores) {
                    if (clave !== slug) marcador.remove();
                }
            }
            const marcador = marcadores.get(slug);
            if (slug && !marcador) {
                estado.textContent = avisoLugarNoDisponible;
                return false;
            }
            if (estado.textContent === avisoLugarNoDisponible) estado.textContent = '';
            if (!marcador) return false;

            const lateral = document.querySelector('.resultados').getBoundingClientRect();
            const area = contenedor.getBoundingClientRect();
            const anchoCubierto = lateral.top < area.bottom ? Math.max(0, lateral.right - area.left) : 0;
            const zoom = Math.max(mapa.getZoom(), 16);
            const centro = mapa.project(marcador.getLatLng(), zoom).subtract([anchoCubierto / 2, 20]);
            mapa.setView(mapa.unproject(centro, zoom), zoom);
            marcador.addTo(mapa).openPopup();
            contenedor.scrollIntoView({ block: 'nearest' });
            return true;
        }

        window.addEventListener('hashchange', enfocarLugar);
        document.addEventListener('click', event => {
            const enlace = event.target.closest('[data-turismo-en-mapa]');
            if (enlace?.href === location.href && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                enfocarLugar();
            }
        });

        if (!enfocarLugar() && !ocultarLugares && contenedor.dataset.ajustar === 'true' && lugares.length) {
            const lateral = document.querySelector('.resultados').getBoundingClientRect();
            const area = contenedor.getBoundingClientRect();
            const anchoCubierto = lateral.top < area.bottom ? Math.max(0, lateral.right - area.left) : 0;
            mapa.fitBounds(lugares.map(lugar => [lugar.latitud, lugar.longitud]), {
                paddingTopLeft: [anchoCubierto + 25, 95],
                paddingBottomRight: [48, 35],
                maxZoom: 15,
            });
        }
    } catch {
        estado.textContent = 'Los marcadores no pudieron cargar. Las fichas siguen disponibles.';
    }
}

function iniciarCartografia(mapa) {
    const control = new AbortController();
    let capa;

    function usarRespaldo() {
        if (control.signal.aborted) return;
        capa?.remove();
        capa = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            className: 'mapa-base-raster',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        });
        capa.on('tileerror', () => {
            estado.textContent = 'Algunos sectores del mapa no pudieron cargar.';
        });
        capa.addTo(mapa);
    }

    async function cargar() {
        try {
            const { maplibreGL } = await import('maplibre-gl-leaflet');
            if (control.signal.aborted) return;
            capa = maplibreGL({ style: 'https://tiles.openfreemap.org/styles/positron' });
            capa.addTo(mapa);
            const mapaVectorial = capa.getMaplibreMap();
            mapaVectorial.once('error', usarRespaldo);
            mapaVectorial.once('load', () => {
                if (control.signal.aborted) return;
                mapaVectorial.off('error', usarRespaldo);
                const originales = mapaVectorial.getStyle().layers;
                const actualizarPaleta = () => aplicarPaletaDinoMaps(
                    mapaVectorial, originales, document.body.dataset.colorMode, leerPreferencia('dinomaps-estilo'),
                    document.documentElement.dataset.tema === 'oscuro',
                );
                actualizarPaleta();
                document.addEventListener('dinomaps:color', actualizarPaleta, { signal: control.signal });
                document.addEventListener('dinomaps:apariencia', actualizarPaleta, { signal: control.signal });
            });
        } catch {
            usarRespaldo();
        }
    }

    cargar();
    return () => {
        control.abort();
        capa?.remove();
        capa = null;
    };
}

iniciarMapa();
