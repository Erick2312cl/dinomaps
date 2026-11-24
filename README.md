# DinoMaps

Mapa urbano colaborativo de Neuquén. Trabajo de Programación Web Dinámica de la UNCo.

## Desarrollo con Docker

Con Docker Desktop abierto, ejecutá desde la raíz del proyecto.

```sh
docker compose up --build
```

Abrí http://localhost:8000. La primera ejecución descarga las imágenes y las dependencias de Composer, genera la clave local y aplica las migraciones. Cada integrante usa su propia base MariaDB en Docker.

## Desarrollo local con SQLite en Windows

Con PHP 8.4 y Composer disponibles, ejecutá desde PowerShell.

```powershell
Copy-Item .env.example .env
composer install
if (-not (Test-Path database/database.sqlite)) { New-Item -ItemType File database/database.sqlite }
php artisan key:generate
php artisan migrate
php artisan serve
```

En una instalación existente, conservá el archivo `.env` y su clave. PHP necesita las extensiones `mbstring` y `pdo_sqlite` para este entorno. La aplicación expone una comprobación de salud en `/up`.

## Estado

La página de inicio, la configuración del entorno y la primera migración están preparadas. La autenticación y el mapa se desarrollan a partir del prototipo de [DinoMaps en Figma](https://www.figma.com/design/3RywgJEOTOEOTCVz3VqsKs/DinoMaps?node-id=1478-547).
