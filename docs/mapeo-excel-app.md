# Mapeo Excel -> App

## Macro VBA

- `Módulo1.beneficio()` -> `runSimulation()` + `computePpu()` en `lib/calc/engine.ts`.
- `Módulo1.datos()` -> normalización de entrada y carga de arreglos internos en `runSimulation()`.
- `Módulo1.ppu()` -> `computePpu()`.

## Hoja3

- `F20` (cantidad beneficiarios) -> `counts.n`.
- `F22` (cantidad cónyuges) -> `counts.spouses`.
- `F24` (cantidad hijos) -> `counts.children`.
- `F26` (fecha jubilación) -> `retirementDate`.
- `G20` (saldo final) -> `finalBalance`.
- `G10` (PPUU) -> `ppuu`.
- `G11` (beneficio proyectado) -> `projectedBenefit`.

## TABLA (sheet2)

- Columnas `B:C` -> `Lx` (LA0/LA1).
- Columnas `D:E` -> `Li` (LI0/LI1).
- Columnas `F:G` -> `Pai` (PAI0/PAI1).

## Hoja1 / Hoja2 (auxiliares)

- Hoja1 -> trazabilidad de edad en meses (`trace.advanced.hoja1Like`).
- Hoja2 -> serie auxiliar actuarial (`trace.advanced.hoja2Like`).

