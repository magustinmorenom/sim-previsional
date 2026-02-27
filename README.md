# Simulador Previsional CEER 2025

Migración del archivo Excel/VBA `proyectador de beneficios CEER vf 2025.xlsm` a aplicación web fullstack con Next.js + TypeScript, con wizard explicativo y cálculo actuarial equivalente.

## Alcance implementado

- Motor actuarial server-side con traducción de la macro VBA `beneficio -> datos -> ppu`.
- Paridad funcional de Hoja3:
  - PPUU
  - Saldo Final
  - Beneficio Proyectado
  - Fecha de jubilación
  - Conteos n/cs/hs
- Datos técnicos congelados v2025 en JSON:
  - `LA0`, `LA1`, `LI0`, `LI1`, `PAI0`, `PAI1`
  - Tabla de factores de lookup (`L2:M42` de Hoja3)
- API REST:
  - `POST /api/v1/simulations/run`
  - `GET /api/v1/technical-bases`
  - `POST /api/v1/reports/pdf`
- Wizard UX de 6 pasos con explicaciones por sección.
- Modo avanzado con trazabilidad Hoja1-like y Hoja2-like.
- Exportación PDF de resultados.
- Módulo de simulación de préstamos (`sim-guion-prestamos`) con:
  - UI privada avanzada en `/app/simuladores/prestamos` (feature flag `ENABLE_PRESTAMOS_UI_V2`)
  - Selector de modo `API` / `Isolated` (default configurable con `PRESTAMOS_SIMULATOR_MODE`)
  - BFF interno `/api/v1/public/prestamos/*`
  - Mock API con JSON server para desarrollo local (`npm run mock:prestamos`)

## Criterios de paridad (caso base)

Caso base equivalente al workbook:

- `PPUU = 180.7791975865581`
- `Saldo Final = 6375620.8869871786`
- `Beneficio Proyectado = 35267.447649485868`

## Estructura principal

- `app/` UI y APIs.
- `lib/calc/engine.ts` motor actuarial principal.
- `lib/calc/worker-runner.ts` ejecución en worker thread con fallback.
- `workers/simulation-worker.ts` worker de cálculo.
- `data/technical/v2025/` datasets técnicos versionados.
- `tests/` unit, integration y e2e.
- `docs/` manual y mapeo Excel->app.

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar app:

```bash
npm run dev
```

3. Ejecutar tests unitarios/integración:

```bash
npm test
```

4. Ejecutar E2E:

```bash
npm run test:e2e
```

## Simulador de préstamos (fase mock)

1. Levantar mock API:

```bash
npm run mock:prestamos
```

2. Configurar entorno:

```bash
PRESTAMOS_API_BASE_URL=http://127.0.0.1:4010/api/v1/public/
API_KEY_CPS=tu_api_key
ENABLE_PRESTAMOS_SIMULATION=true
ENABLE_PRESTAMOS_UI_V2=true
```

3. Levantar app:

```bash
npm run dev:prestamos
```

## OTP QA (sin envío de correo)

Para pruebas con correos reales sin enviar código por SMTP:

```bash
OTP_DELIVERY_MODE=bypass
OTP_BYPASS_ALLOWED_EMAILS=correo1@dominio.com,correo2@dominio.com
```

En bypass el backend devuelve `devOtpCode` y la validación se realiza localmente.
En producción, bypass queda deshabilitado salvo override explícito (`OTP_BYPASS_ALLOW_IN_PROD=true`).

## Regla de operación exacta

El cálculo exacto 1:1 con VBA se habilita hasta `n <= 12` por complejidad exponencial (`2^n`).
Para `n > 12`, el endpoint devuelve validación bloqueante (`422`).

## Regenerar datasets técnicos desde Excel

```bash
npm run extract:data
```

Origen esperado por defecto:

- `/Users/agustin/Downloads/proyectador de beneficios CEER vf 2025.xlsm`
