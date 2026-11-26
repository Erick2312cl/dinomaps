import { leerPreferencia } from './configuracion.js';
import { rutasDemo } from './rutas-demo.js';

const credito = 'Recorridos demo: <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>';

function prepararRuta(puntos, mapa) {
    const tramos = [];
    let total = 0;

    for (let i = 1; i < puntos.length; i++) {
        const desde = puntos[i - 1];
        const hasta = puntos[i];
        const longitud = mapa.distance(desde, hasta);
        if (longitud === 0) continue;
        tramos.push({ desde, hasta, inicio: total, longitud });
        total += longitud;
    }

    return { tramos, total };
}

function puntoEnRuta({ tramos, total }, distancia) {
    const metros = distancia % total;
    const tramo = tramos.find(({ inicio, longitud }) => metros < inicio + longitud) ?? tramos.at(-1);
    const avance = (metros - tramo.inicio) / tramo.longitud;
    return tramo.desde.map((coordenada, i) => coordenada + (tramo.hasta[i] - coordenada) * avance);
}

export function iniciarUsuariosDemo(mapa, L, boton, iconos) {
    const perfiles = {
        paseo: { archivo: 'dino-1.webp', tamano: [19, 22], velocidad: 1.35 },
        carrera: { archivo: 'dino-5.webp', tamano: [20, 22], velocidad: 2.6 },
        auto: { archivo: 'dino-7.webp', tamano: [28, 23], velocidad: 8 },
    };
    const recorridos = [
        { ruta: rutasDemo.paseo, tipo: 'paseo', fases: [.16, .62] },
        { ruta: rutasDemo.carrera, tipo: 'carrera', fases: [.23, .65] },
        { ruta: rutasDemo.auto, tipo: 'auto', fases: [.09, .43, .77] },
        { ruta: rutasDemo.oeste, tipo: 'auto', fases: [.10, .44, .76] },
        { ruta: rutasDemo.altaBarda, tipo: 'paseo', fases: [.22, .68] },
        { ruta: rutasDemo.confluencia, tipo: 'auto', fases: [.23, .70] },
        { ruta: rutasDemo.canalV, tipo: 'carrera', fases: [.15, .57, .83] },
        { ruta: rutasDemo.noreste, tipo: 'paseo', fases: [.28, .71] },
    ];
    const avatares = recorridos.flatMap(({ ruta, tipo, fases }) => {
        const recorrido = prepararRuta(ruta, mapa);
        const { archivo, tamano, velocidad } = perfiles[tipo];
        const icon = L.icon({ iconUrl: iconos + '/' + archivo, iconSize: tamano, className: 'usuario-demo-marcador' });
        return fases.map(fase => {
            const offset = fase * recorrido.total;
            const marcador = L.marker(puntoEnRuta(recorrido, offset), { icon, alt: 'Usuario de demostración' })
                .bindTooltip('Usuario de demostración');
            return { marcador, recorrido, offset, velocidad };
        });
    });
    const capa = L.layerGroup(avatares.map(({ marcador }) => marcador));
    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cuadro;
    let anterior;
    let segundos = 0;

    function animar(ahora) {
        anterior ??= ahora;
        const diferencia = ahora - anterior;
        if (diferencia >= 50) {
            segundos += Math.min(diferencia, 100) / 1000;
            anterior = ahora;
            for (const { marcador, recorrido, offset, velocidad } of avatares) {
                marcador.setLatLng(puntoEnRuta(recorrido, offset + segundos * velocidad));
            }
        }
        cuadro = requestAnimationFrame(animar);
    }

    function sincronizarAnimacion() {
        cancelAnimationFrame(cuadro);
        anterior = undefined;
        if (mapa.hasLayer(capa) && !document.hidden && !movimientoReducido.matches) {
            cuadro = requestAnimationFrame(animar);
        }
    }

    function mostrar(activar) {
        if (activar) {
            capa.addTo(mapa);
            mapa.attributionControl?.addAttribution(credito);
        } else {
            capa.remove();
            mapa.attributionControl?.removeAttribution(credito);
        }
        boton.setAttribute('aria-pressed', String(activar));
        sincronizarAnimacion();
    }

    boton.disabled = false;
    if (boton.dataset.mostrar === 'true' && leerPreferencia('dinomaps-avatares') === 'mostrar') mostrar(true);

    const alternar = () => mostrar(!mapa.hasLayer(capa));
    boton.addEventListener('click', alternar);
    document.addEventListener('visibilitychange', sincronizarAnimacion);
    movimientoReducido.addEventListener('change', sincronizarAnimacion);
    mapa.once('unload', () => {
        cancelAnimationFrame(cuadro);
        boton.removeEventListener('click', alternar);
        document.removeEventListener('visibilitychange', sincronizarAnimacion);
        movimientoReducido.removeEventListener('change', sincronizarAnimacion);
    });
}
