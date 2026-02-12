# Diccionario de Variables

- `n`: cantidad de beneficiarios.
- `cs`: cantidad de cónyuges/convivientes.
- `hs`: cantidad de hijos.
- `a(e)`: edad en meses del beneficiario `e` en fecha de retiro.
- `d(e)`: sexo del beneficiario `e` (`1` masculino, `2` femenino).
- `k(e)`: indicador de invalidez del beneficiario `e` (`0/1`).
- `Lx(x, s)`: supervivencia para activos por edad en meses `x` y sexo `s`.
- `Li(x, s)`: supervivencia para inválidos por edad en meses `x` y sexo `s`.
- `Pai(x, s)`: probabilidad de invalidarse y sobrevivir como inválido desde `x`.
- `alf(e, i)`: bit de configuración para beneficiario `e` en estado `i`.
- `gamm1/gamm2/gamm3`: selector dicotómico de probabilidad activa/inválida/pensión hijo.
- `B(i)`: proporción del beneficio según configuración y supervivencia del grupo.
- `port(i,t)`: probabilidad conjunta para configuración `i` y período `t`.
- `ppu`: suma actuarial descontada del valor unitario.
- `ppuu`: resultado final de `ppu`.
- `z`: saldo final proyectado.
- `beneficio proyectado`: `z / ppuu`.
- `xmin`: mínimo de edad mensual de cálculo (fijo `187` por paridad VBA).

