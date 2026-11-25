import { leerPreferencia } from './configuracion.js';

async function consultarAvisos(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        headers: { Accept: 'application/json', ...opciones.headers },
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(respuesta.status === 401 || respuesta.status === 419
            ? 'Volvé a iniciar sesión para continuar.'
            : (resultado.message || 'No pudimos completar la acción.'));
    }

    return resultado;
}

export function iniciarTransito(mapa, L) {
    const panel = document.getElementById('panel-transito');
    const estado = document.getElementById('estado-transito');
    const filtros = [...panel.querySelectorAll('input[type=checkbox]')];
    const capas = new Map(filtros.map(input => [input.value, L.layerGroup()]));
    const nombres = new Map(filtros.map(input => [input.value, input.dataset.tipo]));
    nombres.set('corte', 'Corte de calle');
    const simbolos = { concurrencia: 'A', obras: 'O', radares: 'R', accidentes: '!', corte: '×' };
    const filtroPara = tipo => tipo === 'corte' ? 'obras' : tipo;
    const detalle = document.getElementById('detalle-aviso');
    const votos = document.getElementById('votos-detalle-aviso');
    const confirmar = document.getElementById('confirmar-aviso');
    const opcionesEliminar = document.getElementById('opciones-eliminar-aviso');
    const eliminar = document.getElementById('eliminar-aviso');
    const botonDemo = document.getElementById('recorrido-demo-transito');
    const demo = L.layerGroup([
        [[-38.9585, -68.1048], [-38.95835, -68.0971]],
        [[-38.9589, -68.0806], [-38.9589, -68.0734]],
        [[-38.9590, -68.0580], [-38.9590, -68.0510]],
    ].map(puntos => L.polyline(puntos, estiloConcurrencia)
        .bindTooltip('Tramo de demostración · sin datos en vivo')));
    let mostrarDemo = false;
    const estadoDetalle = document.getElementById('estado-detalle-aviso');
    let avisoActual;
    let avisos = [];
    let revision = 0;
    let cargando = false;

    botonDemo.disabled = false;
    botonDemo.addEventListener('click', () => {
        mostrarDemo = !mostrarDemo;
        if (mostrarDemo) filtros.find(input => input.value === 'concurrencia').checked = true;
        botonDemo.setAttribute('aria-pressed', String(mostrarDemo));
        botonDemo.textContent = mostrarDemo ? 'Ocultar recorrido de ejemplo' : 'Ver recorrido de ejemplo';
        dibujarAvisos();
    });

    for (const boton of document.querySelectorAll('.cerrar-dialogo')) {
        boton.addEventListener('click', () => boton.closest('dialog').close());
    }

    function mostrarDetalle(aviso) {
        avisoActual = aviso;
        document.getElementById('titulo-detalle-aviso').textContent = nombres.get(aviso.type);
        document.getElementById('descripcion-detalle-aviso').textContent = aviso.description;
        votos.textContent = aviso.positive_votes + (aviso.positive_votes === 1 ? ' confirmación' : ' confirmaciones');
        const vence = document.getElementById('vencimiento-detalle-aviso');
        vence.textContent = 'Vence el ' + new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires',
        }).format(new Date(aviso.expires_at));
        if (confirmar) confirmar.hidden = !aviso.can_vote;
        if (opcionesEliminar) {
            opcionesEliminar.hidden = !aviso.can_delete;
            opcionesEliminar.open = false;
        }
        if (!detalle.open) {
            estadoDetalle.textContent = '';
            detalle.showModal();
        }
    }

    function dibujarAvisos() {
        const vigentes = avisos.filter(aviso => Date.parse(aviso.expires_at) > Date.now());
        for (const capa of capas.values()) capa.clearLayers();
        for (const aviso of vigentes) {
            const capa = capas.get(filtroPara(aviso.type));
            if (!capa) continue;
            if (aviso.type === 'concurrencia' && aviso.end_latitude != null && aviso.end_longitude != null) {
                dibujarTramo(mapa, L, capa, aviso, mostrarDetalle);
                continue;
            }
            const imagen = { radares: 'radar.svg', accidentes: 'accidente.svg' }[aviso.type];
            const contenido = document.createElement(imagen ? 'img' : 'span');
            if (imagen) {
                contenido.src = mapa.getContainer().dataset.iconos + '/' + imagen;
                contenido.alt = '';
            } else {
                contenido.textContent = simbolos[aviso.type];
            }
            const icon = L.divIcon({
                className: 'aviso-marcador aviso-marcador--' + aviso.type,
                html: contenido,
                iconSize: [25, 25],
                iconAnchor: [12, 12],
            });
            const nombre = nombres.get(aviso.type);
            L.marker([aviso.latitude, aviso.longitude], { icon, title: nombre, alt: nombre, bubblingMouseEvents: false })
                .on('click', () => mostrarDetalle(aviso)).addTo(capa);
        }

        for (const input of filtros) {
            const capa = capas.get(input.value);
            input.nextElementSibling.textContent = input.checked ? 'Sí' : 'No';
            if (input.checked) capa.addTo(mapa);
            else capa.remove();
        }
        const activos = filtros.filter(input => input.checked);
        const demoVisible = mostrarDemo && activos.some(input => input.value === 'concurrencia');
        if (demoVisible) demo.addTo(mapa);
        else demo.remove();
        estado.textContent = demoVisible ? 'Recorrido de demostración. Los tramos de ejemplo no son avisos en vivo.'
            : activos.length && !vigentes.some(aviso => activos.some(input => input.value === filtroPara(aviso.type)))
                ? 'No hay avisos vigentes para estos filtros.' : '';
    }

    if (leerPreferencia('dinomaps-avisos') === 'todos') {
        for (const input of filtros) input.checked = true;
        dibujarAvisos();
    }
    for (const input of filtros) input.addEventListener('change', dibujarAvisos);
    async function actualizarAvisos() {
        if (cargando) return;
        cargando = true;
        const anterior = revision;
        try {
            const { data } = await consultarAvisos(panel.dataset.avisos);
            if (revision !== anterior || JSON.stringify(avisos) === JSON.stringify(data)) return;
            avisos = data;
            dibujarAvisos();
            if (detalle.open && !avisos.some(aviso => aviso.id === avisoActual.id)) {
                detalle.close();
                estado.textContent = 'El aviso ya no está activo.';
            }
        } catch {
            estado.textContent = 'No pudimos cargar los avisos.';
        } finally {
            cargando = false;
        }
    }

    actualizarAvisos();
    window.setInterval(() => {
        if (document.hidden) return;
        if (avisos.some(aviso => Date.parse(aviso.expires_at) <= Date.now())) {
            avisos = avisos.filter(aviso => Date.parse(aviso.expires_at) > Date.now());
            dibujarAvisos();
            if (detalle.open && Date.parse(avisoActual.expires_at) <= Date.now()) detalle.close();
        }
        actualizarAvisos();
    }, 30000);

    confirmar?.addEventListener('click', async () => {
        const id = avisoActual.id;
        confirmar.disabled = true;
        try {
            const { data } = await consultarAvisos(confirmar.dataset.url.replace('__REPORT__', id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': confirmar.dataset.token },
            });
            revision++;
            avisos = avisos.map(aviso => aviso.id === id ? data : aviso);
            dibujarAvisos();
            if (detalle.open && avisoActual.id === id) {
                mostrarDetalle(data);
                estadoDetalle.textContent = 'Confirmación guardada.';
            }
        } catch (error) {
            if (detalle.open && avisoActual.id === id) estadoDetalle.textContent = error.message;
        } finally {
            confirmar.disabled = false;
        }
    });

    eliminar?.addEventListener('click', async () => {
        const id = avisoActual.id;
        eliminar.disabled = true;
        try {
            await consultarAvisos(eliminar.dataset.url.replace('__REPORT__', id), {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': eliminar.dataset.token },
            });
            revision++;
            avisos = avisos.filter(aviso => aviso.id !== id);
            dibujarAvisos();
            if (detalle.open && avisoActual.id === id) detalle.close();
            estado.textContent = 'Aviso eliminado.';
        } catch (error) {
            if (detalle.open && avisoActual.id === id) estadoDetalle.textContent = error.message;
        } finally {
            eliminar.disabled = false;
        }
    });

    const dialogo = document.getElementById('dialogo-aviso');
    if (dialogo) prepararPublicacion(mapa, L, dialogo, panel, aviso => {
        revision++;
        avisos.unshift(aviso);
        panel.querySelector('input[value="' + filtroPara(aviso.type) + '"]').checked = true;
        dibujarAvisos();
        estado.textContent = 'Aviso publicado.';
        mostrarDetalle(aviso);
    });
}

const estiloConcurrencia = { className: 'tramo-concurrencia', color: '#ff7617', weight: 6, dashArray: '9 6' };

function dibujarTramo(mapa, L, capa, aviso, mostrarDetalle) {
    const linea = L.polyline([
        [aviso.latitude, aviso.longitude],
        [aviso.end_latitude, aviso.end_longitude],
    ], { ...estiloConcurrencia, bubblingMouseEvents: false });
    const abrirDetalle = () => {
        if (!mapa.getContainer().classList.contains('seleccionando-aviso')) mostrarDetalle(aviso);
    };

    linea.on('click', abrirDetalle);
    linea.on('add', () => {
        const elemento = linea.getElement();
        if (!elemento) return;
        elemento.setAttribute('tabindex', '0');
        elemento.setAttribute('role', 'button');
        elemento.setAttribute('aria-label', 'Alta concurrencia: ' + aviso.description);
        elemento.addEventListener('keydown', evento => {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrirDetalle();
            }
        });
    });
    linea.addTo(capa);
}

function prepararPublicacion(mapa, L, dialogo, panel, publicado) {
    const abrir = document.getElementById('abrir-aviso');
    const form = document.getElementById('form-aviso');
    const selector = document.getElementById('selector-aviso');
    const elegir = document.getElementById('seleccionar-ubicacion-aviso');
    const elegirFin = document.getElementById('seleccionar-fin-aviso');
    const finTramo = document.getElementById('fin-tramo');
    const tipo = document.getElementById('tipo-aviso');
    const etiquetaInicio = document.getElementById('etiqueta-ubicacion-aviso');
    let controlSeleccion = elegir;

    function ajustarCampos() {
        const esTramo = tipo.value === 'concurrencia';
        etiquetaInicio.textContent = esTramo ? 'Inicio del tramo' : 'Ubicación';
        finTramo.hidden = !esTramo;
        form.elements.end_latitude.disabled = !esTramo;
        form.elements.end_longitude.disabled = !esTramo;
    }
    tipo.addEventListener('change', ajustarCampos);
    ajustarCampos();
    const centro = document.getElementById('usar-centro-aviso');
    const error = document.getElementById('error-aviso');
    const enviar = form.querySelector('button[type=submit]');

    function finalizarSeleccion() {
        mapa.off('click', seleccionarPunto);
        selector.hidden = true;
        mapa.getContainer().classList.remove('seleccionando-aviso');
        dialogo.showModal();
        controlSeleccion.focus();
    }

    function guardarPunto({ lat, lng }) {
        const prefijo = controlSeleccion === elegirFin ? 'end_' : '';
        const latitud = lat.toFixed(6);
        const longitud = L.Util.wrapNum(lng, [-180, 180], true).toFixed(6);
        form.elements[prefijo + 'latitude'].value = latitud;
        form.elements[prefijo + 'longitude'].value = longitud;
        controlSeleccion.textContent = latitud + ', ' + longitud;
        error.hidden = true;
        finalizarSeleccion();
    }

    function seleccionarPunto(evento) {
        guardarPunto(evento.latlng);
    }

    abrir.disabled = false;
    abrir.addEventListener('click', () => dialogo.showModal());
    if (panel.dataset.abrir === '1') dialogo.showModal();

    for (const boton of [elegir, elegirFin]) boton.addEventListener('click', () => {
        controlSeleccion = boton;
        dialogo.close();
        selector.hidden = false;
        centro.focus();
        mapa.getContainer().classList.add('seleccionando-aviso');
        mapa.once('click', seleccionarPunto);
    });
    centro.addEventListener('click', () => guardarPunto(mapa.getCenter()));
    document.getElementById('cancelar-ubicacion-aviso').addEventListener('click', finalizarSeleccion);

    form.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (!form.elements.latitude.value || !form.elements.longitude.value) {
            error.textContent = 'Elegí la ubicación del aviso.';
            error.hidden = false;
            elegir.focus();
            return;
        }

        if (tipo.value === 'concurrencia') {
            const inicio = [form.elements.latitude.value, form.elements.longitude.value];
            const fin = [form.elements.end_latitude.value, form.elements.end_longitude.value];
            if (!fin.every(Boolean) || inicio.every((valor, i) => valor === fin[i])) {
                error.textContent = 'Elegí un punto final distinto del inicio del tramo.';
                error.hidden = false;
                elegirFin.focus();
                return;
            }
        }

        error.hidden = true;
        enviar.disabled = true;
        try {
            const { data } = await consultarAvisos(form.action, { method: 'POST', body: new FormData(form) });
            form.reset();
            elegir.textContent = 'Elegir en el mapa';
            elegirFin.textContent = 'Elegir fin en el mapa';
            ajustarCampos();
            if (dialogo.open) dialogo.close();
            publicado(data);
        } catch (fallo) {
            error.textContent = fallo.message;
            error.hidden = false;
        } finally {
            enviar.disabled = false;
        }
    });
}
