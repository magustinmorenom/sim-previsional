npm# Contrato API - Simulación Previsional

## Endpoint

- `POST /api/v1/simulations/run`

## Parámetros de entrada que recibe el sistema

> Nota de naming: usar `bov` como nombre técnico del campo objetivo.  
> No usar `bov_var`.

| Parámetro | Tipo | Requerido | Fuente esperada | Regla básica |
|---|---|---|---|---|
| `calculationDate` | `string (YYYY-MM-DD)` | Sí | API/DB | Fecha válida ISO |
| `accountBalance` | `number` | Sí | API/DB | `>= 0` |
| `bov` | `number` | Sí | API/DB | `>= 0` |
| `mandatoryContribution.startAge` | `number` | Sí | API/DB | `>= 0` |
| `mandatoryContribution.endAge` | `number` | Sí | API/DB | `>= 65` y `>= startAge` |
| `voluntaryContribution.startAge` | `number` | Sí | API/DB | `>= 0` |
| `voluntaryContribution.endAge` | `number` | Sí | API/DB | `>= startAge` y `<= mandatoryContribution.endAge` |
| `voluntaryContribution.monthlyAmount` | `number` | Sí | **Ingreso manual** | `>= 0` |
| `beneficiaries` | `array` | Sí | API/DB | mínimo `1`, máximo `56` (proceso exacto hasta `12`) |
| `beneficiaries[].type` | `"T" \| "C" \| "H"` | Sí | API/DB | 1 solo titular `T` |
| `beneficiaries[].sex` | `1 \| 2` | Sí | API/DB | catálogo fijo |
| `beneficiaries[].birthDate` | `string (YYYY-MM-DD)` | Sí | API/DB | fecha válida ISO |
| `beneficiaries[].invalid` | `0 \| 1` | Sí | API/DB | catálogo fijo |

## Mapa simple de parámetros (nombre de campo que usa el sistema)

```json
{
  "calculationDate": { "source": "API_DB", "required": true },
  "accountBalance": { "source": "API_DB", "required": true },
  "bov": { "source": "API_DB", "required": true },
  "mandatoryContribution.startAge": { "source": "API_DB", "required": true },
  "mandatoryContribution.endAge": { "source": "API_DB", "required": true },
  "voluntaryContribution.startAge": { "source": "API_DB", "required": true },
  "voluntaryContribution.endAge": { "source": "API_DB", "required": true },
  "voluntaryContribution.monthlyAmount": { "source": "MANUAL_INPUT", "required": true },
  "beneficiaries[].type": { "source": "API_DB", "required": true },
  "beneficiaries[].sex": { "source": "API_DB", "required": true },
  "beneficiaries[].birthDate": { "source": "API_DB", "required": true },
  "beneficiaries[].invalid": { "source": "API_DB", "required": true }
}
```

## JSON de request esperado

```json
{
  "calculationDate": "2026-02-18",
  "accountBalance": 3481733.27,
  "bov": 200832.23,
  "mandatoryContribution": {
    "startAge": 58,
    "endAge": 65
  },
  "voluntaryContribution": {
    "startAge": 58,
    "endAge": 65,
    "monthlyAmount": 15000
  },
  "beneficiaries": [
    {
      "type": "T",
      "sex": 1,
      "birthDate": "1966-05-19",
      "invalid": 0
    },
    {
      "type": "C",
      "sex": 2,
      "birthDate": "1972-04-07",
      "invalid": 0
    }
  ]
}
```

## JSON de respuesta esperada (`200`)

```json
{
  "ppuu": 180.7791975865581,
  "projectedBenefit": 35267.44764948587,
  "finalBalance": 6375620.886987179,
  "retirementDate": "2031-05-19",
  "counts": {
    "n": 2,
    "spouses": 1,
    "children": 0
  },
  "agesInMonths": [780, 709],
  "trace": {
    "xmin": 187,
    "tMax": 1145,
    "warnings": [],
    "advanced": {
      "hoja1Like": [
        {
          "beneficiaryIndex": 1,
          "type": "T",
          "birthDate": "1966-05-19",
          "ageMonthsAtRetirement": 780,
          "diffYears": 65,
          "diffMonths": 0,
          "diffDays": 0
        }
      ],
      "hoja2Like": {
        "baseAgeMonth": 187,
        "periodCount": 1145,
        "sumDiscountedProduct": 0,
        "equivalentFuu": 0,
        "rows": []
      }
    }
  }
}
```

## JSON de error (referencia de integración)

### `400` payload inválido

```json
{
  "error": "Payload inválido",
  "details": {}
}
```

### `422` cantidad de beneficiarios fuera de límite de cálculo exacto

```json
{
  "error": "El cálculo exacto está habilitado hasta n <= 12 por complejidad combinatoria (2^n)."
}
```

### `500` error interno

```json
{
  "error": "No fue posible ejecutar la simulación",
  "details": "mensaje interno"
}
```
