document.addEventListener('click', event => {
    const enlace = event.target.closest('[data-detalle-turismo], [data-turismo-en-mapa]');
    if (!enlace || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    if (enlace.dataset.detalleTurismo) {
        const dialogo = document.getElementById(enlace.dataset.detalleTurismo);
        if (typeof dialogo?.showModal !== 'function') return;
        event.preventDefault();
        dialogo.showModal();
    } else {
        enlace.closest('dialog')?.close();
    }
});
