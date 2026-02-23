# Arquitectura App Anexa (WordPress)

## Rutas principales

- `/app`
- `/app/biblioteca`
- `/app/procesos`
- `/app/faq`
- `/app/repositorio-normativo`
- `/app/consultas`
- `/app/simuladores/previsional` (privado)
- `/app/simuladores/prestamos` (privado, reservado)
- `/app/acceso` (login OTP)

## Configuración de acceso

Archivo: `lib/config/module-access.ts`

Variables opcionales:

- `APP_PRIVATE_MODULES` (lista separada por coma de claves de módulo)
- `APP_PUBLIC_MODULES` (lista separada por coma)
- `APP_DISABLED_MODULES` (lista separada por coma)

Ejemplo:

```bash
APP_PUBLIC_MODULES="simulador-prestamos"
APP_PRIVATE_MODULES="biblioteca"
APP_DISABLED_MODULES="faq"
```

## Middleware

Archivo: `middleware.ts`

- Aplica sobre `/app/:path*`
- Redirige módulos privados sin cookie de sesión a `/app/acceso?next=...`

## BFF de contenido

Endpoints:

- `GET /api/v1/content/navigation`
- `GET /api/v1/content/library`
- `GET /api/v1/content/processes`
- `GET /api/v1/content/faq`
- `GET /api/v1/content/normative`
- `GET /api/v1/content/contact-channels`

Servicio: `lib/server/content/content-service.ts`

- Fuente configurable: `WP_APP_CONTENT_BASE_URL`
- Cache in-memory: `CONTENT_CACHE_TTL_SECONDS`
- Fallback local: `lib/server/content/fallback-content.ts`

## API pública de préstamos (proxy)

Endpoints:

- `GET /api/v1/public/prestamos/lineas`
- `POST /api/v1/public/prestamos/simulate` (deshabilitado por defecto)

Servicio: `lib/server/public-prestamos-client.ts`

Variables opcionales:

- `PRESTAMOS_API_BASE_URL`
- `PRESTAMOS_API_KEY`
- `PRESTAMOS_API_TIMEOUT_MS`
- `ENABLE_PRESTAMOS_SIMULATION` (`true` para habilitar `POST /simulate`)
