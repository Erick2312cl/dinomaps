const dialogo = document.querySelector('#dialogo-canje');

if (dialogo && typeof dialogo.showModal === 'function') {
    const nombre = dialogo.querySelector('[data-canje-vista-nombre]');
    const precio = dialogo.querySelector('[data-canje-vista-precio]');
    const imagen = dialogo.querySelector('[data-canje-vista-imagen]');
    const sinImagen = dialogo.querySelector('[data-canje-sin-imagen]');
    const formulario = dialogo.querySelector('[data-canje-formulario]');
    let botonAnterior;

    document.querySelectorAll('[data-canje-abrir]').forEach((boton) => {
        boton.setAttribute('aria-haspopup', 'dialog');
        boton.addEventListener('click', (evento) => {
            if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.altKey || evento.metaKey || evento.shiftKey) return;

            evento.preventDefault();
            botonAnterior = boton;
            nombre.textContent = boton.dataset.canjeNombre;
            precio.textContent = `Costo: ${boton.dataset.canjePrecio} puntos`;
            formulario.action = boton.dataset.canjeDestino;

            const rutaImagen = boton.dataset.canjeImagen;
            if (rutaImagen) imagen.src = rutaImagen;
            else imagen.removeAttribute('src');
            imagen.hidden = !rutaImagen;
            sinImagen.hidden = Boolean(rutaImagen);

            dialogo.showModal();
        });
    });

    dialogo.addEventListener('close', () => botonAnterior?.focus({ preventScroll: true }));
}
