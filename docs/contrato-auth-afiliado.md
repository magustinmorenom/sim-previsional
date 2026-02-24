# Contrato API - Autenticación Afiliado Final

## Resumen

La app frontend consume únicamente endpoints locales (`/api/v1/*`).
Esos endpoints funcionan como BFF y delegan en una API remota configurable por `REMOTE_API_BASE_URL`.

Si `REMOTE_API_BASE_URL` no está configurada, el sistema usa por defecto la API fake local:

- `http://127.0.0.1:3000/api/fake/v1/`

Con eso, para pasar a API real solo hay que cambiar la URI base en variables de entorno.

## Endpoints locales (BFF)

### 1) Crear desafío OTP

- `POST /api/v1/auth/challenges`

Request:

```json
{
  "email": "afiliado@correo.com"
}
```

Response `200`:

```json
{
  "challengeId": "otp_ch_01JAZ...",
  "expiresInSeconds": 600,
  "resendAvailableInSeconds": 0
}
```

Notas:

- En modo desarrollo sin SMTP puede incluir `devMode=true` y `devOtpCode` para pruebas.

Errores esperados: `400`, `401`, `429`, `502`.

### 2) Validar OTP y crear sesión

- `POST /api/v1/auth/sessions`

Request:

```json
{
  "challengeId": "otp_ch_01JAZ...",
  "code": "123456"
}
```

Response `200`:

```json
{
  "authenticated": true
}
```

Notas:

- Crea cookie `HttpOnly` de sesión (`Max-Age=28800`, `SameSite=Lax`, `Secure` en producción).
- El desafío OTP se elimina al autenticar.

Errores esperados: `400`, `401`, `410`, `429`, `502`.

### 3) Obtener sesión actual

- `GET /api/v1/auth/sessions`

Response `200` autenticado:

```json
{
  "authenticated": true,
  "email": "afiliado@correo.com"
}
```

Response `200` sin sesión:

```json
{
  "authenticated": false
}
```

### 4) Cerrar sesión

- `DELETE /api/v1/auth/sessions`

Response `204` sin body.

Notas:

- Elimina cookie de sesión.
- Elimina cookie temporal de desafío OTP.

### 5) Obtener contexto canónico de simulación

- `GET /api/v1/affiliates/me/simulation-context`

Requiere sesión activa.

Response `200`:

```json
{
  "affiliate": {
    "email": "afiliado@correo.com",
    "fullName": "Nombre Apellido"
  },
  "calculationDate": "2026-02-19",
  "accountBalance": 3481733.27,
  "funds": {
    "mandatory": 3000000,
    "voluntary": 481733.27,
    "total": 3481733.27
  },
  "bov": 200832.23,
  "mandatoryContribution": {
    "startAge": 58,
    "endAgeDefault": 65
  },
  "voluntaryContribution": {
    "startAge": 58,
    "endAgeDefault": 65
  },
  "solidary": {
    "mrsValue": 150000,
    "matriculationDate": "1984-10-11",
    "sourceStatus": "READY"
  },
  "beneficiaries": [
    {
      "fullName": "Nombre Apellido",
      "type": "T",
      "sex": 1,
      "birthDate": "1966-05-19",
      "invalid": 0
    }
  ]
}
```

Errores esperados: `401`, `422`, `502`.

Notas:

- Si faltan `MRS` y/o `fechaMatriculacion`, el contexto sigue devolviendo `200` con `solidary.sourceStatus` indicando faltantes.
- `422` se reserva para faltantes críticos que impiden simular capitalización.

## API fake local

### URI base fake

- `/api/fake/v1`

### Endpoints fake

- `POST /api/fake/v1/auth/challenges`
- `POST /api/fake/v1/auth/sessions`
- `GET /api/fake/v1/affiliates/simulation-context?email=...`

La API fake devuelve formato tipo API real (`success/message/data`) con:

- `data.valorVAR`
- `data.valorMRS`
- `data.titular.fechaMatriculacion`
- `data.cuentaCapitalizacion.*`
- `data.titular` + `data.grupoFamiliar`

### Casos cargados desde JSON

Archivo: `/Users/agustin/Documents/00 Entorno de Aplicaciones/P10_Simulador_Previsional/data/fake/affiliates.json`

Correos habilitados:

- `amoreno@odin.ar`
- `magustin.morenom@gmail.com`

## Política OTP implementada

- Código de `6` dígitos.
- Vencimiento máximo de desafío: `10 minutos`.
- Máximo de intentos por desafío: `5`.
- Reenvío de OTP: inmediato.

## Envío de correos OTP

Para envío real por email, configurar SMTP:

- `SMTP_HOST`
- `SMTP_PORT` (default recomendado `587`)
- `SMTP_SECURE` (`true` o `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Sin SMTP, en desarrollo se activa modo debug y el OTP se expone como `devOtpCode`.

## Variables de entorno

- `REMOTE_API_BASE_URL` (opcional; si falta usa fake local)
- `REMOTE_API_TIMEOUT_MS` (default `10000`)
- `REMOTE_API_BEARER_TOKEN`
- `AUTH_SESSION_SECRET`
- `AUTH_SESSION_COOKIE_NAME` (default `sp_session`)

## Regla de datos faltantes

Si la API remota no devuelve campos obligatorios para construir el contexto canónico de simulación de capitalización, el BFF responde `422` y bloquea la simulación.

Si faltan solo datos de PBS (`MRS` o `fechaMatriculacion`), el BFF responde `200` y deja `solidary.sourceStatus` en estado de faltante.
