const borde = document.getElementById('ajustar-panel-mapa');
const panel = document.getElementById(borde.getAttribute('aria-controls'));
const explorar = panel.parentElement;
const escritorio = window.matchMedia('(min-width: 701px)');
const estilos = getComputedStyle(explorar);
const anchoMinimo = parseFloat(estilos.getPropertyValue('--panel-minimo'));
const anchoMaximo = parseFloat(estilos.getPropertyValue('--panel-maximo'));
const mapaMinimo = parseFloat(estilos.getPropertyValue('--mapa-minimo'));

let arrastre;

const anchoActual = () => Math.round(panel.getBoundingClientRect().width);
const limite = () => Math.min(anchoMaximo, explorar.clientWidth - mapaMinimo);

function actualizarSeparador() {
    borde.hidden = !escritorio.matches;
    if (borde.hidden) return;

    borde.setAttribute('aria-valuemin', anchoMinimo);
    borde.setAttribute('aria-valuemax', limite());
    borde.setAttribute('aria-valuenow', anchoActual());
}

function ajustarAncho(ancho) {
    const nuevoAncho = Math.min(limite(), Math.max(anchoMinimo, ancho));
    explorar.style.setProperty('--ancho-panel', nuevoAncho + 'px');
    borde.setAttribute('aria-valuenow', nuevoAncho);
}

borde.addEventListener('pointerdown', evento => {
    if (!evento.isPrimary || evento.button !== 0) return;

    arrastre = { x: evento.clientX, ancho: anchoActual() };
    borde.setPointerCapture(evento.pointerId);
    explorar.classList.add('ajustando-panel-mapa');
});

borde.addEventListener('pointermove', evento => {
    if (!arrastre || !borde.hasPointerCapture(evento.pointerId) || !escritorio.matches) return;

    ajustarAncho(arrastre.ancho + evento.clientX - arrastre.x);
});

borde.addEventListener('lostpointercapture', () => {
    arrastre = undefined;
    explorar.classList.remove('ajustando-panel-mapa');
});

borde.addEventListener('keydown', evento => {
    const anchos = {
        ArrowLeft: anchoActual() - 24,
        ArrowRight: anchoActual() + 24,
        Home: anchoMinimo,
        End: limite(),
    };
    if (!Object.hasOwn(anchos, evento.key)) return;

    evento.preventDefault();
    ajustarAncho(anchos[evento.key]);
});

window.addEventListener('resize', actualizarSeparador);
actualizarSeparador();
