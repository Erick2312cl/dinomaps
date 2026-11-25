const modos = ['estandar', 'protanopia', 'deuteranopia', 'tritanopia'];
const cuenta = document.body.hasAttribute('data-color-cuenta');
const controles = [...document.querySelectorAll('[data-modos-color] button')];

function modoVisitante() {
    try {
        return localStorage.getItem('dinomaps-modo-color');
    } catch {
        return null;
    }
}

function aplicarModo(modo) {
    const elegido = modos.includes(modo) ? modo : 'estandar';
    document.body.dataset.colorMode = elegido;
    for (const boton of controles) {
        const activo = boton.value === elegido;
        boton.setAttribute('aria-pressed', String(activo));
        boton.textContent = activo ? 'Activo' : 'Elegir';
        boton.disabled = false;
    }
    document.dispatchEvent(new Event('dinomaps:color'));
}

aplicarModo(cuenta ? document.body.dataset.colorMode : modoVisitante());

for (const grupo of document.querySelectorAll('[data-modos-color]')) {
    const estado = grupo.querySelector('[data-modo-estado]');
    grupo.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const modo = evento.submitter?.value;
        if (!modos.includes(modo) || modo === document.body.dataset.colorMode) return;
        for (const boton of controles) boton.disabled = true;
        try {
            if (cuenta) {
                const formulario = evento.target;
                const datos = new FormData(formulario);
                datos.set('color_mode', modo);
                const respuesta = await fetch(formulario.action, {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                    body: datos,
                });
                if (!respuesta.ok) throw new Error('No pudimos guardar el modo de color en tu cuenta.');
                const guardado = await respuesta.json();
                aplicarModo(guardado.color_mode);
            } else {
                try {
                    localStorage.setItem('dinomaps-modo-color', modo);
                } catch {
                    aplicarModo(modo);
                    estado.textContent = 'Modo aplicado para esta página.';
                    return;
                }
                aplicarModo(modo);
            }
            estado.textContent = 'Modo de color aplicado.';
        } catch (error) {
            estado.textContent = error.message;
        } finally {
            for (const boton of controles) boton.disabled = false;
        }
    });
}
