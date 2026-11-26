# DinoMaps

Mapa urbano colaborativo de Neuquén capital. Proyecto final de Programación Web Dinámica, Universidad Nacional del Comahue. Reúne un catálogo de lugares y actividades de turismo con reseñas y avisos de tránsito aportados por la comunidad.

## Integrantes

Erick Clavería, Martín Massimino, Bruno Carrera y Fernando Liozzi.

## Funcionalidades

- Mapa con búsqueda, categorías y fichas. Turismo incluye Paseo y parques, Trekking y Running.
- Reseñas de una a cinco estrellas, votos de utilidad, avisos de tránsito con confirmación y vencimiento, puntos y canje de dinosaurios.
- Registro, sesión, perfil, opciones de accesibilidad y ubicación aproximada voluntaria. Los avatares de demostración se identifican como tales.
- Administración de lugares con alta, consulta, modificación y baja lógica. Los lugares archivados dejan de aparecer en el catálogo público.

## Modelo relacional

| Relación | Uso real |
|---|---|
| Categoría 1:N lugares | El catálogo carga la categoría y filtra mediante la relación Lugar::categoria(). |
| Lugar 1:N reseñas | Las reseñas se vinculan mediante Lugar::reviews() y Review::lugar(). La ficha calcula la distribución. |
| Usuario 1:N reseñas | Review::user() permite mostrar el autor en la ficha. |
| Usuario N:N dinosaurios | User::dinosaurs(), Dinosaur::owners() y la tabla intermedia dinosaur_user. El canje usa attach() en la misma transacción que descuenta el saldo. |

Las migraciones definen el esquema y los seeders cargan 28 lugares, ocho categorías y 16 dinosaurios. Veinticinco lugares iniciales tienen coordenadas. Las reseñas y los avisos se generan desde la aplicación.

## Usuarios y permisos

| Perfil | Permisos |
|---|---|
| Visitante | Consulta mapa, catálogo, fichas y avisos públicos. Puede registrarse. |
| Usuario registrado | Puede reseñar, publicar y confirmar avisos según las reglas de autoría, canjear, equipar y compartir su ubicación aproximada con consentimiento. |
| Administrador | Tiene los permisos del usuario registrado y puede gestionar lugares. Las rutas usan auth y can:gestionar-catalogo. |

El registro crea cuentas comunes. Para habilitar a una cuenta existente, usá el comando Artisan dinomaps:administrador con su correo. Un usuario común recibe 403 al entrar a la administración.

## AJAX y librerías

- El navegador usa fetch para pedir GET /mapa/puntos. Laravel valida filtros, consulta Eloquent y responde JSON. Leaflet dibuja los puntos sin recargar la página y la interfaz informa si falla la carga. Los filtros de tránsito ofrecen otro ejemplo de actualización asíncrona.
- Leaflet 1.9.4 controla el mapa, los marcadores y la interacción. MapLibre GL JS 6.3.0 y su adaptador integran la cartografía vectorial de OpenFreeMap.
- Chart.js 4.4.9 dibuja gráficos de barras y circulares con el conteo de usuarios que dieron cada puntuación, a partir de las reseñas almacenadas. Hay una tabla accesible con los mismos datos.

## Ejecución local

Desde la raíz, con Docker y Docker Compose activos:

~~~sh
docker compose up --build -d
docker compose exec app php artisan migrate --seed
~~~

Abrí http://127.0.0.1:8000. Usá /up para verificar que Laravel responde. El mapa y el gráfico usan dependencias de CDN. El recorrido interno es opcional y requiere configurar GEOAPIFY_API_KEY del lado servidor. El enlace externo de indicaciones sigue disponible.
