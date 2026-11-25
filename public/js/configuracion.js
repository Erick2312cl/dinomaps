const preferencias = [
    { campo: 'preferencia-tema', clave: 'dinomaps-tema', valores: ['claro', 'oscuro'] },
    { campo: 'preferencia-tipo-mapa', clave: 'dinomaps-tipo-mapa', valores: ['estandar', 'hibrido', 'satelite'] },
    { campo: 'preferencia-estilo', clave: 'dinomaps-estilo', valores: ['dinomaps', 'claro'] },
    { campo: 'preferencia-avatares', clave: 'dinomaps-avatares', valores: ['mostrar', 'ocultar'] },
    { campo: 'preferencia-avisos', clave: 'dinomaps-avisos', valores: ['manual', 'todos'] },
    { campo: 'preferencia-lugares', clave: 'dinomaps-lugares', valores: ['mostrar', 'ocultar'] },
    { campo: 'preferencia-viaje', clave: 'dinomaps-viaje', valores: ['drive', 'walk', 'bicycle'] },
    { campo: 'preferencia-unidades', clave: 'dinomaps-unidades', valores: ['km', 'mi'] },
    { campo: 'preferencia-texto', clave: 'dinomaps-texto', valores: ['normal', 'grande'] },
];

export function leerPreferencia(clave) {
    const preferencia = preferencias.find(item => item.clave === clave);
    try {
        const valor = localStorage.getItem(clave);
        return preferencia.valores.includes(valor) ? valor : preferencia.valores[0];
    } catch {
        return preferencia.valores[0];
    }
}

function aplicarApariencia() {
    document.documentElement.dataset.texto = leerPreferencia('dinomaps-texto');
    document.documentElement.dataset.tema = leerPreferencia('dinomaps-tema');
}
aplicarApariencia();

for (const panel of document.querySelectorAll('details[name="panel-dinomaps"]')) {
    const resumen = panel.querySelector('summary');
    const cerrar = () => {
        panel.open = false;
        resumen.focus();
    };
    panel.querySelector('[data-cerrar-panel]')?.addEventListener('click', cerrar);
    panel.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && panel.open) {
            evento.preventDefault();
            evento.stopPropagation();
            cerrar();
        }
    });
}

for (const preferencia of preferencias) {
    const campo = document.getElementById(preferencia.campo);
    if (!campo) continue;
    const estado = document.getElementById('estado-configuracion');
    campo.value = leerPreferencia(preferencia.clave);
    campo.addEventListener('change', () => {
        try {
            localStorage.setItem(preferencia.clave, campo.value);
            aplicarApariencia();
            estado.textContent = 'Preferencia guardada en este navegador.';
            if (preferencia.clave === 'dinomaps-tema') {
                document.dispatchEvent(new Event('dinomaps:apariencia'));
            } else if (document.getElementById('mapa')) {
                window.location.reload();
            }
        } catch {
            campo.value = leerPreferencia(preferencia.clave);
            estado.textContent = 'El navegador no pudo guardar la preferencia.';
        }
    });
}
