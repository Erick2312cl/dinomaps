const tipos = {
    estandar: 'Estándar',
    hibrido: 'Híbrido',
    satelite: 'Satélite',
};
const baseEox = 'https://tiles.maps.eox.at/wmts/1.0.0/';
const creditoImagen = '<a href="https://cloudless.eox.at">EOxCloudless</a> por <a href="https://eox.at">EOX IT Services GmbH</a> (datos Copernicus Sentinel modificados, 2023)';
const creditoCalles = '<a href="https://maps.eox.at">EOX::Maps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function esperarTeselas(capa, signal) {
    return new Promise((resolve, reject) => {
        let alguna = false;
        const temporizador = setTimeout(() => finalizar(false), 10000);
        function exito() { alguna = true; }
        function alCargar() { finalizar(alguna); }
        function cancelar() { finalizar(false); }
        function finalizar(ok) {
            clearTimeout(temporizador);
            capa.off('tileload', exito);
            capa.off('load', alCargar);
            signal.removeEventListener('abort', cancelar);
            if (ok) resolve();
            else reject(new Error('Las imágenes del mapa no pudieron cargar.'));
        }
        capa.on('tileload', exito);
        capa.once('load', alCargar);
        signal.addEventListener('abort', cancelar, { once: true });
    });
}

export function iniciarSelectorMapa(mapa, L, activarEstandar) {
    const selector = document.getElementById('selector-mapa');
    const resumen = selector.querySelector('summary');
    const botones = [...selector.querySelectorAll('[data-tipo-mapa]')];
    const estado = document.getElementById('estado-tipo-mapa');
    const panel = mapa.createPane('imagenBase');
    panel.style.zIndex = 220;

    let activo = 'estandar';
    let capasActivas = [];
    let pendiente;

    function seleccionar(tipo, detenerEstandar) {
        activo = tipo;
        for (const boton of botones) {
            boton.setAttribute('aria-pressed', String(boton.dataset.tipoMapa === tipo));
        }
        resumen.setAttribute('aria-label', 'Tipo de mapa · ' + tipos[tipo]);
        estado.setAttribute('data-confirmado', '');
        estado.textContent = 'Mapa ' + tipos[tipo] + ' activo.';
        if (selector.open) {
            selector.open = false;
            resumen.focus();
        }
        if (tipo !== 'estandar') detenerEstandar();
        try {
            localStorage.setItem('dinomaps-tipo-mapa', tipo);
        } catch {
            // La selección sigue vigente mientras la página permanezca abierta.
        }
    }

    let detenerEstandar = activarEstandar();
    async function cambiar(tipo) {
        pendiente?.abort();
        pendiente = null;
        if (tipo === activo) {
            seleccionar(tipo, detenerEstandar);
            return;
        }

        if (tipo === 'estandar') {
            detenerEstandar = activarEstandar();
            for (const capa of capasActivas) capa.remove();
            capasActivas = [];
            seleccionar(tipo, detenerEstandar);
            return;
        }

        const operacion = new AbortController();
        pendiente = operacion;
        estado.removeAttribute('data-confirmado');
        estado.textContent = 'Cargando mapa ' + tipos[tipo] + '…';
        const opciones = { pane: 'imagenBase', maxNativeZoom: 14, maxZoom: 19, opacity: 0 };
        const capas = [
            L.tileLayer(baseEox + 's2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg', {
                ...opciones, attribution: creditoImagen, className: 'imagen-satelital',
            }),
        ];
        if (tipo === 'hibrido') {
            capas.push(L.tileLayer(baseEox + 'overlay_bright_3857/default/g/{z}/{y}/{x}.png', {
                ...opciones, attribution: creditoCalles,
            }));
        }

        try {
            const carga = Promise.all(capas.map(capa => esperarTeselas(capa, operacion.signal)));
            for (const capa of capas) capa.addTo(mapa);
            await carga;
            if (operacion.signal.aborted) return;
            for (const capa of capasActivas) capa.remove();
            capasActivas = capas;
            for (const capa of capasActivas) capa.setOpacity(1);
            seleccionar(tipo, detenerEstandar);
        } catch {
            if (!operacion.signal.aborted) {
                estado.textContent = 'No se pudo cargar el mapa ' + tipos[tipo] + '. Sigue activo ' + tipos[activo] + '.';
            }
        } finally {
            operacion.abort();
            if (capasActivas !== capas) for (const capa of capas) capa.remove();
            if (pendiente === operacion) pendiente = null;
        }
    }

    resumen.removeAttribute('aria-disabled');
    for (const boton of botones) {
        boton.disabled = false;
        boton.addEventListener('click', () => cambiar(boton.dataset.tipoMapa));
    }
    selector.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape' || !selector.open) return;
        selector.open = false;
        resumen.focus();
    });
    document.addEventListener('click', evento => {
        if (!selector.contains(evento.target)) selector.open = false;
    });

    try {
        const preferido = localStorage.getItem('dinomaps-tipo-mapa');
        if (preferido === 'hibrido' || preferido === 'satelite') cambiar(preferido);
    } catch {
        // Estándar es el tipo inicial cuando el almacenamiento no está disponible.
    }
}
