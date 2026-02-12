# BASES TÉCNICAS 2025 - CEER

## Caja de Previsión Social de Profesionales de Ciencias Económicas de Entre Ríos

### Reglamento de Ley Nro. 11034 - Régimen de Capitalización

---

<!-- 
NOTAS DEL DOCUMENTO:
- Las fórmulas están expresadas en pseudocódigo para facilitar su implementación
- Los caracteres griegos se reemplazan por sus nombres: alpha, beta, gamma, delta, etc.
- Los subíndices se expresan con guión bajo: x_j significa x subíndice j
- Los superíndices se expresan con ^: x^2 significa x al cuadrado
- SUMA() representa el símbolo de sumatoria (Sigma)
- PRODUCTO() representa el símbolo de productoria (Pi)
- ENT() representa la función parte entera (floor)
-->

---

# SECCIÓN I: Tablas de Mortalidad

<!-- 
Esta sección define las tablas estadísticas que indican la probabilidad de supervivencia 
a cada edad. Son fundamentales para todos los cálculos actuariales del sistema.
-->

## Qué Es

Las tablas de mortalidad son tablas estadísticas que indican, para cada edad, cuántas personas de un grupo inicial siguen vivas. El sistema CEER usa dos tablas distintas según el estado del afiliado.

## Para Qué Sirve

- Calcular la **probabilidad de supervivencia** de un afiliado a cualquier edad
- Determinar el **Factor Único Unitario (FUU)** que define cuánto cobrará de jubilación
- Estimar cuánto tiempo se pagarán los beneficios (esperanza de vida)

**Caso de uso real:** Si un afiliado tiene 65 años, la tabla me dice qué probabilidad tiene de llegar a 66, 67, 68... y así puedo calcular cuántos meses de jubilación probablemente cobrará.

## Contenido

### 1) Tabla GAM 1983 (Group Annuitants Mortality)

- **Aplica a:** Varones y mujeres **NO inválidos** (activos y jubilados sanos)
- **Excepción edades 0-4 años:** Se usan probabilidades de la tabla CSO 1980 ajustadas:
  - Masculino: **40%** de la probabilidad de fallecimiento
  - Femenino: **30%** de la probabilidad de fallecimiento

### 2) Tabla MI 85 (Mortalidad de Inválidos)

- **Aplica a:** Varones y mujeres **inválidos**
- Mayor mortalidad que GAM 1983 (los inválidos tienen menor esperanza de vida)

## Ejemplo Práctico

| Situación | Tabla a usar |
|-----------|--------------|
| Juan, 60 años, activo aportando | GAM 1983 |
| María, 65 años, jubilada ordinaria | GAM 1983 |
| Pedro, 55 años, jubilado por invalidez | MI 85 |
| Hijo de 3 años de afiliado fallecido | GAM 1983 (con ajuste CSO al 40% o 30%) |

---

# SECCIÓN II: Tasa de Interés de Referencia

<!-- 
Define la tasa utilizada para todos los cálculos actuariales.
Permite descontar pagos futuros y capitalizar aportes.
-->

## Qué Es

Es la tasa que el sistema utiliza para todos los cálculos actuariales. Representa el rendimiento esperado del dinero en el tiempo y permite "traer a valor presente" los pagos futuros.

## Para Qué Sirve

- **Descontar pagos futuros:** Si voy a pagar $100 dentro de 1 año, hoy vale menos (aproximadamente $96.15 al 4%)
- **Capitalizar aportes:** Los aportes que hace el afiliado crecen a esta tasa
- **Calcular el FUU:** El factor de descuento v = 1.04^(-1) es clave en la fórmula
- **Ajustar prestaciones:** Las jubilaciones se actualizan usando esta tasa

**Caso de uso real:** Si un afiliado aporta $10.000 hoy, en 10 años tendrá $10.000 * 1.04^10 = $14.802 (sin contar aportes adicionales).

## Contenido

**Tasa de interés de referencia efectiva anual: 4%**

### Factor de actualización mensual

```
v_12 = 1.04^(-1/12)
v_12 = 0.996741 (aproximadamente)
```

Esto significa que $1 a cobrar dentro de 1 mes equivale a $0.9967 hoy.

### Factor de actualización anual

```
v = 1.04^(-1)
v = 0.961538 (aproximadamente)
```

Esto significa que $1 a cobrar dentro de 1 año equivale a $0.9615 hoy.

## Ejemplo Práctico

| Concepto | Fórmula | Resultado |
|----------|---------|-----------|
| $1.000 hoy, ¿cuánto es en 5 años? | 1000 * 1.04^5 | $1.216,65 |
| $1.000 en 5 años, ¿cuánto vale hoy? | 1000 * 1.04^(-5) | $821,93 |
| $1.000 en 12 meses, ¿cuánto vale hoy? | 1000 * (v_12)^12 | $961,54 |

---

# SECCIÓN III: Nomenclatura

<!-- 
Diccionario completo de todas las variables y símbolos utilizados en las fórmulas.
Esencial para interpretar correctamente las fórmulas y programar el sistema.
-->

## Qué Es

Es el "diccionario" de todas las variables y símbolos que se usan en las fórmulas del documento. Sin entender esto, es imposible leer las fórmulas correctamente.

## Para Qué Sirve

- **Referencia rápida** cuando leés una fórmula y no sabés qué significa una letra
- **Estandarizar** el lenguaje técnico entre actuarios, administradores y sistemas
- **Programar** correctamente el simulador o cualquier sistema de cálculo

## Contenido

### A) Variables Financieras

| Variable | Significado |
|----------|-------------|
| `rr(t)` | Tasa equivalente correspondiente al período (t) de la tasa de interés de referencia efectiva anual |
| `v_12` | Factor de actualización financiero mensual = 1.04^(-1/12) |

### B) Cuentas y Saldos

| Variable | Significado |
|----------|-------------|
| `BOV` | Beneficio Objetivo Vigente |
| `CIAO(t)` | Saldo de la Subcuenta de Capitalización Individual de Aportes **Obligatorios** al momento "t" |
| `CIAV(t)` | Saldo de la Subcuenta de Capitalización Individual de Aportes **Voluntarios** al momento "t" |
| `CPP(t)` | Cuenta de Pago de Prestaciones en el momento "t" |
| `V(T)` | Reserva Matemática al momento T |

### C) Factor Actuarial

| Variable | Significado |
|----------|-------------|
| `FUU(t)` | Factor Único Unitario correspondiente a la edad alcanzada, sexo y estado de capacidad o incapacidad para el trabajo, tanto del afiliado como de sus derechohabientes, según corresponda |

### D) Variables de Tiempo y Edad

| Variable | Significado |
|----------|-------------|
| `z` | Edad a la fecha del otorgamiento del beneficio de jubilación o del cálculo de cualquier prestación |
| `t` | Subíndice de tiempo expresado en **meses** |
| `q` | Tiempo transcurrido, en meses, desde la fecha de afiliación |
| `x_j` | Edad del j-ésimo integrante. Se computa desde la fecha de devengamiento y debe expresarse en **meses enteros cumplidos** |
| `x_min` | Edad en meses enteros cumplidos del integrante de **menor edad** |
| `x` | Edad entera en **años** |
| `s` | Valor entero en años |
| `y` | Valor entero en años |

### E) Variables de Grupo Familiar

| Variable | Significado |
|----------|-------------|
| `n` | Cantidad de personas con derecho a beneficio |
| `m` | Cantidad de cónyuges y/o convivientes con derecho a beneficio |
| `h` | Cantidad de hijos con derecho a beneficio |
| `j` | Individualización de la persona, donde j toma valores de 1 a n |
| `i` | Subíndice de configuración que toma valores desde 0 hasta (2^n - 1) |

### F) Concepto de Configuración

**Configuración:** Cada una de las posibles combinaciones que puede adoptar, en relación al derecho a la percepción del beneficio, el grupo inicial conformado por el causante y/o derechohabientes en cada momento del tiempo.

Dado que cada individuo puede o no tener derecho en cada momento del tiempo a la percepción del Beneficio, **la cantidad de configuraciones posibles es 2^n**.

**Ejemplo:** Si hay 3 personas con derecho (n=3), hay 2^3 = 8 configuraciones posibles (desde "ninguno cobra" hasta "todos cobran").

### G) Variables de Estado para Configuraciones

| Variable | Significado |
|----------|-------------|
| `gca(i)` | Supervivencia (gca=1) o no supervivencia (gca=0) del **causante** para cada configuración |
| `gco(i)` | Cantidad de **cónyuges y/o convivientes** sobrevivientes para cada configuración |
| `gh(i)` | Cantidad de **hijos** que permanecen con derecho en la configuración |

### H) Probabilidades

| Variable | Significado |
|----------|-------------|
| `p_G(x;t)` | Probabilidad genérica relacionada con el derecho a beneficio |
| `p(x_j,t)` | Probabilidad de supervivencia de un **activo** de edad x_j por un plazo de t meses |
| `p^i(x_j,t)` | Probabilidad de supervivencia de un **inválido** de edad x_j por un plazo de t meses |
| `p^p(x_j,t)` | Probabilidad de que un hijo con derecho a beneficio, activo de edad x_j, menor de 18 años, se invalide antes de cumplir los 18 años y sobreviva como inválido desde ese momento hasta x_j + t |
| `p^ai(x,1)` | Probabilidad de invalidarse dentro de un año y sobrevivir como inválido hasta el final del mismo para la edad x |

### I) Funciones de Sobrevivientes (Tablas de Mortalidad)

| Variable | Significado |
|----------|-------------|
| `l(x)` | Sobrevivientes a la edad x, en **años**, según la Tabla de Mortalidad GAM 1983 |
| `l^i(x)` | Sobrevivientes inválidos a la edad x, en **años**, según la Tabla de Mortalidad de Inválidos MI 85 |
| `l(x_j)` | Sobrevivientes a la edad x_j en **meses** (se obtiene por interpolación) |
| `l^i(x_j)` | Sobrevivientes inválidos a la edad x_j en **meses** (se obtiene por interpolación) |

### J) Funciones Matemáticas

| Variable | Significado |
|----------|-------------|
| `ENT(a)` | Parte entera de "a" (equivale a FLOOR en programación) |

### K) Proporciones de Beneficio por Tipo de Prestación

| Variable | Significado |
|----------|-------------|
| `B^M(i)` | Proporción del beneficio correspondiente a la i-ésima configuración para el caso de **pensión por fallecimiento** |
| `B^I(i)` | Proporción del beneficio correspondiente a la i-ésima configuración para el caso de **retiro definitivo de invalidez** |
| `B^J(i)` | Proporción del beneficio correspondiente a la i-ésima configuración para el caso de **jubilación ordinaria** |

### L) Porcentajes de Beneficio para Derechohabientes

<!-- 
beta = porcentaje para cónyuge/conviviente
delta = porcentaje para hijos
Los valores dependen de si hay o no otros beneficiarios
-->

| Variable | Significado |
|----------|-------------|
| `beta` | Porcentaje de beneficio correspondiente al **cónyuge o conviviente** |
| | beta = 0,70 si h = 0 (no hay hijos con derecho) |
| | beta = 0,35 si h > 0 (hay hijos con derecho) |
| `delta` | Porcentaje de beneficio correspondiente al o los **hijos** |
| | delta = 0,35 si m > 0 (hay cónyuge/conviviente) |
| | delta = 0,70 si m = 0 (no hay cónyuge/conviviente) |

### M) Variables Dicotómicas (0 ó 1)

<!-- 
alpha y gamma son variables que actúan como "switches" en las fórmulas
para determinar qué probabilidad aplicar según la configuración
-->

| Variable | Significado |
|----------|-------------|
| `alpha_j,i` | Variable dicotómica (0 ó 1) que determina cuál de las probabilidades (p_G(x;t) o (1-p_G(x;t)) respectivamente) se computa a efectos del cálculo para la **j-ésima persona** y para la **i-ésima configuración** |
| `gamma(j,t)` | Variable dicotómica (0 ó 1) que determina cuál de las probabilidades (p(x;t), p^i(x;t), p^p(x,t)) se computa a efectos del cálculo para el **j-ésimo integrante** en el **momento t** |

### N) Nota Importante

Las edades se computarán desde la **fecha de devengamiento** correspondiente y deberán ser expresadas en **meses enteros cumplidos**, de acuerdo con el punto VII de la presente Nota Técnica.

## Ejemplo Práctico

**Situación:** Afiliado jubilado con cónyuge y 2 hijos menores

| Variable | Valor | Explicación |
|----------|-------|-------------|
| `n` | 4 | 4 personas con derecho (titular + cónyuge + 2 hijos) |
| `m` | 1 | 1 cónyuge |
| `h` | 2 | 2 hijos |
| Configuraciones | 2^4 = 16 | 16 combinaciones posibles de quién cobra |
| `x_j` del titular | 780 | 65 años * 12 meses |
| `x_j` del hijo menor | 120 | 10 años * 12 meses |
| `x_min` | 120 | El menor tiene 10 años (120 meses) |

**Situación:** Pensión por fallecimiento - Cónyuge y 2 hijos menores

| Variable | Valor | Explicación |
|----------|-------|-------------|
| `m` | 1 | 1 cónyuge |
| `h` | 2 | 2 hijos |
| `beta` | 0,35 | Porque h > 0 (hay hijos) |
| `delta` | 0,35 | Porque m > 0 (hay cónyuge) |
| **Total** | 0,35 + 0,35 = 0,70 | El 70% se reparte entre cónyuge e hijos |

**Situación:** Pensión por fallecimiento - Solo cónyuge (sin hijos)

| Variable | Valor | Explicación |
|----------|-------|-------------|
| `m` | 1 | 1 cónyuge |
| `h` | 0 | 0 hijos |
| `beta` | 0,70 | Porque h = 0 (no hay hijos) |
| **Total** | 0,70 | El cónyuge recibe 70% |

---

# SECCIÓN IV: Asignación de Edades

<!-- 
Define cómo se numera (asigna el índice j) a cada persona del grupo familiar.
El orden varía según el tipo de beneficio (jubilación vs pensión).
-->

## Qué Es

Es la regla que define cómo se **numera** (asigna el índice `j`) a cada persona del grupo familiar según el tipo de beneficio. El orden importa porque las fórmulas usan `j` para identificar a cada integrante.

## Para Qué Sirve

- **Ordenar** sistemáticamente a los beneficiarios para el cálculo
- **Diferenciar** el tratamiento según sea jubilación/invalidez o pensión
- **Programar** correctamente los bucles en el sistema de cálculo

**Caso de uso real:** En una pensión por fallecimiento, primero se listan los cónyuges (j=1 a m) y luego los hijos (j=m+1 en adelante). En una jubilación, el causante siempre es j=1.

## Contenido

### A) Pensión por Fallecimiento

En este caso **NO hay causante vivo**, solo derechohabientes:

| Índice j | Integrante |
|----------|------------|
| 1 a m | Cónyuges/Convivientes |
| (m+1) a (m+h) = n | Hijos |

**Ejemplo:** 1 cónyuge y 2 hijos (m=1, h=2, n=3)

| j | Integrante |
|---|------------|
| 1 | Cónyuge |
| 2 | Hijo 1 |
| 3 | Hijo 2 |

### B) Jubilación Ordinaria y Jubilación por Invalidez

En este caso **SÍ hay causante vivo** (el afiliado), más sus derechohabientes:

| Índice j | Integrante |
|----------|------------|
| 1 | **Causante** (el afiliado) |
| 2 a (m+1) | Cónyuges/Convivientes |
| (m+2) a (m+h+1) = n | Hijos |

**Ejemplo:** Afiliado con 1 cónyuge y 2 hijos (m=1, h=2, n=4)

| j | Integrante |
|---|------------|
| 1 | Causante (afiliado) |
| 2 | Cónyuge |
| 3 | Hijo 1 |
| 4 | Hijo 2 |

## Comparación Visual

| Situación | Pensión Fallecimiento | Jubilación Ordinaria/Invalidez |
|-----------|----------------------|-------------------------------|
| Causante | NO existe (falleció) | j = 1 |
| Cónyuges | j = 1 a m | j = 2 a (m+1) |
| Hijos | j = (m+1) a n | j = (m+2) a n |
| Total n | m + h | 1 + m + h |

## Ejemplo Práctico Completo

**Familia:** Afiliado (65 años), Cónyuge (60 años), Hijo1 (25 años), Hijo2 (17 años)

**Si se jubila (Jubilación Ordinaria):**

| j | Quién | Edad (x_j) en meses |
|---|-------|-------------------|
| 1 | Afiliado | 780 |
| 2 | Cónyuge | 720 |
| 3 | Hijo1 | 300 |
| 4 | Hijo2 | 204 |

n = 4, m = 1, h = 2

**Si fallece en actividad (Pensión por Fallecimiento):**

| j | Quién | Edad (x_j) en meses |
|---|-------|-------------------|
| 1 | Cónyuge | 720 |
| 2 | Hijo1 | 300 |
| 3 | Hijo2 | 204 |

n = 3, m = 1, h = 2

---

# SECCIÓN V: Factor Único Unitario (FUU)

<!-- 
El FUU es el corazón matemático del sistema.
Representa el valor actual actuarial de todos los pagos futuros.
-->

## Qué Es

El Factor Único Unitario (FUU) se utilizará para el cálculo de los correspondientes **Beneficios Previsionales**.

El FUU correspondiente a la edad alcanzada y sexo, tanto del asegurado como de sus derechohabientes declarados en la póliza, será el **valor actual actuarial de los posibles pagos** a los que tenga derecho el causante y/o el grupo de derechohabientes.

## Para Qué Sirve

- **Calcular el beneficio mensual:** Beneficio = Saldo Acumulado / FUU
- **Determinar la reserva necesaria:** Reserva = Beneficio * FUU
- **Distribuir el beneficio:** Entre causante, cónyuge e hijos según corresponda

## Contenido

### Fórmula del FUU

```
FUU = SUMA(t) { v^t * SUMA(i) { B(i) * P(i,t) } }
```

Donde:
- `SUMA(t)` = Sumatoria sobre todos los meses futuros
- `SUMA(i)` = Sumatoria sobre todas las configuraciones posibles
- `v^t` = Factor de descuento financiero elevado a t
- `B(i)` = Proporción del beneficio según configuración
- `P(i,t)` = Probabilidad asociada al beneficio

### Valores de B(i) - Proporción del Beneficio

**B(i) = 1** en los casos de:
- Afiliado con jubilación ordinaria
- Afiliado con retiro por invalidez
- Más de dos hijos con derecho a beneficio

**B(i) = 0,7** en los casos de:
- Hijos con derecho a beneficio
- Cónyuge y/o conviviente con derecho a beneficio
- Cónyuge y/o conviviente con un hijo con derecho a beneficio

### El Beneficio Previsional Inicial

```
P(0) = (CIAO(t) + CIAV(t)) / FUU(q)
```

Donde:
- `P(0)` = Beneficio Previsional Inicial
- `CIAO(t)` = Saldo de aportes obligatorios
- `CIAV(t)` = Saldo de aportes voluntarios
- `FUU(q)` = Factor Único Unitario

### Distribución del Beneficio entre los Integrantes

| Beneficiario | Fórmula | Explicación |
|--------------|---------|-------------|
| **Causante** | P(0) | Recibe el beneficio completo |
| **Cada hijo** | (delta / n) * P(0) | delta dividido cantidad de personas * beneficio |
| **Cada cónyuge/conviviente** | (beta / m) * P(0) | beta dividido cantidad de cónyuges * beneficio |

Recordar:
- `beta` = 0,70 si no hay hijos; 0,35 si hay hijos
- `delta` = 0,70 si no hay cónyuge; 0,35 si hay cónyuge
- `n` = cantidad total de personas con derecho
- `m` = cantidad de cónyuges/convivientes

## Ejemplo Práctico

**Situación:** Jubilación ordinaria con cónyuge y 2 hijos menores

| Dato | Valor |
|------|-------|
| Saldo CIAO + CIAV | $10.000.000 |
| FUU calculado | 150 |
| P(0) | $10.000.000 / 150 = **$66.667** |

**Mientras el causante vive:** Recibe $66.667/mes

**Si el causante fallece (pasa a pensión):**
- m = 1 (cónyuge), h = 2 (hijos), n = 3
- beta = 0,35 (porque hay hijos)
- delta = 0,35 (porque hay cónyuge)

| Beneficiario | Cálculo | Monto |
|--------------|---------|-------|
| Cónyuge | (0,35 / 1) * $66.667 | $23.333 |
| Cada hijo | (0,35 / 3) * $66.667 | $7.778 |
| **Total** | | $38.889 (aproximadamente 70% del original) |

---

# SECCIÓN VI: Determinación del FUU (por tipo de beneficio)

<!-- 
Detalla las fórmulas específicas del FUU para cada tipo de prestación.
Las condiciones y proporciones varían según el tipo de beneficio.
-->

## Qué Es

Esta sección detalla cómo se calcula el FUU específicamente para cada tipo de prestación. Aunque la fórmula base es la misma, las **condiciones**, **configuraciones** y **probabilidades** varían según sea:

- a) Jubilación Ordinaria
- b) Jubilación por Invalidez
- c) Pensión por Fallecimiento

## Para Qué Sirve

- **Aplicar la fórmula correcta** según el tipo de beneficio
- **Determinar qué proporción B(i)** corresponde a cada configuración familiar
- **Saber qué probabilidades usar** (activo, inválido, o especial para hijos)

## Contenido

### Fórmula Completa Expandida (aplica a los 3 tipos)

```
FUU(q) = SUMA(t=1 hasta n*12-x_min) {
           SUMA(i=0 hasta 2^n-1) {
             B(i) * PRODUCTO(j=1 hasta n) {
               gamma1(j,t) * [alpha_j,i * p(x_j,t) + (1-alpha_j,i) * (1-p(x_j,t))] +
               gamma2(j) * [alpha_j,i * p^i(x_j,t) + (1-alpha_j,i) * (1-p^i(x_j,t))] +
               gamma3(j,t) * [alpha_j,i * p^p(x_j,t) + (1-alpha_j,i) * (1-p^p(x_j,t))]
             }
           }
         }
```

### Fórmulas de Cálculo de alpha y g

<!-- 
alpha determina si la persona está viva (1) o fallecida (0) en cada configuración
Las funciones g cuentan cuántos de cada tipo están vivos en cada configuración
-->

**Cálculo de alpha_j,i:**
```
alpha_j,i = ((-1)^ENT(i / 2^(j-1)) - 1) / (-2)
```

**Cálculo de gca(i):**
```
gca(i) = alpha_1,i = ((-1)^ENT(i/1) - 1) / (-2)
```

**Cálculo de gco(i):** (siempre que m > 0)
```
gco(i) = SUMA(k=2 hasta m+1) { alpha_k,i }
```

**Cálculo de gh(i):** (siempre que h > 0)
```
gh(i) = SUMA(k=m+2 hasta m+h+1) { alpha_k,i }
```

---

## A) Jubilación Ordinaria

### Tabla de B^J(i)

| Condición | Descripción | B^J(i) |
|-----------|-------------|--------|
| gca(i) = 1 | El causante sobrevive independientemente de la permanencia con derecho de los demás integrantes | **1** |
| gca(i) = 0, gco(i) = 0, gh(i) = 0 | Ningún integrante del grupo permanece con derecho | **0** |
| gca(i) = 0, gco(i) = 0, gh(i) = 1 | Ni el causante, ni los cónyuges/convivientes sobreviven, pero permanece con derecho un hijo | **0,7** |
| gca(i) = 0, gco(i) > 0, gh(i) = 0 | Ni el causante ni los hijos permanecen con derecho, pero sobrevive al menos un cónyuge y/o conviviente | **0,7** |
| gca(i) = 0, gco(i) > 0, gh(i) = 1 | El causante no sobrevive, pero sobreviven los cónyuges/convivientes y permanece con derecho un hijo | **0,7** |
| gca(i) = 0, gco(i) > 0, gh(i) > 2 | El causante no sobrevive, pero sobreviven los cónyuges/convivientes y permanecen con derecho más de dos hijos | **1** |

### Variables gamma para Jubilación Ordinaria

| Variable | Valor = 1 cuando... |
|----------|---------------------|
| gamma1(j,t) | Para el causante y los cónyuges/convivientes (j <= m+1) y para los hijos (j > m+1) cuando se encuentren en estado **activo** al inicio y siempre que el momento de valuación se corresponda con una edad **menor o igual a 21 años** (t <= 21*12 - x_j). 0 en cualquier otro caso. |
| gamma2(j) | Para los hijos (j > m+1) cuando se encuentren **inválidos** al inicio. 0 en cualquier otro caso. |
| gamma3(j,t) | Para los hijos (j > m+1) cuando se encuentren **activos** al inicio y siempre que el momento de valuación se corresponda con una edad **superior a 21 años** (t > 21*12 - x_j). 0 en cualquier otro caso. |

---

## B) Jubilación por Invalidez

### Tabla de B^I(i)

| Condición | Descripción | B^I(i) |
|-----------|-------------|--------|
| gca(i) = 1 | El causante sobrevive independientemente de la permanencia con derecho de los demás integrantes | **1** |
| gca(i) = 0, gco(i) = 0, gh(i) = 0 | Ningún integrante del grupo permanece con derecho | **0** |
| gca(i) = 0, gco(i) = 0, gh(i) >= 1 | Ni el causante, ni los cónyuges/convivientes sobreviven, pero permanece con derecho **al menos un hijo** | **0,7** |
| gca(i) = 0, gco(i) > 0, gh(i) = 0 | Ni el causante ni los hijos permanecen con derecho, pero sobrevive al menos un cónyuge y/o conviviente | **0,7** |
| gca(i) = 0, gco(i) > 0, gh(i) >= 1 | El causante no sobrevive, pero sobreviven los cónyuges/convivientes y permanece con derecho **al menos un hijo** | **0,7** |

**Nota:** A diferencia de Jubilación Ordinaria, aquí NO hay caso de B^I(i) = 1 cuando hay muchos hijos. Máximo es 0,7 sin causante.

### Variables gamma para Jubilación por Invalidez

| Variable | Valor = 1 cuando... |
|----------|---------------------|
| gamma1(j,t) | Para los cónyuges/convivientes (j <= m+1) y para los hijos (j > m+1) cuando se encuentren en estado **activo** al inicio y siempre que el momento de valuación se corresponda con una edad **menor o igual a 21 años de edad** (t <= 21*12 - x_j). 0 en cualquier otro caso. |
| gamma2(j) | Para el **causante (j = 1)** y los hijos (j > m+1) cuando se encuentren **inválidos** al inicio. 0 en cualquier otro caso. |
| gamma3(j,t) | Para los hijos (j > m+1) cuando se encuentren **activos** al inicio y siempre que el momento de valuación se corresponda con una edad **superior a los 18 años** (t > 21*12 - x_j). 0 en cualquier otro caso. |

**Diferencias clave con Jubilación Ordinaria:**
- gamma1 NO incluye al causante (porque es inválido, usa gamma2)
- gamma2 SÍ incluye al causante (j=1)
- gamma3 menciona 18 años (no 21) en el texto

---

## C) Pensión por Fallecimiento

### Tabla de B^M(i)

| Condición | Descripción | B^M(i) |
|-----------|-------------|--------|
| gco(i) = 0, gh(i) = 0 | Ningún integrante del grupo permanece con derecho | **0** |
| gco(i) = 0, gh(i) = 1 | Los cónyuges/convivientes no sobreviven, pero permanece con derecho un hijo | **0,7** |
| gco(i) = 0, gh(i) = 2 | Los cónyuges/convivientes no sobreviven, pero permanecen con derecho dos hijos | **0,7** |
| gco(i) = 0, gh(i) > 2 | Los cónyuges/convivientes no sobreviven, pero permanecen con derecho más de dos hijos | **0,7** |
| gco(i) > 0, gh(i) = 0 | Los hijos no permanecen con derecho, pero sobrevive al menos un cónyuge y/o conviviente | **0,7** |
| gco(i) > 0, gh(i) = 1 | Los cónyuges/convivientes sobreviven y un hijo permanece con derecho | **0,7** |
| gco(i) > 0, gh(i) = 2 | Los cónyuges/convivientes sobreviven y dos hijos permanecen con derecho | **0,7** |
| gco(i) > 0, gh(i) > 2 | Los cónyuges/convivientes sobreviven y más de dos hijos permanecen con derecho | **0,7** |

**Nota importante:** En Pensión por Fallecimiento **TODOS los casos dan 0 ó 0,7**. No existe 0,9 ni 1.

### Variables gamma para Pensión por Fallecimiento

| Variable | Valor = 1 cuando... |
|----------|---------------------|
| gamma1(j,t) | Para los cónyuges/convivientes (j <= m) y para los hijos (j > m) cuando se encuentren en estado **activo** al inicio y siempre que el momento de valuación se corresponda con una edad **menor o igual a 21 años** (t <= 21*12 - x_j). 0 en cualquier otro caso. |
| gamma2(j) | Para los hijos (j > m) cuando se encuentren **inválidos** al inicio. 0 en cualquier otro caso. |
| gamma3(j,t) | Para los hijos (j > m) cuando se encuentren **activos** al inicio y siempre que el momento de valuación se corresponda con una edad **superior a 21 años** (t > 21*12 - x_j). 0 en cualquier otro caso. |

**Diferencia clave:** En Pensión los índices son j <= m (no m+1) porque no hay causante.

## Resumen de Diferencias

| Aspecto | Jub. Ordinaria | Jub. Invalidez | Pensión Fallec. |
|---------|----------------|----------------|-----------------|
| ¿Hay causante? | Sí (j=1, activo) | Sí (j=1, inválido) | No |
| Índice cónyuges | j = 2 a (m+1) | j = 2 a (m+1) | j = 1 a m |
| Índice hijos | j = (m+2) a n | j = (m+2) a n | j = (m+1) a n |
| gamma1 incluye causante | Sí | No | N/A |
| gamma2 incluye causante | No | Sí | N/A |
| B(i) máximo sin causante | 1 (si h>2) | 0,7 | 0,7 |
| Valores posibles B(i) | 0, 0.7, 1 | 0, 0.7, 1 | 0, 0.7 |

---

# SECCIÓN VII: Cálculo de Edad en Meses

<!-- 
Rutina oficial para calcular la edad exacta en meses enteros cumplidos.
El sistema trabaja en meses para mayor precisión actuarial.
-->

## Qué Es

Es la **rutina oficial** para calcular la edad exacta de cualquier persona expresada en meses enteros cumplidos. El sistema CEER trabaja con edades en meses (no años) para mayor precisión actuarial.

## Para Qué Sirve

- **Precisión:** Una persona de "65 años" puede tener entre 780 y 791 meses; la diferencia importa
- **Consistencia:** Todos los cálculos usan el mismo método
- **Interpolación:** Las tablas mensuales requieren edad exacta en meses

**Caso de uso real:** Si alguien nació el 15/03/1960 y se jubila el 10/05/2025, su edad NO es simplemente 65 años * 12 = 780 meses. Hay que calcularlo con precisión.

## Contenido

### Procedimiento Paso a Paso

**PASO 1:** Calcular la diferencia en años (DIFANIO)
```
DIFANIO = Anio_inicio_vigencia - Anio_nacimiento
```

**PASO 2:** Calcular la diferencia en meses (DIFMES)
```
DIFMES = Mes_inicio_vigencia - Mes_nacimiento
```

**PASO 3:** Calcular la diferencia en días (DIFDIA)
```
DIFDIA = Dia_inicio_vigencia - Dia_nacimiento
```

**PASO 4:** Ajustar si DIFDIA < 0
```
SI DIFDIA < 0 ENTONCES
    DIFMES = DIFMES - 1
FIN SI
```

**PASO 5:** Ajustar si DIFMES < 0
```
SI DIFMES < 0 ENTONCES
    DIFMES = DIFMES + 12
    DIFANIO = DIFANIO - 1
FIN SI
```

**PASO 6:** Calcular la edad en meses
```
x_j = DIFANIO * 12 + DIFMES
```

## Ejemplo Práctico 1

**Datos:**
- Fecha de nacimiento: **19/05/1966**
- Fecha de cálculo: **12/02/2026**

| Paso | Cálculo | Resultado |
|------|---------|-----------|
| 1 | DIFANIO = 2026 - 1966 | 60 |
| 2 | DIFMES = 2 - 5 | -3 |
| 3 | DIFDIA = 12 - 19 | -7 |
| 4 | DIFDIA < 0 -> DIFMES = -3 - 1 | -4 |
| 5 | DIFMES < 0 -> DIFMES = -4 + 12; DIFANIO = 60 - 1 | DIFMES = 8, DIFANIO = 59 |
| 6 | x_j = 59 * 12 + 8 | **716 meses** |

**Verificación:** 716 / 12 = 59,67 años (correcto)

## Ejemplo Práctico 2

**Datos:**
- Fecha de nacimiento: **25/08/1990**
- Fecha de cálculo: **30/08/2025**

| Paso | Cálculo | Resultado |
|------|---------|-----------|
| 1 | DIFANIO = 2025 - 1990 | 35 |
| 2 | DIFMES = 8 - 8 | 0 |
| 3 | DIFDIA = 30 - 25 | 5 |
| 4 | DIFDIA >= 0 -> no ajusta | DIFMES = 0 |
| 5 | DIFMES >= 0 -> no ajusta | DIFANIO = 35 |
| 6 | x_j = 35 * 12 + 0 | **420 meses** |

**Verificación:** 420 / 12 = 35,00 años (cumplió años hace 5 días - correcto)

## Implementación en Pseudocódigo

```
FUNCION calcularEdadMeses(fecha_nacimiento, fecha_calculo)
    
    // Paso 1
    DIFANIO = fecha_calculo.anio - fecha_nacimiento.anio
    
    // Paso 2
    DIFMES = fecha_calculo.mes - fecha_nacimiento.mes
    
    // Paso 3
    DIFDIA = fecha_calculo.dia - fecha_nacimiento.dia
    
    // Paso 4
    SI DIFDIA < 0 ENTONCES
        DIFMES = DIFMES - 1
    FIN SI
    
    // Paso 5
    SI DIFMES < 0 ENTONCES
        DIFMES = DIFMES + 12
        DIFANIO = DIFANIO - 1
    FIN SI
    
    // Paso 6
    RETORNAR DIFANIO * 12 + DIFMES
    
FIN FUNCION
```

## Nota Importante

Las edades se computarán desde la **fecha de devengamiento** correspondiente y deberán ser expresadas en **meses enteros cumplidos**.

Esto significa que siempre se redondea hacia abajo (se toman meses completos, no fracciones).

---

# SECCIÓN VIII: Cálculo de Probabilidades

<!-- 
Fórmulas para calcular probabilidades de supervivencia usando interpolación lineal.
Las tablas vienen en años, pero el sistema trabaja en meses.
-->

## Qué Es

Las fórmulas oficiales para calcular las probabilidades de supervivencia que se usan en el FUU. Como las tablas de mortalidad vienen en **años** pero el sistema trabaja en **meses**, se requiere **interpolación lineal**.

## Para Qué Sirve

- **Obtener p(x_j;t):** Probabilidad de que un activo de edad x_j meses sobreviva t meses más
- **Obtener p^i(x_j;t):** Probabilidad de que un inválido de edad x_j meses sobreviva t meses más
- **Obtener p^p(x_j;t):** Probabilidad especial para hijos que pueden invalidarse antes de los 21

## Contenido

---

## 1) Probabilidad de Supervivencia de Activos

### Fórmula Principal

```
p(x_j; t) = l(x_j + t) / l(x_j)
```

### Interpolación Lineal para l(x_j) y l(x_j + t)

```
l(x_j + t) = (1 - f) * l(ENT((x_j + t) / 12)) + f * l(ENT((x_j + t) / 12) + 1)
```

```
l(x_j) = (1 - f) * l(ENT(x_j / 12)) + f * l(ENT(x_j / 12) + 1)
```

### Cálculo de f (fracción)

```
f = (x_j + t) / 12 - ENT((x_j + t) / 12)
```

Donde **f** es la fracción que excede el año entero.

### Función de Sobrevivientes l(x)

`l(ENT((x_j+t)/12))` es la función de cantidad de sobrevivientes a una edad entera expresada en **años**, que se calcula de la siguiente manera:

```
l(x + 1) = l(x) * (1 - q(x))
```

Donde:
- **q(x)** se obtiene de la Tabla de Mortalidad (GAM 1983)
- **l(0) = 1**

---

## 2) Probabilidad de Supervivencia de Inválidos

### Fórmula Principal

```
p^i(x_j; t) = l^i(x_j + t) / l^i(x_j)
```

### Interpolación Lineal para l^i(x_j) y l^i(x_j + t)

```
l^i(x_j + t) = (1 - f) * l^i(ENT((x_j + t) / 12)) + f * l^i(ENT((x_j + t) / 12) + 1)
```

```
l^i(x_j) = (1 - f) * l^i(ENT(x_j / 12)) + f * l^i(ENT(x_j / 12) + 1)
```

### Cálculo de f (fracción)

```
f = (x_j + t) / 12 - ENT((x_j + t) / 12)
```

Donde **f** es la fracción que excede el año entero.

### Función de Sobrevivientes Inválidos l^i(x)

`l^i(ENT((x_j+t)/12))` es la función de cantidad de sobrevivientes **inválidos** a una edad entera expresada en **años**, que se calcula de la siguiente manera:

```
l^i(x + 1) = l^i(x) * (1 - q^i(x))
```

Donde:
- **q^i(x)** se obtiene de la Tabla de Mortalidad de Inválidos (MI 85)
- **l^i(0) = 0**

---

## 3) Probabilidad de Invalidez Futura (para hijos activos)

<!-- 
Esta probabilidad especial aplica para hijos activos menores de 21 años
que podrían invalidarse y luego sobrevivir como inválidos.
-->

### Fórmula Anual

```
p^p(x, y) = SUMA(s=0 hasta 21-x-1) { p(x; s) * p^ai(x + s; 1) * p^i(x + s + 1; y - s - 1) }
```

**Condición:** tal que **y > (21 - x)**

### Fórmula Mensual

```
p^p(x_j; t) = (0.000572 / 12) * SUMA(s_j=0 hasta 21*12-x_j-1) { p(x_j; s_j) * p^i(x_j + s_j + 1; t - s_j - 1) }
```

**Condición:** tal que **t > (21*12 - x_j)**

## Resumen de las 3 Probabilidades

| Probabilidad | Usa Tabla | Condición Inicial | Fórmula Base |
|--------------|-----------|-------------------|--------------|
| p(x_j;t) | GAM 1983 | Activo | l(x_j+t) / l(x_j) |
| p^i(x_j;t) | MI 85 | Inválido | l^i(x_j+t) / l^i(x_j) |
| p^p(x_j;t) | Ambas | Activo < 21 años | Sumatoria con factor 0.000572/12 |

## Ejemplo Práctico

**Calcular p(780; 12)** = Probabilidad de que alguien de 65 años (780 meses) sobreviva 1 año más (12 meses)

| Paso | Cálculo | Resultado |
|------|---------|-----------|
| x_j + t | 780 + 12 = 792 meses | 66 años |
| ENT(792/12) | 66 | Edad entera |
| f | 792/12 - 66 = 0 | Sin fracción |
| l(792) | (1-0) * l(66) + 0 * l(67) = l(66) | aprox. 0.8234 |
| l(780) | l(65) | aprox. 0.8522 |
| p(780;12) | 0.8234 / 0.8522 | **aprox. 0.9662** |

**Interpretación:** Un hombre de 65 años tiene 96,62% de probabilidad de llegar a los 66.

---

# SECCIÓN IX: Haberes Mínimos

<!-- 
Define el mecanismo para garantizar un haber mínimo (VAR).
El FOCIM aporta la diferencia cuando el saldo no alcanza.
-->

## Qué Es

Establece el mecanismo para garantizar un **haber mínimo** (VAR) en los casos de Pensión por Muerte en Actividad y Jubilación por Invalidez. Cuando el saldo del afiliado no alcanza para cubrir el mínimo, el **FOCIM** (Fondo de Contingencia para Invalidez y Muerte) aporta la diferencia.

## Para Qué Sirve

- **Garantizar un piso mínimo** de beneficio en casos de siniestro (muerte o invalidez)
- **Proteger a afiliados jóvenes** que no tuvieron tiempo de acumular saldo suficiente
- **Determinar cuánto aporta el FOCIM** para completar el haber mínimo

## Contenido

---

## Pensión por Muerte en Actividad

### Verificación

```
SI (CIAO / FUU) >= VAR ENTONCES
    // El beneficio se calcula normalmente
    Beneficio = CIAO / FUU
SI NO
    // Se calcula la contribución del FOCIM
    Contr_FOCIM = VAR * FUU - CIAO
    
    // Por lo tanto, el beneficio queda:
    Beneficio = (CIAO + Contr_FOCIM) / FUU
    Beneficio = VAR
FIN SI
```

---

## Jubilación por Invalidez

### Verificación

```
SI (CIAO / FUU) >= VAR ENTONCES
    // El beneficio se calcula normalmente
    Beneficio = CIAO / FUU
SI NO
    // Se calcula la contribución del FOCIM
    Contr_FOCIM = VAR * FUU - CIAO
    
    // Por lo tanto, el beneficio queda:
    Beneficio = (CIAO + Contr_FOCIM) / FUU
    Beneficio = VAR
FIN SI
```

## Ejemplo Práctico

**Situación:** Afiliado joven fallece en actividad

| Dato | Valor |
|------|-------|
| CIAO (saldo acumulado) | $2.000.000 |
| FUU | 150 |
| VAR (haber mínimo) | $50.000 |

**Paso 1: Verificar**
```
CIAO / FUU = $2.000.000 / 150 = $13.333
$13.333 < $50.000 (VAR)  ->  NO cumple
```

**Paso 2: Calcular contribución FOCIM**
```
Contr_FOCIM = VAR * FUU - CIAO
Contr_FOCIM = $50.000 * 150 - $2.000.000
Contr_FOCIM = $7.500.000 - $2.000.000 = $5.500.000
```

**Paso 3: Beneficio final**
```
Beneficio = (CIAO + Contr_FOCIM) / FUU
Beneficio = ($2.000.000 + $5.500.000) / 150 = $50.000 = VAR (correcto)
```

## Resumen

| Caso | Condición | Beneficio |
|------|-----------|-----------|
| CIAO/FUU >= VAR | Saldo suficiente | CIAO / FUU |
| CIAO/FUU < VAR | Saldo insuficiente | VAR (FOCIM completa) |

---

# SECCIÓN X: Rendimiento de los Activos Computables

<!-- 
Define qué son los Activos Computables y cómo se mide su rendimiento.
-->

## Qué Es

Define qué son los Activos Computables (AC) y cómo se determina su rendimiento.

## Para Qué Sirve

- **Identificar los fondos invertidos** del sistema
- **Medir la rentabilidad** obtenida por esas inversiones
- **Base para calcular** el rendimiento a transferir a los afiliados

## Contenido

### Definición de Activos Computables (AC)

Se denominan **Activos Computables (AC)** a todos aquellos que se encuentran invertidos por el SISTEMA a los efectos de hacer frente a los compromisos con los afiliados, tanto en actividad como en pasividad.

### Determinación del Rendimiento

Con la periodicidad y método que se establezcan, se determinará la tasa de rendimiento obtenida por la inversión de los AC, expresada en tanto por uno **(R)**.

## Resumen

| Concepto | Descripción |
|----------|-------------|
| **AC** | Activos Computables = Todo lo invertido para cubrir compromisos |
| **R** | Tasa de rendimiento de los AC (en tanto por uno) |
| **Alcance** | Afiliados activos + pasivos |

---

# SECCIÓN XI: Rendimiento a Transferir a las Cuentas que Reflejan los Compromisos con los Afiliados

<!-- 
Define la fórmula para calcular qué parte del rendimiento se transfiere 
a las cuentas de los afiliados. Garantiza al menos la tasa de referencia.
-->

## Qué Es

Define cómo se calcula y transfiere la rentabilidad obtenida sobre los Activos Computables (AC) a las cuentas que reflejan los compromisos con los afiliados.

## Para Qué Sirve

- **Distribuir proporcionalmente** el rendimiento de las inversiones
- **Garantizar la tasa mínima** de referencia (4% anual)
- **Proteger a los afiliados** cuando el rendimiento real es menor al esperado

## Contenido

### Fórmula de Cálculo

La rentabilidad obtenida sobre (AC), se transfiere, a las cuentas que reflejan los compromisos con los afiliados:

```
r_prima(t) = (R(t) * AC(t-1)) / (SUMA_CIAO(t-1) + SUMA_CIAV(t-1) + SUMA_CPP(t-1) + FOCIM(t-1) + FSRS(t-1))
```

### Condición de Aplicación

```
SI r_prima(t) >= rr(t) ENTONCES
    // Se aplica el rendimiento calculado
    tasa_aplicar = r_prima(t)
SI NO
    // Se aplica la tasa de referencia
    tasa_aplicar = rr(t)
FIN SI
```

### Definición de Variables

| Variable | Significado |
|----------|-------------|
| `r_prima(t)` | Tasa de rendimiento resultante de la aplicación del cálculo correspondiente |
| `R(t)` | Tasa de rendimiento de los AC en (t) |
| `AC(t-1)` | Activos Computables en (t-1) |
| `rr(t)` | Tasa de referencia equivalente (4% anual) |
| `SUMA_CIAO(t-1)` | Sumatoria de Cuentas Individuales de Aportes Obligatorios en (t-1) |
| `SUMA_CIAV(t-1)` | Sumatoria de Cuentas Individuales de Aportes Voluntarios en (t-1) |
| `SUMA_CPP(t-1)` | Sumatoria de Cuentas de Pago de Prestaciones en (t-1) |
| `FOCIM(t-1)` | Fondo de Contingencia para Invalidez y Muerte en (t-1) |
| `FSRS(t-1)` | Fondo de Seguro de Renta Solidaria en (t-1) |

## Ejemplo Práctico

**Situación:** Cálculo del rendimiento a transferir

| Dato | Valor |
|------|-------|
| R(t) - Rendimiento de AC | 5% |
| AC(t-1) | $100.000.000 |
| SUMA_CIAO(t-1) | $60.000.000 |
| SUMA_CIAV(t-1) | $10.000.000 |
| SUMA_CPP(t-1) | $20.000.000 |
| FOCIM(t-1) | $5.000.000 |
| FSRS(t-1) | $5.000.000 |
| rr(t) - Tasa referencia | 4% |

**Cálculo:**
```
r_prima(t) = (0.05 * $100.000.000) / ($60M + $10M + $20M + $5M + $5M)
r_prima(t) = $5.000.000 / $100.000.000
r_prima(t) = 5%
```

**Verificación:**
```
r_prima(t) = 5% >= rr(t) = 4%  ->  Se aplica 5% (correcto)
```

## Caso Cuando Rendimiento es Menor

**Si R(t) fuera 3%:**
```
r_prima(t) = 3%
r_prima(t) = 3% < rr(t) = 4%  ->  Se aplica rr(t) = 4%
```

**Interpretación:** El sistema garantiza al menos la tasa de referencia del 4%.

---

# SECCIÓN XII: Cuentas de Pagos de Prestaciones

<!-- 
Define cómo se calcula la reserva matemática para cada pasivo.
CPP = Beneficio mensual * FUU
-->

## Qué Es

Define cómo se calcula la reserva matemática necesaria para hacer frente a los pagos futuros de un beneficiario que ya está cobrando su jubilación o pensión.

## Para Qué Sirve

- **Reservar el dinero necesario** para pagar todas las cuotas futuras del beneficio
- **Actualizar la reserva** mes a mes según la edad alcanzada
- **Contabilizar el pasivo** del sistema con cada pasivo

## Contenido

### Fórmula

```
CPP(t) = P(t) * FUU(x + t)
```

### Definición de Variables

| Variable | Significado |
|----------|-------------|
| `CPP(t)` | Cuentas de Pagos de Prestaciones en "t" |
| `P(t)` | Importe de la Prestación devengada en el momento "t" |
| `FUU(x+t)` | Factor Único Unitario correspondiente a la edad alcanzada "x+t", sexo, derechohabientes y estado de capacidad del afiliado o de sus derechohabientes, según corresponda, al momento "t" |

## Ejemplo Práctico

**Situación:** Jubilado de 65 años cobrando $100.000 mensuales

| Dato | Valor |
|------|-------|
| P(t) - Prestación mensual | $100.000 |
| FUU(65) | 138 |

**Cálculo:**
```
CPP(t) = $100.000 * 138 = $13.800.000
```

**Interpretación:** El sistema debe tener reservados $13.800.000 para garantizar el pago de este beneficio hasta el fallecimiento del jubilado y sus derechohabientes.

## Evolución en el Tiempo

| Edad | FUU | CPP (con P=$100.000) |
|------|-----|----------------------|
| 65 años | 138 | $13.800.000 |
| 70 años | 110 | $11.000.000 |
| 75 años | 85 | $8.500.000 |
| 80 años | 62 | $6.200.000 |

**Nota:** A mayor edad, menor FUU (menos tiempo esperado de pago), por lo tanto menor reserva necesaria.

---

# SECCIÓN XIII: Pasivo Computable del Régimen de Capitalización

<!-- 
Define el pasivo total del sistema = suma de todas las obligaciones con afiliados.
-->

## Qué Es

Define qué constituye el Pasivo total del sistema, es decir, todas las obligaciones que el sistema tiene con los afiliados.

## Para Qué Sirve

- **Medir las obligaciones totales** del sistema
- **Verificar la solvencia:** Los Activos Computables deben cubrir el Pasivo Computable
- **Control financiero** del régimen de capitalización

## Contenido

### Definición

Está constituido por la sumatoria de las CIAO, las CIAV, las CPP y el FOCIM, al momento (t).

### Fórmula

```
PC(t) = SUMA(CIAO(t) + CIAV(t) + CPP(t)) + FOCIM(t)
```

### Definición de Variables

| Variable | Significado |
|----------|-------------|
| `PC(t)` | Pasivo Computable en "t" |
| `CIAO(t)` | Subcuentas de Capitalización Individual de Aportes Obligatorios en "t" |
| `CIAV(t)` | Subcuentas de Capitalización Individual de Aportes Voluntarios en "t" |
| `CPP(t)` | Cuentas de Pago de Prestaciones en "t" |
| `FOCIM(t)` | Fondo de Contingencia para Invalidez y Muerte en Actividad |

## Ejemplo Práctico

**Situación:** Calcular el Pasivo Computable del sistema

| Componente | Valor |
|------------|-------|
| SUMA_CIAO(t) | $500.000.000 |
| SUMA_CIAV(t) | $50.000.000 |
| SUMA_CPP(t) | $200.000.000 |
| FOCIM(t) | $30.000.000 |

**Cálculo:**
```
PC(t) = $500M + $50M + $200M + $30M = $780.000.000
```

**Interpretación:** El sistema tiene obligaciones totales por $780 millones con sus afiliados (activos y pasivos).

## Composición del Pasivo

| Componente | Representa | Beneficiarios |
|------------|------------|---------------|
| CIAO | Aportes obligatorios acumulados | Afiliados activos |
| CIAV | Aportes voluntarios acumulados | Afiliados activos |
| CPP | Reservas para pagar jubilaciones/pensiones | Afiliados pasivos |
| FOCIM | Reserva para siniestros (muerte/invalidez) | Contingencias |

---

# SECCIÓN XIV: Traspaso de Rentabilidad a Cuentas de Capitalización de Afiliados Activos

<!-- 
Define cómo crecen las cuentas individuales con el rendimiento del sistema.
Solo se aplica si el rendimiento es positivo.
-->

## Qué Es

Define cómo se aplica la rentabilidad del sistema a las cuentas individuales de los afiliados activos, haciendo crecer sus saldos período a período.

## Para Qué Sirve

- **Capitalizar los aportes** de los afiliados activos
- **Aplicar el rendimiento** neto a cada cuenta individual
- **Proteger los saldos:** Solo se aplica si el rendimiento es positivo

## Contenido

### Fórmulas de Capitalización

```
CIAO(t) = (1 + r(t)) * CIAO(t-1)
```

```
CIAV(t) = (1 + r(t)) * CIAV(t-1)
```

### Condición de Aplicación

```
// Solo se aplica si el factor es mayor a 1
Para (1 + r(t)) > 1

Si no: [no se aplica rendimiento negativo]
```

### Definición de Variables

| Variable | Significado |
|----------|-------------|
| `r(t)` | Rentabilidad asignada a los fondos de Capitalización en el período "t". Esta rentabilidad debe ser calculada una vez detraído del rendimiento asignado al sistema de capitalización individual, los gastos, impuestos, sellados y toda erogación asignable al sistema. |
| `CIAO(t)` | Cuenta individual de aportes obligatorios en "t" |
| `CIAO(t-1)` | Cuenta individual de aportes obligatorios en "t-1" |
| `CIAV(t)` | Cuenta individual de aportes voluntarios en "t" |
| `CIAV(t-1)` | Cuenta individual de aportes voluntarios en "t-1" |

## Ejemplo Práctico

**Situación:** Capitalización mensual de un afiliado

| Dato | Valor |
|------|-------|
| CIAO(t-1) | $5.000.000 |
| CIAV(t-1) | $500.000 |
| r(t) | 0,5% mensual |

**Cálculo:**
```
CIAO(t) = (1 + 0.005) * $5.000.000 = $5.025.000
CIAV(t) = (1 + 0.005) * $500.000 = $502.500
```

**Interpretación:** Las cuentas crecieron $25.000 y $2.500 respectivamente por el rendimiento del período.

## Nota Importante

La rentabilidad `r(t)` es **neta**, es decir, ya se descontaron:
- Gastos administrativos
- Impuestos
- Sellados
- Toda erogación asignable al sistema

---

# SECCIÓN XV: Ajuste del Importe de la Prestación

<!-- 
Define cómo se actualizan las jubilaciones y pensiones en curso de pago.
El ajuste considera la diferencia entre rendimiento real y tasa de referencia.
-->

## Qué Es

Define cómo se actualiza el monto de las jubilaciones y pensiones que ya se están pagando. El ajuste considera la diferencia entre el rendimiento real obtenido y la tasa de referencia.

## Para Qué Sirve

- **Actualizar las prestaciones** de los pasivos (jubilados y pensionados)
- **Trasladar excedentes de rentabilidad** cuando el sistema rinde más que el 4%
- **Mantener el poder adquisitivo** de los beneficios

## Contenido

### Expresión en Pesos de la Prestación

```
P(t) = P(t-1) * (1 + r(t)) / (1 + i(t))
```

### Definición de Variables

| Variable | Significado |
|----------|-------------|
| `P(t-1)` | Prestación en pesos en el período t-1 |
| `P(t)` | Prestación en el momento "t", expresada en pesos |
| `r(t)` | Rentabilidad asignada en el período "t" |
| `i(t)` | Tasa de referencia 4% anual expresada en términos equivalentes para el período de tiempo entre "t-1" y "t" |

## Ejemplo Práctico

**Situación:** Ajuste mensual de una jubilación

| Dato | Valor |
|------|-------|
| P(t-1) - Jubilación actual | $100.000 |
| r(t) - Rentabilidad del período | 0,5% mensual |
| i(t) - Tasa referencia mensual | 0,327% (aproximadamente 4% anual) |

**Cálculo:**
```
P(t) = $100.000 * (1 + 0.005) / (1 + 0.00327)
P(t) = $100.000 * 1.005 / 1.00327
P(t) = $100.000 * 1.00172
P(t) = $100.172
```

**Interpretación:** La jubilación aumenta $172 porque el rendimiento (0,5%) superó la tasa de referencia (0,327%).

## Casos Posibles

| Situación | r(t) vs i(t) | Efecto en P(t) |
|-----------|--------------|----------------|
| Rendimiento > Referencia | r(t) > i(t) | **Aumenta** la prestación |
| Rendimiento = Referencia | r(t) = i(t) | **Mantiene** la prestación |
| Rendimiento < Referencia | r(t) < i(t) | **Disminuye** la prestación |

## ¿Por Qué se Divide por (1 + i(t))?

El FUU ya tiene "incorporada" la tasa de referencia del 4%. Cuando se calculó el beneficio inicial, se asumió que el sistema rendiría 4%.

- Si rinde **exactamente 4%** -> La prestación se mantiene igual
- Si rinde **más de 4%** -> El excedente se traslada al jubilado
- Si rinde **menos de 4%** -> La prestación baja (el FUU fue "optimista")

---

# FIN DEL DOCUMENTO

## Resumen de Secciones

| # | Sección | Contenido Principal |
|---|---------|---------------------|
| I | Tablas de Mortalidad | GAM 1983 y MI 85 |
| II | Tasa de Interés | 4% anual de referencia |
| III | Nomenclatura | 41 variables + 1 concepto |
| IV | Asignación de Edades | Índices j por tipo de beneficio |
| V | Factor Único Unitario | Fórmula general del FUU |
| VI | Determinación del FUU | FUU por tipo: Ordinaria, Invalidez, Pensión |
| VII | Cálculo de Edad en Meses | Rutina de 6 pasos |
| VIII | Cálculo de Probabilidades | Interpolación lineal, p, p^i, p^p |
| IX | Haberes Mínimos | VAR y contribución FOCIM |
| X | Rendimiento AC | Definición de Activos Computables |
| XI | Rendimiento a Transferir | Fórmula r_prima y garantía mínima |
| XII | Cuentas de Pago | CPP = P * FUU |
| XIII | Pasivo Computable | PC = CIAO + CIAV + CPP + FOCIM |
| XIV | Traspaso de Rentabilidad | Capitalización de cuentas activas |
| XV | Ajuste de Prestación | Actualización de jubilaciones/pensiones |

---

**Documento generado a partir de las Bases Técnicas 2025 - CEER**
**Ley 11034 - Régimen de Capitalización**