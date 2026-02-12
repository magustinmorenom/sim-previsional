"use client";

import { useMemo, useState, type SVGProps } from "react";
import { defaultSimulationInput } from "@/lib/defaults";
import type {
  BeneficiaryInput,
  SimulationInput,
  SimulationResult
} from "@/lib/types/simulation";

function IconBase({
  size = 18,
  strokeWidth = 1.5,
  children,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

const BadgePercent = (props: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) => (
  <IconBase {...props}>
    <path d="M7 17 17 7" />
    <circle cx="8" cy="8" r="2.2" />
    <circle cx="16" cy="16" r="2.2" />
  </IconBase>
);

const CircleDollarSign = (props: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10" />
    <path d="M15.3 9.6c0-1.1-1.5-2-3.3-2s-3.3.9-3.3 2 1.5 2 3.3 2 3.3.9 3.3 2-1.5 2-3.3 2-3.3-.9-3.3-2" />
  </IconBase>
);

const FileText = (props: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) => (
  <IconBase {...props}>
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </IconBase>
);

const UsersRound = (props: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) => (
  <IconBase {...props}>
    <circle cx="9" cy="8.5" r="2.8" />
    <circle cx="16.5" cy="9.5" r="2.3" />
    <path d="M3.5 19a6 6 0 0 1 11 0" />
    <path d="M14.5 19a4.5 4.5 0 0 1 6 0" />
  </IconBase>
);

const steps = ["Contexto", "Grupo familiar", "Fechas y aportes", "Parámetros", "Resultados"] as const;

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<SimulationInput>(defaultSimulationInput);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const titulares = input.beneficiaries.filter((item) => item.type === "T").length;
    const spouses = input.beneficiaries.filter((item) => item.type === "C").length;
    const children = input.beneficiaries.filter((item) => item.type === "H").length;

    return {
      titulares,
      spouses,
      children,
      n: input.beneficiaries.length
    };
  }, [input.beneficiaries]);

  const hasBlockingTitular = counts.titulares > 1;

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
        setError(sanitizeUserError(payload.error ?? "No fue posible ejecutar la simulación."));
        return;
      }

      setResult(payload as SimulationResult);
      setStep(4);
    } catch {
      setResult(null);
      setError("No fue posible ejecutar la simulación. Intentá nuevamente.");
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
        throw new Error(payload.error ?? "No fue posible generar el PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `simulacion-previsional-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible generar el PDF.";
      setError(sanitizeUserError(message));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateBeneficiary = (index: number, patch: Partial<BeneficiaryInput>): void => {
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
        {
          type: "H",
          sex: 1,
          birthDate: "2000-01-01",
          invalid: 0
        }
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
    <main className="cms-shell">
      <section className="cms-main-surface">
        <header className="cms-main-header">
          <h1>Simulador Previsional</h1>
          <p>Cargá datos del grupo, configurá aportes y obtené una proyección clara para la toma de decisiones.</p>
          <a
            href="bases-tecnicas-2025.html"
            target="_blank"
            rel="noopener noreferrer"
            className="cms-btn-bases"
          >
            Ver Bases Técnicas
          </a>
        </header>

        <nav className="cms-step-nav" aria-label="Navegación de pasos">
          {steps.map((title, idx) => (
            <button
              key={title}
              type="button"
              className={`cms-step-tab ${idx === step ? "active" : ""}`}
              onClick={() => setStep(idx)}
            >
              {idx + 1}. {title}
            </button>
          ))}
        </nav>

        <section className="cms-panel">
          {step === 0 && (
            <>
              <h2>Contexto</h2>
              <p>
                Esta pantalla reúne los componentes principales de una simulación previsional y permite avanzar de forma
                guiada, con datos claros y resultados listos para compartir.
              </p>

              <div className="cms-service-grid">
                <article className="cms-service-card">
                  <div className="cms-service-icon">
                    <CircleDollarSign size={18} strokeWidth={1.5} />
                  </div>
                  <h3>Proyección de beneficio</h3>
                  <span className="cms-tag">CALCULO ESTIMADO</span>
                </article>

                <article className="cms-service-card">
                  <div className="cms-service-icon">
                    <UsersRound size={18} strokeWidth={1.5} />
                  </div>
                  <h3>Grupo familiar</h3>
                  <span className="cms-tag">DATOS DE TITULAR Y BENEFICIARIOS</span>
                </article>

                <article className="cms-service-card">
                  <div className="cms-service-icon">
                    <BadgePercent size={18} strokeWidth={1.5} />
                  </div>
                  <h3>Aportes y parámetros</h3>
                  <span className="cms-tag">CONFIGURACION PERSONALIZADA</span>
                </article>

                <article className="cms-service-card">
                  <div className="cms-service-icon">
                    <FileText size={18} strokeWidth={1.5} />
                  </div>
                  <h3>Reporte descargable</h3>
                  <span className="cms-tag">PDF RESUMIDO</span>
                </article>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Grupo familiar</h2>
              <p>
                Definí titulares, cónyuges y/o hijos con su información básica. Estos datos impactan directamente en la
                simulación.
              </p>

              <div className="cms-table-wrap">
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
                            className="cms-btn cms-btn-danger"
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

              <div className="cms-actions-row">
                <button type="button" className="cms-btn cms-btn-main" onClick={addBeneficiary}>
                  Agregar beneficiario
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-soft"
                  onClick={() => setInput(defaultSimulationInput)}
                >
                  Restaurar datos iniciales
                </button>
              </div>

              <div className="cms-inline-note">
                <span>
                  Resumen: {counts.n} personas | {counts.spouses} cónyuges | {counts.children} hijos
                </span>
              </div>

              {hasBlockingTitular && (
                <div className="cms-status error">Solo se permite un titular (T).</div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2>Fechas y aportes</h2>
              <p>
                Completá fecha de cálculo, saldo de cuenta y el tramo de aportes para personalizar la proyección.
              </p>

              <div className="cms-form-grid">
                <label className="cms-field">
                  Fecha de cálculo
                  <input
                    type="date"
                    value={input.calculationDate}
                    onChange={(event) =>
                      setInput((prev) => ({ ...prev, calculationDate: event.target.value }))
                    }
                  />
                </label>

                  <label className="cms-field">
                    Saldo de cuenta
                    <input
                      type="number"
                      value={input.accountBalance}
                      onChange={(event) =>
                        setInput((prev) => ({ ...prev, accountBalance: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label className="cms-field">
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

                  <label className="cms-field">
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

                  <label className="cms-field">
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

                  <label className="cms-field">
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

                  <label className="cms-field">
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
            </>
          )}

          {step === 3 && (
            <>
              <h2>Parámetros</h2>
              <p>
                Ajustá el valor de referencia del objetivo para obtener una estimación alineada a tu escenario.
              </p>

              <div className="cms-form-grid">
                <label className="cms-field">
                  BOV
                  <input
                    type="number"
                    value={input.bov}
                    onChange={(event) =>
                      setInput((prev) => ({ ...prev, bov: Number(event.target.value) }))
                    }
                  />
                </label>

                  <article className="cms-info-card">
                    <h3>Base técnica activa</h3>
                    <p>La simulación utiliza parámetros vigentes para proyectar resultados de forma consistente.</p>
                    <span className="cms-tag">VERSION 2025</span>
                  </article>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Resultados</h2>
              <p>Ejecutá la simulación y revisá los indicadores clave del escenario configurado.</p>

              <div className="cms-actions-row">
                <button
                  type="button"
                  className="cms-btn cms-btn-main"
                  disabled={loading || hasBlockingTitular || counts.n > 12}
                  onClick={() => void onSimulation()}
                >
                  {loading ? "Calculando..." : "Ejecutar simulación"}
                </button>

                  <button
                    type="button"
                    className="cms-btn cms-btn-secondary"
                    disabled={!result || downloadingPdf}
                    onClick={() => void onDownloadPdf()}
                  >
                    {downloadingPdf ? "Generando PDF..." : "Exportar PDF"}
                  </button>
              </div>

              {counts.n > 12 && (
                <div className="cms-status error">
                  El escenario supera el límite operativo de esta versión (máximo 12 beneficiarios por cálculo).
                </div>
              )}

              {error && <div className="cms-status error">{error}</div>}

              {result && (
                <>
                  <div className="cms-metric-grid">
                    <article className="cms-metric-card">
                      <span>PPUU</span>
                      <strong>{formatNumber(result.ppuu)}</strong>
                    </article>
                    <article className="cms-metric-card">
                      <span>Saldo final</span>
                      <strong>{formatCurrency(result.finalBalance)}</strong>
                    </article>
                    <article className="cms-metric-card">
                      <span>Beneficio proyectado</span>
                      <strong>{formatCurrency(result.projectedBenefit)}</strong>
                    </article>
                  </div>

                  <div className="cms-inline-note">
                    <span>Fecha de jubilación: {result.retirementDate}</span>
                    <span>
                      Grupo: {result.counts.n} personas ({result.counts.spouses} cónyuges, {result.counts.children} hijos)
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function sanitizeUserError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("n <=") || normalized.includes("beneficiarios")) {
    return "El escenario supera el límite operativo de esta versión. Reducí el grupo a un máximo de 12 beneficiarios.";
  }

  return message;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}
