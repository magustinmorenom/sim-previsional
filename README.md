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

## Regla de operación exacta

El cálculo exacto 1:1 con VBA se habilita hasta `n <= 12` por complejidad exponencial (`2^n`).
Para `n > 12`, el endpoint devuelve validación bloqueante (`422`).

## Regenerar datasets técnicos desde Excel

```bash
npm run extract:data
```

Origen esperado por defecto:

- `/Users/agustin/Downloads/proyectador de beneficios CEER vf 2025.xlsm`

