# Manual Funcional

## Flujo de uso

1. Contexto
- Revisa supuestos técnicos y alcance del cálculo.

2. Grupo familiar
- Carga beneficiarios con tipo (`T/C/H`), sexo (`1/2`), fecha de nacimiento e invalidez (`0/1`).
- Límite de interfaz: 56 beneficiarios.

3. Fechas y aportes
- Fecha de cálculo.
- Saldo de cuenta.
- Edades inicio/fin de aportes obligatorios y voluntarios.
- Importe mensual de aportes voluntarios.

4. Parámetros
- BOV.
- Supuestos técnicos (tasa 4%, tablas v2025, `xmin=187`).

5. Resultados
- Ejecuta simulación.
- Obtén PPUU, Saldo Final y Beneficio Proyectado.
- Exporta PDF.

6. Modo avanzado
- Hoja1-like: detalle de edad en meses por beneficiario.
- Hoja2-like: serie auxiliar actuarial mensual.

## Validaciones de negocio

- Máximo un titular (`T`).
- Fechas en formato `YYYY-MM-DD`.
- `endAge >= startAge` en aportes obligatorios y voluntarios.
- Para cálculo exacto: `n <= 12`.

