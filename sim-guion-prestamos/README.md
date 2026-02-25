# Sim Guion Prestamos

Módulo de simulación de préstamos para la app anexa, con dos etapas de integración:

1. Desarrollo local con mock API (`json-server`) en `/sim-guion-prestamos/mock`.
2. Integración con endpoint externo real sin cambiar el frontend (BFF interno `/api/v1/public/prestamos/*`).

## Estructura

- `mock/db.json`: catálogo y tasas mock.
- `mock/server.js`: servidor json-server + endpoint dinámico `POST /simular`.
- `mock/amortization.js`: cálculo mock para sistemas Francés y Alemán.
- `src/domain/*`: contratos y formateadores del módulo.
- `src/ui/*`: hook de negocio, componente principal y estilos.

## Variables de entorno relevantes

- `PRESTAMOS_API_BASE_URL`: base URL que consume el BFF interno.
- `PRESTAMOS_API_KEY`: API key que reenvía el BFF al upstream.
- `PRESTAMOS_API_TIMEOUT_MS`: timeout de requests al upstream.
- `ENABLE_PRESTAMOS_SIMULATION`: habilita `POST /api/v1/public/prestamos/simular`.
- `ENABLE_PRESTAMOS_UI_V2`: habilita la nueva experiencia de UI en `/app/simuladores/prestamos`.
- `PRESTAMOS_SIMULATOR_MODE`: modo inicial del módulo en UI (`api` o `isolated`).
- `PRESTAMOS_MOCK_PORT`: puerto local del mock (`4010` por defecto).
- `PRESTAMOS_MOCK_API_KEY`: api key opcional exigida por mock.

## Desarrollo local (fase mock)

1. Levantar mock:

```bash
npm run mock:prestamos
```

2. En otra terminal, levantar app con flags de préstamos:

```bash
npm run dev:prestamos
```

## Integración API externa (fase real)

Actualizar solo `PRESTAMOS_API_BASE_URL` y `PRESTAMOS_API_KEY`.
El frontend se mantiene consumiendo rutas internas `/api/v1/public/prestamos/*`.

## Modo Isolated (sin API)

La pantalla `/app/simuladores/prestamos` permite alternar entre:

- `API conectada`: usa BFF y endpoints `/api/v1/public/prestamos/*`.
- `Isolated`: usa catálogo local y cálculo local sin requests remotas.

El valor inicial se configura con `PRESTAMOS_SIMULATOR_MODE` y el usuario puede cambiarlo desde la UI.
