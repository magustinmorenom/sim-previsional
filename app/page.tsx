"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultSimulationInput } from "@/lib/defaults";
import type {
  BeneficiaryInput,
  SimulationInput,
  SimulationResult
} from "@/lib/types/simulation";

const steps = [
  "Contexto",
  "Grupo",
  "Fechas y aportes",
  "Parámetros",
  "Resultados",
  "Modo avanzado"
] as const;

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<SimulationInput>(defaultSimulationInput);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [technicalMetadata, setTechnicalMetadata] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch("/api/v1/technical-bases");
        const data = await response.json();
        setTechnicalMetadata(data);
      } catch {
        setTechnicalMetadata(null);
      }
    };

    void loadMetadata();
  }, []);

  const counts = useMemo(() => {
    const titular = input.beneficiaries.filter((item) => item.type === "T").length;
    const spouses = input.beneficiaries.filter((item) => item.type === "C").length;
    const children = input.beneficiaries.filter((item) => item.type === "H").length;

    return {
      titular,
      spouses,
      children,
      n: input.beneficiaries.length
    };
  }, [input.beneficiaries]);

  const hasBlockingOrder = counts.titular > 1;

  const onSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/simulations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(payload.error ?? "No fue posible ejecutar la simulación");
        return;
      }

      setResult(payload as SimulationResult);
      setStep(4);
    } catch {
      setResult(null);
      setError("Error de red ejecutando la simulación");
    } finally {
      setLoading(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!result) {
      return;
    }

    setDownloadingPdf(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/reports/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input, result })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No fue posible generar el PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `simulacion-ceer-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible generar el PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateBeneficiary = (
    index: number,
    patch: Partial<BeneficiaryInput>
  ): void => {
    setInput((prev) => {
      const next = prev.beneficiaries.map((beneficiary, currentIndex) =>
        currentIndex === index ? { ...beneficiary, ...patch } : beneficiary
      );
      return { ...prev, beneficiaries: next };
    });
  };

  const addBeneficiary = (): void => {
    if (input.beneficiaries.length >= 56) {
      return;
    }

    setInput((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { type: "H", sex: 1, birthDate: "2000-01-01", invalid: 0 }
      ]
    }));
  };

  const removeBeneficiary = (index: number): void => {
    setInput((prev) => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  return (
    <main>
      <section className="hero card">
        <span className="hero-tag">CEER 2025 - Migración Excel/VBA a Web</span>
        <h1>Simulador previsional con wizard explicativo y cálculo actuarial equivalente</h1>
        <p>
          Esta aplicación reproduce el comportamiento del libro <strong>proyectador de beneficios CEER vf 2025.xlsm</strong>
          , incluyendo la macro VBA (`beneficio`, `datos`, `ppu`) y fórmulas de Hoja3.
        </p>
        <div className="hero-grid">
          <article className="hero-stat">
            <strong>Paridad matemática</strong>
            <p>Motor exacto con tablas técnicas 2025 y tasa efectiva anual 4%.</p>
          </article>
          <article className="hero-stat">
            <strong>Transparencia</strong>
            <p>En cada paso se explica qué se calcula, cómo se calcula y para qué se usa.</p>
          </article>
          <article className="hero-stat">
            <strong>Resultado auditable</strong>
            <p>Salida en pantalla + exportación PDF con inputs, supuestos y trazas.</p>
          </article>
        </div>
      </section>

      <section className="wizard">
        <nav className="step-nav">
          {steps.map((title, idx) => (
            <button
              key={title}
              type="button"
              className={`step-tab ${idx === step ? "active" : ""}`}
              onClick={() => setStep(idx)}
            >
              {idx + 1}. {title}
            </button>
          ))}
        </nav>

        <section className="panel card">
          {step === 0 && (
            <>
              <h2>Paso 1 - Contexto y supuestos</h2>
              <p>
                El motor calcula el <strong>PPUU</strong>, el <strong>Saldo Final</strong> y el <strong>Beneficio Proyectado</strong>
                sobre la base de mortalidad `LA/LI/PAI`, estructura de beneficiarios y contribuciones.
              </p>

              <div className="info-box">
                <strong>Qué es PPUU:</strong> valor actual actuarial de la unidad de beneficio según configuración de causante y
                derechohabientes.
              </div>

              <div className="inline-grid">
                <article className="card panel">
                  <h3>Cómo se calcula (macro)</h3>
                  <p>
                    Se evalúan configuraciones binarias `i = 0 .. 2^n - 1`, períodos mensuales `t`, probabilidades de
                    supervivencia/invalidez y proporción de beneficio `B(i)`.
                  </p>
                  <details>
                    <summary>Detalle técnico</summary>
                    <div className="code">
                      {`ppu = sum_{t=1}^{1332-xmin} [ sum_{i=0}^{2^n-1} port(i,t) * B(i) ] * 1.04^(-t/12)
xmin = 187 (fijo por paridad VBA)
port(i,t) = productorio por beneficiario de probabilidades con gamma1/gamma2/gamma3`}
                    </div>
                  </details>
                </article>

                <article className="card panel">
                  <h3>Datos técnicos cargados</h3>
                  <p>
                    Se usan tablas congeladas v2025 extraídas del archivo original. El motor no depende de edición manual.
                  </p>
                  <div className="code">
                    {JSON.stringify(technicalMetadata, null, 2) || "Cargando metadata técnica..."}
                  </div>
                </article>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Paso 2 - Grupo familiar</h2>
              <p>
                Definí titulares, cónyuges y/o hijos. La posición se canoniza internamente para mantener equivalencia con
                la macro.
              </p>
              <div className="info-box">
                <strong>Para qué sirve:</strong> la composición del grupo determina combinaciones `2^n` y la regla de proporción
                `B(i)` que impacta directamente el PPUU.
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tipo</th>
                      <th>Sexo</th>
                      <th>Fecha nacimiento</th>
                      <th>Invalidez</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {input.beneficiaries.map((beneficiary, index) => (
                      <tr key={`${beneficiary.birthDate}-${index}`}>
                        <td>{index + 1}</td>
                        <td>
                          <select
                            value={beneficiary.type}
                            onChange={(event) =>
                              updateBeneficiary(index, {
                                type: event.target.value as BeneficiaryInput["type"]
                              })
                            }
                          >
                            <option value="T">T (Titular)</option>
                            <option value="C">C (Cónyuge/conviviente)</option>
                            <option value="H">H (Hijo)</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={beneficiary.sex}
                            onChange={(event) =>
                              updateBeneficiary(index, {
                                sex: Number(event.target.value) as BeneficiaryInput["sex"]
                              })
                            }
                          >
                            <option value={1}>1 (M)</option>
                            <option value={2}>2 (F)</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            value={beneficiary.birthDate}
                            onChange={(event) =>
                              updateBeneficiary(index, {
                                birthDate: event.target.value
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={beneficiary.invalid}
                            onChange={(event) =>
                              updateBeneficiary(index, {
                                invalid: Number(event.target.value) as BeneficiaryInput["invalid"]
                              })
                            }
                          >
                            <option value={0}>0 (No)</option>
                            <option value={1}>1 (Sí)</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => removeBeneficiary(index)}
                            disabled={input.beneficiaries.length <= 1}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="actions">
                <button type="button" className="secondary" onClick={addBeneficiary}>
                  Agregar beneficiario
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setInput(defaultSimulationInput)}
                >
                  Restaurar caso base
                </button>
              </div>

              <div className="code">
                {`n=${counts.n} | titulares=${counts.titular} | cónyuges=${counts.spouses} | hijos=${counts.children}
Regla de operación exacta: n <= 12`}
              </div>

              {hasBlockingOrder && (
                <div className="status error">Solo se permite un titular (T).</div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2>Paso 3 - Fechas y aportes</h2>
              <p>
                Se define la fecha de cálculo, saldo de cuenta y edades de inicio/fin de aportes obligatorios y voluntarios.
              </p>

              <div className="inline-grid">
                <label className="field">
                  Fecha de cálculo
                  <input
                    type="date"
                    value={input.calculationDate}
                    onChange={(event) =>
                      setInput((prev) => ({ ...prev, calculationDate: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  Saldo cuenta
                  <input
                    type="number"
                    value={input.accountBalance}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        accountBalance: Number(event.target.value)
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Aportes obligatorios - Edad inicio
                  <input
                    type="number"
                    value={input.mandatoryContribution.startAge}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        mandatoryContribution: {
                          ...prev.mandatoryContribution,
                          startAge: Number(event.target.value)
                        }
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Aportes obligatorios - Edad fin
                  <input
                    type="number"
                    value={input.mandatoryContribution.endAge}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        mandatoryContribution: {
                          ...prev.mandatoryContribution,
                          endAge: Number(event.target.value)
                        }
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Aportes voluntarios - Edad inicio
                  <input
                    type="number"
                    value={input.voluntaryContribution.startAge}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        voluntaryContribution: {
                          ...prev.voluntaryContribution,
                          startAge: Number(event.target.value)
                        }
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Aportes voluntarios - Edad fin
                  <input
                    type="number"
                    value={input.voluntaryContribution.endAge}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        voluntaryContribution: {
                          ...prev.voluntaryContribution,
                          endAge: Number(event.target.value)
                        }
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Importe mensual aportes voluntarios
                  <input
                    type="number"
                    value={input.voluntaryContribution.monthlyAmount}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        voluntaryContribution: {
                          ...prev.voluntaryContribution,
                          monthlyAmount: Number(event.target.value)
                        }
                      }))
                    }
                  />
                </label>
              </div>

              <details>
                <summary>Cómo se calcula el Saldo Final (equivalente a Hoja3!G20)</summary>
                <div className="code">
                  {`Saldo Final = SaldoCuenta * 1.04^(65 - EdadActualTitular)
+ IFERROR(VLOOKUP(edad_inicio_oblig, tabla_factores) * BOV
+ aporte_voluntario_mensual * 12 * (1.04^(edad_fin_vol - edad_ini_vol) - 1)/0.04, 0)`}
                </div>
              </details>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Paso 4 - Objetivo y supuestos</h2>
              <p>
                Definí el BOV y revisá supuestos técnicos del cálculo actuarial. El motor mantiene `xmin=187` para paridad
                estricta con el VBA.
              </p>

              <div className="inline-grid">
                <label className="field">
                  BOV
                  <input
                    type="number"
                    value={input.bov}
                    onChange={(event) =>
                      setInput((prev) => ({ ...prev, bov: Number(event.target.value) }))
                    }
                  />
                </label>
                <div className="card panel">
                  <h3>Supuestos técnicos activos</h3>
                  <div className="code">
                    {`Tasa efectiva anual: 4%
Tablas: GAM/MI 85 integradas en TABLA
xmin: 187 (fijo)
Límite de cálculo exacto: n <= 12`}
                  </div>
                </div>
              </div>

              <details>
                <summary>Cómo se calcula la edad en meses (xj)</summary>
                <div className="code">
                  {`DIFAÑO = año_ref - año_nac
DIFMES = mes_ref - mes_nac
DIFDIA = día_ref - día_nac
si DIFDIA < 0 => DIFMES = DIFMES - 1
si DIFMES < 0 => DIFMES = DIFMES + 12 y DIFAÑO = DIFAÑO - 1
xj = DIFAÑO * 12 + DIFMES`}
                </div>
              </details>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Paso 5 - Ejecutar y revisar resultados</h2>
              <p>
                Ejecutá la simulación para obtener PPUU, Saldo Final y Beneficio Proyectado en equivalencia con el Excel.
              </p>

              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  disabled={loading || hasBlockingOrder || counts.n > 12}
                  onClick={() => void onSimulation()}
                >
                  {loading ? "Calculando..." : "Ejecutar simulación"}
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => void onDownloadPdf()}
                  disabled={!result || downloadingPdf}
                >
                  {downloadingPdf ? "Generando PDF..." : "Exportar PDF"}
                </button>
              </div>

              {counts.n > 12 && (
                <div className="status error">
                  El cálculo exacto 1:1 con VBA se bloquea para n&gt;12 por complejidad exponencial (2^n).
                </div>
              )}

              {error && <div className="status error">{error}</div>}

              {result && (
                <>
                  <div className="summary-grid">
                    <article className="metric">
                      <span>PPUU</span>
                      <strong>{formatNumber(result.ppuu)}</strong>
                    </article>
                    <article className="metric">
                      <span>Saldo Final</span>
                      <strong>{formatCurrency(result.finalBalance)}</strong>
                    </article>
                    <article className="metric">
                      <span>Beneficio Proyectado</span>
                      <strong>{formatCurrency(result.projectedBenefit)}</strong>
                    </article>
                  </div>

                  <div className="code">
                    {`Fecha jubilación: ${result.retirementDate}
Conteos: n=${result.counts.n}, cs=${result.counts.spouses}, hs=${result.counts.children}
xmin=${result.trace.xmin}, tMax=${result.trace.tMax}`}
                  </div>

                  {result.trace.warnings.length > 0 && (
                    <div className="status error">
                      {result.trace.warnings.map((warning) => `- ${warning}`).join("\n")}
                    </div>
                  )}

                  {isBaseCase(input) && (
                    <div className="status ok">
                      Caso base detectado. Valores esperados Excel: PPUU=180.7791975865581, Saldo Final=6375620.8869871786,
                      Beneficio=35267.447649485868.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <h2>Paso 6 - Modo avanzado</h2>
              <p>
                Vista técnica equivalente para auditoría: cálculo de edades por beneficiario (Hoja1-like) y serie auxiliar
                actuarial (Hoja2-like).
              </p>

              {!result && (
                <div className="status error">Primero ejecutá una simulación en el paso de resultados.</div>
              )}

              {result?.trace.advanced && (
                <>
                  <h3>Hoja1-like: edades en meses al retiro</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Tipo</th>
                          <th>Nacimiento</th>
                          <th>DIF año</th>
                          <th>DIF mes</th>
                          <th>DIF día</th>
                          <th>Edad meses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trace.advanced.hoja1Like.map((row) => (
                          <tr key={`hoja1-${row.beneficiaryIndex}`}>
                            <td>{row.beneficiaryIndex}</td>
                            <td>{row.type}</td>
                            <td>{row.birthDate}</td>
                            <td>{row.diffYears}</td>
                            <td>{row.diffMonths}</td>
                            <td>{row.diffDays}</td>
                            <td>{row.ageMonthsAtRetirement}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3>Hoja2-like: serie auxiliar</h3>
                  <p className="footer-note">
                    Se muestra la serie mensual equivalente (`survivalRatio`, `discountFactor`, `discountedProduct`) para
                    trazabilidad del factor auxiliar.
                  </p>

                  <div className="code">
                    {`baseAgeMonth=${result.trace.advanced.hoja2Like.baseAgeMonth}
periodCount=${result.trace.advanced.hoja2Like.periodCount}
sumDiscountedProduct=${result.trace.advanced.hoja2Like.sumDiscountedProduct}
equivalentFuu=${result.trace.advanced.hoja2Like.equivalentFuu}`}
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th>Survival Ratio</th>
                          <th>Discount Factor</th>
                          <th>Discounted Product</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trace.advanced.hoja2Like.rows.slice(0, 120).map((row) => (
                          <tr key={`hoja2-${row.month}`}>
                            <td>{row.month}</td>
                            <td>{formatNumber(row.survivalRatio)}</td>
                            <td>{formatNumber(row.discountFactor)}</td>
                            <td>{formatNumber(row.discountedProduct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="footer-note">
                    Se muestran los primeros 120 de {result.trace.advanced.hoja2Like.rows.length} registros para lectura.
                  </p>
                </>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 12
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(value);
}

function isBaseCase(input: SimulationInput): boolean {
  return (
    input.calculationDate === "2024-02-22" &&
    input.accountBalance === 3481733.27 &&
    input.bov === 200832.23 &&
    input.mandatoryContribution.startAge === 58 &&
    input.mandatoryContribution.endAge === 65 &&
    input.voluntaryContribution.startAge === 58 &&
    input.voluntaryContribution.endAge === 65 &&
    input.voluntaryContribution.monthlyAmount === 0 &&
    input.beneficiaries.length === 2 &&
    input.beneficiaries[0].type === "T" &&
    input.beneficiaries[0].sex === 1 &&
    input.beneficiaries[0].birthDate === "1966-05-19" &&
    input.beneficiaries[1].type === "C" &&
    input.beneficiaries[1].sex === 2 &&
    input.beneficiaries[1].birthDate === "1972-04-07"
  );
}
