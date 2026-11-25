const paletas = {
    estandar: { agua: '#61cde5', vegetacion: '#b7e7c3', cobertura: '#dceadd', avenida: '#708da4' },
    protanopia: { agua: '#77b7ee', vegetacion: '#eed391', cobertura: '#eee4bf', avenida: '#304d70' },
    deuteranopia: { agua: '#84c4ec', vegetacion: '#eac78e', cobertura: '#f1e4cc', avenida: '#53406e' },
    tritanopia: { agua: '#c1a7e1', vegetacion: '#a9d4bd', cobertura: '#d9e8dc', avenida: '#843643' },
};

const paletasOscuras = {
    estandar: { agua: '#22506a', vegetacion: '#264c39', cobertura: '#213e31', avenida: '#899fb2' },
    protanopia: { agua: '#275f86', vegetacion: '#554825', cobertura: '#403823', avenida: '#a2bde8' },
    deuteranopia: { agua: '#305e83', vegetacion: '#5b4524', cobertura: '#483a25', avenida: '#c5a9db' },
    tritanopia: { agua: '#554477', vegetacion: '#315646', cobertura: '#294b3d', avenida: '#dda1b5' },
};

export function aplicarPaletaDinoMaps(mapa, capasOriginales, modo, estilo, oscuro = false) {
    const colores = oscuro ? paletasOscuras : paletas;
    const paleta = colores[modo] ?? colores.estandar;
    const claro = !oscuro && modo === 'estandar' && estilo === 'claro';
    const coloresSuelo = {
        building: oscuro ? '#32413b' : '#e0e3e1',
        landcover: paleta.cobertura,
        landuse: oscuro ? '#363b34' : '#eeeadd',
        park: paleta.vegetacion,
        water: paleta.agua,
        waterway: paleta.agua,
    };

    for (const capa of capasOriginales) {
        const origen = capa['source-layer'];
        const pintar = (propiedad, color) =>
            mapa.setPaintProperty(capa.id, propiedad, claro ? (capa.paint?.[propiedad] ?? null) : color);

        if (capa.type === 'background') {
            pintar('background-color', oscuro ? '#1d2924' : '#f3f2ea');
        } else if (capa.type === 'fill' && coloresSuelo[origen]) {
            const color = ['landcover', 'landuse'].includes(origen)
                ? ['match', ['get', 'class'], ['park', 'wood', 'grass', 'recreation_ground'], paleta.vegetacion, coloresSuelo[origen]]
                : coloresSuelo[origen];
            pintar('fill-color', color);
        } else if (capa.type === 'line' && origen === 'waterway') {
            pintar('line-color', paleta.agua);
        } else if (capa.type === 'line' && origen === 'transportation' && !/rail|ferry|path/.test(capa.id)) {
            pintar('line-color', /case|casing/.test(capa.id) ? (oscuro ? '#283b36' : '#aebfca') : [
                'match', ['get', 'class'],
                ['motorway', 'trunk'], paleta.avenida,
                ['primary', 'secondary'], oscuro ? '#718086' : '#a2b8ca',
                oscuro ? '#495850' : '#c5d1da',
            ]);
        } else if (capa.type === 'symbol' && origen === 'poi') {
            mapa.setLayoutProperty(capa.id, 'visibility', claro ? (capa.layout?.visibility ?? 'visible') : 'none');
        }
        if (capa.type === 'symbol' && capa.layout?.['text-field']) {
            mapa.setPaintProperty(capa.id, 'text-color', oscuro ? '#edf2e8' : (capa.paint?.['text-color'] ?? null));
            mapa.setPaintProperty(capa.id, 'text-halo-color', oscuro ? '#1b2c23' : (capa.paint?.['text-halo-color'] ?? null));
        }
    }
}
