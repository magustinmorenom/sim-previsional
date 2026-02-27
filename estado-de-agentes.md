# Estado de Agentes (Log Vivo)

**Proyecto:** P10 - Simulador Previsional
**Objetivo:** Coordinar el trabajo entre agentes que operan sobre este repositorio, evitando conflictos de archivos, duplicaciones y regresiones.

---

## Reglas Generales

1. **Append-only:** Solo se agregan entradas al final. Nunca borrar ni editar entradas anteriores.
2. **Un lock por archivo:** Si un agente tiene LOCK sobre un archivo, ningún otro agente puede modificarlo hasta que se libere.
3. **Primer agente que lockea gana:** En caso de colisión, el primero en registrar el LOCK tiene prioridad.
4. **Rutas absolutas:** Siempre usar rutas absolutas para evitar ambigüedad.
5. **Validar antes de cerrar:** Toda entrada FIN debe incluir resultado de validación (tsc, lint, tests).
6. **Timestamps ISO:** Usar formato YYYY-MM-DD HH:mm para todas las entradas.
7. **Un in-progress a la vez:** Cada agente solo trabaja en una tarea activa a la vez.
8. **Liberar locks explícitamente:** Los locks se liberan solo con entradas FIN o LIBERA_LOCK.
9. **Documentar dependencias:** Si una tarea depende de otra, declararlo en el campo dependencias.
10. **Riesgos:** Evaluar y declarar el nivel de riesgo de conflicto (bajo/medio/alto).

---

## Criterio: Avanzar vs Esperar

| Situacion | Decision |
|---|---|
| Archivos objetivo sin lock de otro agente | Avanzar |
| Lock activo de otro agente sobre archivos objetivo | Esperar |
| Dependencia de tarea no completada | Esperar o trabajar en otra cosa |
| Sin conflicto de archivos, tareas independientes | Avanzar en paralelo |

---

## Formato de Entrada

```
## [YYYY-MM-DD HH:mm] AGENTE: <nombre-o-rol> | TIPO: <TIPO>

- tarea: <descripcion de lo que hace el agente>
- decision: <avanzar|esperar|bloqueado> + motivo
- archivos_objetivo: <rutas absolutas separadas por coma, o N/A>
- locks: <LOCK ruta1,ruta2 | SIN_LOCK | LIBERA ruta1,ruta2>
- dependencias: <ninguna | que necesita y de quien>
- cambios_realizados: <resumen o "sin cambios aun">
- riesgos_conflicto: <bajo|medio|alto> + detalle
- siguiente_paso: <proxima accion concreta>
- eta: <estimacion o N/A>
```

### Tipos de entrada validos

- **INICIO** - El agente comienza a trabajar en una tarea
- **PROGRESO** - Actualizacion de avance durante el trabajo
- **BLOQUEADO** - El trabajo esta bloqueado esperando algo
- **HANDOFF** - Transferencia de responsabilidad a otro agente
- **FIN** - Tarea completada
- **LIBERA_LOCK** - Liberacion explicita de locks

---

## Convenciones de rutas

- Base del proyecto: `/Users/agustin/Documents/00 Entorno de Aplicaciones/P10_Simulador_Previsional/`
- Prefijo comun: `P10:` para referencia rapida
- Siempre expandir a ruta absoluta en archivos_objetivo y locks

---

## Log de Entradas

## [2026-02-27 00:00] AGENTE: bootstrap | TIPO: INICIO

- tarea: Inicializacion del log de coordinacion de agentes para P10
- decision: avanzar - archivo nuevo, sin conflictos posibles
- archivos_objetivo: /Users/agustin/Documents/00 Entorno de Aplicaciones/P10_Simulador_Previsional/estado-de-agentes.md
- locks: SIN_LOCK
- dependencias: ninguna
- cambios_realizados: Creacion del archivo estado-de-agentes.md con estructura base y reglas de coordinacion
- riesgos_conflicto: bajo - archivo nuevo sin historial
- siguiente_paso: Los agentes que trabajen en P10 deben registrar sus entradas aqui
- eta: N/A
