"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useController,
  useFieldArray,
  useForm,
  type Control,
  type FieldPath
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";
import "react-day-picker/dist/style.css";
import { defaultSimulationInput } from "@/lib/defaults";
import { simulationInputSchema } from "@/lib/validation/simulation-input";
import type { BeneficiaryInput, SimulationInput, SimulationResult } from "@/lib/types/simulation";

const steps = ["Grupo familiar", "Fechas y aportes", "Parámetros", "Resultados"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const newBeneficiary: BeneficiaryInput = {
  type: "H",
  sex: 1,
  birthDate: "2000-01-01",
  invalid: 0
};

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    year <= 2099
  );
}

function parseIsoDate(value: string): Date | undefined {
  if (!ISO_DATE_REGEX.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!isValidCalendarDate(year, month, day)) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIsoToDisplay(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) {
    return iso;
  }

  const day = parsed.getDate().toString().padStart(2, "0");
  const month = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const year = parsed.getFullYear().toString();
  return `${day}/${month}/${year}`;
}

function normalizeDisplayDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("/");
}

function displayToIso(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function estimateRetirementDate(
  beneficiaries: BeneficiaryInput[] | undefined,
  calculationDate: string
): string | null {
  if (!beneficiaries?.length) {
    return null;
  }

  const anchor = beneficiaries.find((item) => item.type === "T") ?? beneficiaries[0];
  const birth = parseIsoDate(anchor.birthDate);
  const calc = parseIsoDate(calculationDate);

  if (!birth || !calc) {
    return null;
  }

  const candidate = new Date(birth.getFullYear() + 65, birth.getMonth(), birth.getDate());
  return formatIsoDate(candidate > calc ? candidate : calc);
}

type TraceStep = {
  title: string;
  parameters: ReactNode;
  formula: ReactNode;
  outcome: ReactNode;
};

function tracePill(value: string, tone: "param" | "calc" | "result"): ReactNode {
  return <span className={`cms-pill cms-pill-${tone}`}>{value}</span>;
}

type DateFieldProps = {
  control: Control<SimulationInput>;
  name: FieldPath<SimulationInput>;
  label: string;
  compact?: boolean;
  disabled?: boolean;
};

function DateField({ control, name, label, compact = false, disabled = false }: DateFieldProps) {
  const { field, fieldState } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  const [text, setText] = useState<string>(formatIsoToDisplay(value));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(parseIsoDate(value) ?? new Date(2000, 0, 1));
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) {
      setText(formatIsoToDisplay(value));
      setMonth(parsed);
      return;
    }

    setText(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const maxWidth = 320;
      const margin = 12;
      const nextLeft = Math.min(
        Math.max(rect.left, margin),
        Math.max(margin, window.innerWidth - maxWidth - margin)
      );

      setPopoverPosition({
        top: rect.bottom + 8,
        left: nextLeft
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  const onInputChange = (raw: string) => {
    const normalized = normalizeDisplayDate(raw);
    setText(normalized);

    if (normalized.length === 10) {
      const iso = displayToIso(normalized);
      field.onChange(iso ?? normalized);
      if (iso) {
        const parsed = parseIsoDate(iso);
        if (parsed) {
          setMonth(parsed);
        }
      }
      return;
    }

    field.onChange(normalized);
  };

  const selectedDate = parseIsoDate(value);
  const hasRegexError = fieldState.error?.message?.includes("YYYY-MM-DD") ?? false;
  const errorMessage = hasRegexError
    ? "Ingresá una fecha válida en formato DD/MM/AAAA"
    : fieldState.error?.message;

  return (
    <label className={`cms-field cms-date-field ${compact ? "compact" : ""}`}>
      <span className={compact ? "sr-only" : ""}>{label}</span>
      <div className="cms-date-inputs" ref={anchorRef}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          value={text}
          onChange={(event) => onInputChange(event.target.value)}
          disabled={disabled}
          maxLength={10}
        />
        <button
          type="button"
          className="cms-btn cms-btn-soft cms-date-trigger"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          aria-label={`Abrir calendario de ${label}`}
        >
          Calendario
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="cms-date-popover"
            ref={popoverRef}
            style={{ top: `${popoverPosition.top}px`, left: `${popoverPosition.left}px` }}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) {
                  return;
                }

                const iso = formatIsoDate(date);
                field.onChange(iso);
                setOpen(false);
              }}
              month={month}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              navLayout="after"
              fromYear={1900}
              toYear={2099}
              showOutsideDays
              fixedWeeks
            />
          </div>,
          document.body
        )}

      {errorMessage && <span className="cms-field-error">{errorMessage}</span>}
    </label>
  );
}

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceRevealCount, setTraceRevealCount] = useState(0);
  const traceIntervalRef = useRef<number | null>(null);
  const traceCompletionRef = useRef<number | null>(null);

  const {
    control,
    register,
    watch,
    reset,
    trigger,
    handleSubmit,
    formState: { errors }
  } = useForm<SimulationInput>({
    resolver: zodResolver(simulationInputSchema),
    defaultValues: defaultSimulationInput,
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "beneficiaries"
  });

  const beneficiaries = watch("beneficiaries");
  const calculationDate = watch("calculationDate");
  const mandatoryStartAge = watch("mandatoryContribution.startAge");
  const mandatoryEndAge = watch("mandatoryContribution.endAge");
  const voluntaryStartAge = watch("voluntaryContribution.startAge");
  const voluntaryEndAge = watch("voluntaryContribution.endAge");
  const voluntaryMonthlyAmount = watch("voluntaryContribution.monthlyAmount");
  const accountBalance = watch("accountBalance");
  const bov = watch("bov");

  const counts = useMemo(() => {
    const list = beneficiaries ?? [];
    const titulares = list.filter((item) => item.type === "T").length;
    const spouses = list.filter((item) => item.type === "C").length;
    const children = list.filter((item) => item.type === "H").length;

    return {
      titulares,
      spouses,
      children,
      n: list.length
    };
  }, [beneficiaries]);

  const hasBlockingTitular = counts.titulares > 1;

  const retirementPreview = useMemo(
    () => estimateRetirementDate(beneficiaries, calculationDate) ?? "pendiente",
    [beneficiaries, calculationDate]
  );

  const traceSteps = useMemo<TraceStep[]>(
    () => [
      {
        title: "Validación de entrada",
        parameters: (
          <>
            Revisamos {tracePill(`${counts.n} personas`, "param")},{" "}
            {tracePill(`${counts.titulares} titular(es)`, "param")} y la fecha de cálculo{" "}
            {tracePill(calculationDate || "sin dato", "param")}.
          </>
        ),
        formula: (
          <>
            Comprobamos en lenguaje de negocio que haya como máximo un titular, que las fechas sean válidas y que el
            grupo no supere {tracePill("12 personas", "calc")} para la corrida exacta.
          </>
        ),
        outcome: hasBlockingTitular
          ? (
            <>
              Detectamos {tracePill("más de un titular", "result")}. El cálculo queda bloqueado hasta corregirlo.
            </>
            )
          : (
            <>La entrada queda {tracePill("lista para simular", "result")}.</>
            )
      },
      {
        title: "Fecha objetivo de jubilación",
        parameters: (
          <>
            Partimos de nacimiento titular{" "}
            {tracePill(beneficiaries?.find((b) => b.type === "T")?.birthDate ?? "sin titular", "param")} y fecha de
            cálculo {tracePill(calculationDate || "sin dato", "param")}.
          </>
        ),
        formula: (
          <>
            Elegimos la fecha más tardía entre la fecha de cálculo y la fecha en la que el titular cumple{" "}
            {tracePill("65 años", "calc")}.
          </>
        ),
        outcome: (
          <>
            Fecha de jubilación estimada: {tracePill(result?.retirementDate ?? retirementPreview, "result")}.
          </>
        )
      },
      {
        title: "Edades técnicas en meses",
        parameters: (
          <>
            Calculamos para {tracePill(`${counts.n} beneficiarios`, "param")} usando la fecha de jubilación{" "}
            {tracePill(result?.retirementDate ?? retirementPreview, "param")}.
          </>
        ),
        formula: (
          <>
            Convertimos cada edad a meses con diferencia exacta de años, meses y días para alinear con las tablas
            técnicas.
          </>
        ),
        outcome: result
          ? (
            <>
              Edades en meses obtenidas: {tracePill(result.agesInMonths.join(", "), "result")}.
            </>
            )
          : (
            <>Las edades en meses se completan cuando se ejecuta la simulación.</>
            )
      },
      {
        title: "Cálculo actuarial de PPUU",
        parameters: (
          <>
            Usamos {tracePill(`n=${counts.n}`, "param")}, {tracePill(`xmin=${result?.trace.xmin ?? 187}`, "param")},{" "}
            {tracePill(`tMax=${result?.trace.tMax ?? 1145}`, "param")} y tasa técnica{" "}
            {tracePill("4% anual", "param")}.
          </>
        ),
        formula: (
          <>
            Recorremos mes a mes todas las configuraciones posibles del grupo, ponderamos probabilidades y descontamos
            cada flujo al presente.
          </>
        ),
        outcome: result
          ? (
            <>
              PPUU calculado: {tracePill(formatNumber(result.ppuu), "result")}.
            </>
            )
          : (
            <>El PPUU se muestra cuando finaliza la corrida.</>
            )
      },
      {
        title: "Proyección de saldo final",
        parameters: (
          <>
            Tomamos saldo actual {tracePill(formatCurrency(accountBalance || 0), "param")}, BOV{" "}
            {tracePill(formatCurrency(bov || 0), "param")}, rango voluntario{" "}
            {tracePill(`${voluntaryStartAge}-${voluntaryEndAge}`, "param")} y aporte mensual{" "}
            {tracePill(formatCurrency(voluntaryMonthlyAmount || 0), "param")}.
          </>
        ),
        formula: (
          <>
            Proyectamos el saldo acumulando al retiro, sumando el componente por BOV y el efecto de aportes voluntarios
            según rango configurado.
          </>
        ),
        outcome: result
          ? (
            <>
              Saldo final interno: {tracePill(formatCurrency(result.finalBalance), "result")}.
            </>
            )
          : (
            <>El saldo final interno queda disponible al terminar el cálculo.</>
            )
      },
      {
        title: "Beneficio mensual proyectado",
        parameters: (
          <>
            Usamos PPUU {tracePill(result ? formatNumber(result.ppuu) : "pendiente", "param")} y saldo final{" "}
            {tracePill(result ? formatCurrency(result.finalBalance) : "pendiente", "param")}.
          </>
        ),
        formula: (
          <>
            Dividimos el saldo final por el PPUU para obtener un valor mensual equivalente y comparable.
          </>
        ),
        outcome: result
          ? (
            <>
              Beneficio proyectado: {tracePill(formatCurrency(result.projectedBenefit), "result")}.
            </>
            )
          : (
            <>El beneficio se informa cuando termina todo el proceso.</>
            )
      },
      {
        title: "Control de consistencia",
        parameters: (
          <>
            Revisamos advertencias de traza {tracePill(`${result?.trace.warnings.length ?? 0}`, "param")}.
          </>
        ),
        formula: (
          <>
            Si aparece alguna inconsistencia técnica, la registramos explícitamente para que el usuario sepa qué revisar.
          </>
        ),
        outcome: result
          ? result.trace.warnings.length > 0
            ? (
              <>
                Advertencias detectadas: {tracePill(result.trace.warnings.join(" | "), "result")}.
              </>
              )
            : (
              <>Estado final: {tracePill("sin advertencias técnicas", "result")}.</>
              )
          : (
            <>El control final se completa cuando finaliza la corrida.</>
            )
      }
    ],
    [
      accountBalance,
      beneficiaries,
      bov,
      calculationDate,
      counts.n,
      counts.titulares,
      hasBlockingTitular,
      mandatoryEndAge,
      mandatoryStartAge,
      result,
      retirementPreview,
      voluntaryEndAge,
      voluntaryMonthlyAmount,
      voluntaryStartAge
    ]
  );

  useEffect(() => {
    if (!loading) {
      return;
    }

    if (traceIntervalRef.current) {
      window.clearInterval(traceIntervalRef.current);
    }
    if (traceCompletionRef.current) {
      window.clearTimeout(traceCompletionRef.current);
    }

    const revealTarget = Math.max(traceSteps.length - 1, 1);
    let current = 1;
    setTraceRevealCount(1);
    traceIntervalRef.current = window.setInterval(() => {
      current = Math.min(current + 1, revealTarget);
      setTraceRevealCount(current);
      if (current >= revealTarget && traceIntervalRef.current) {
        window.clearInterval(traceIntervalRef.current);
        traceIntervalRef.current = null;
      }
    }, 260);

    return () => {
      if (traceIntervalRef.current) {
        window.clearInterval(traceIntervalRef.current);
        traceIntervalRef.current = null;
      }
    };
  }, [loading, traceSteps.length]);

  useEffect(() => {
    if (!result) {
      return;
    }

    if (traceCompletionRef.current) {
      window.clearTimeout(traceCompletionRef.current);
    }

    traceCompletionRef.current = window.setTimeout(() => {
      setTraceRevealCount(traceSteps.length);
      traceCompletionRef.current = null;
    }, 180);

    return () => {
      if (traceCompletionRef.current) {
        window.clearTimeout(traceCompletionRef.current);
        traceCompletionRef.current = null;
      }
    };
  }, [result, traceSteps.length]);

  useEffect(() => {
    return () => {
      if (traceIntervalRef.current) {
        window.clearInterval(traceIntervalRef.current);
      }
      if (traceCompletionRef.current) {
        window.clearTimeout(traceCompletionRef.current);
      }
    };
  }, []);

  const runSimulation = handleSubmit(async (formValues) => {
    setLoading(true);
    setError(null);
    setTraceRevealCount(0);

    try {
      const response = await fetch("/api/v1/simulations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formValues)
      });

      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(sanitizeUserError(payload.error ?? "No fue posible ejecutar la simulación."));
        return;
      }

      setResult(payload as SimulationResult);
      setStep(3);
    } catch {
      setResult(null);
      setError("No fue posible ejecutar la simulación. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  });

  const onDownloadPdf = handleSubmit(async (formValues) => {
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
        body: JSON.stringify({ input: formValues, result })
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
  });

  const addBeneficiary = (): void => {
    if (fields.length >= 56) {
      return;
    }

    append(newBeneficiary);
  };

  const canProceedSync = (): boolean => {
    if (step === 0) {
      const allBirthDatesValid = (beneficiaries ?? []).every((item) => Boolean(parseIsoDate(item.birthDate)));
      return !hasBlockingTitular && counts.n <= 12 && allBirthDatesValid;
    }

    if (step === 1) {
      return Boolean(parseIsoDate(calculationDate ?? ""));
    }

    return true;
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 0) {
      const valid = await trigger("beneficiaries");
      return valid && !hasBlockingTitular && counts.n <= 12;
    }

    if (step === 1) {
      return trigger([
        "calculationDate",
        "accountBalance",
        "mandatoryContribution.startAge",
        "mandatoryContribution.endAge",
        "voluntaryContribution.startAge",
        "voluntaryContribution.endAge",
        "voluntaryContribution.monthlyAmount"
      ]);
    }

    if (step === 2) {
      return trigger(["bov"]);
    }

    return true;
  };

  const goNext = async (): Promise<void> => {
    if (step >= steps.length - 1) {
      return;
    }

    const valid = await validateCurrentStep();
    if (valid) {
      setStep((prev) => prev + 1);
    }
  };

  const goPrev = (): void => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
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
                    {fields.map((fieldItem, index) => (
                      <tr key={fieldItem.id}>
                        <td>{index + 1}</td>
                        <td>
                          <select {...register(`beneficiaries.${index}.type`)}>
                            <option value="T">T (Titular)</option>
                            <option value="C">C (Cónyuge/conviviente)</option>
                            <option value="H">H (Hijo)</option>
                          </select>
                        </td>
                        <td>
                          <select
                            {...register(`beneficiaries.${index}.sex`, {
                              setValueAs: (value) => Number(value) as 1 | 2
                            })}
                          >
                            <option value={1}>1 (M)</option>
                            <option value={2}>2 (F)</option>
                          </select>
                        </td>
                        <td className="cms-date-cell">
                          <DateField
                            control={control}
                            name={`beneficiaries.${index}.birthDate` as const}
                            label="Fecha nacimiento"
                            compact
                          />
                        </td>
                        <td>
                          <select
                            {...register(`beneficiaries.${index}.invalid`, {
                              setValueAs: (value) => Number(value) as 0 | 1
                            })}
                          >
                            <option value={0}>0 (No)</option>
                            <option value={1}>1 (Sí)</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-danger"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
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
                  onClick={() => {
                    reset(defaultSimulationInput);
                    setResult(null);
                    setError(null);
                  }}
                >
                  Restaurar datos iniciales
                </button>
              </div>

              <div className="cms-inline-note">
                <span>
                  Resumen: {counts.n} personas | {counts.spouses} cónyuges | {counts.children} hijos
                </span>
              </div>

              {hasBlockingTitular && <div className="cms-status error">Solo se permite un titular (T).</div>}
              {typeof errors.beneficiaries?.message === "string" && (
                <div className="cms-status error">{errors.beneficiaries.message}</div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h2>Fechas y aportes</h2>
              <p>Completá fecha de cálculo, saldo de cuenta y el tramo de aportes para personalizar la proyección.</p>

              <div className="cms-form-grid">
                <DateField control={control} name="calculationDate" label="Fecha de cálculo" />

                <label className="cms-field">
                  Saldo de cuenta
                  <input
                    type="number"
                    {...register("accountBalance", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.accountBalance?.message && (
                    <span className="cms-field-error">{errors.accountBalance.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  Aportes obligatorios - Edad inicio
                  <input
                    type="number"
                    {...register("mandatoryContribution.startAge", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.mandatoryContribution?.startAge?.message && (
                    <span className="cms-field-error">{errors.mandatoryContribution.startAge.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  Aportes obligatorios - Edad fin
                  <input
                    type="number"
                    {...register("mandatoryContribution.endAge", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.mandatoryContribution?.endAge?.message && (
                    <span className="cms-field-error">{errors.mandatoryContribution.endAge.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  Aportes voluntarios - Edad inicio
                  <input
                    type="number"
                    {...register("voluntaryContribution.startAge", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.voluntaryContribution?.startAge?.message && (
                    <span className="cms-field-error">{errors.voluntaryContribution.startAge.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  Aportes voluntarios - Edad fin
                  <input
                    type="number"
                    {...register("voluntaryContribution.endAge", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.voluntaryContribution?.endAge?.message && (
                    <span className="cms-field-error">{errors.voluntaryContribution.endAge.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  Importe mensual aportes voluntarios
                  <input
                    type="number"
                    {...register("voluntaryContribution.monthlyAmount", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.voluntaryContribution?.monthlyAmount?.message && (
                    <span className="cms-field-error">{errors.voluntaryContribution.monthlyAmount.message}</span>
                  )}
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Parámetros</h2>
              <p>Ajustá el valor de referencia del objetivo para obtener una estimación alineada a tu escenario.</p>

              <div className="cms-form-grid">
                <label className="cms-field">
                  BOV
                  <input
                    type="number"
                    {...register("bov", {
                      valueAsNumber: true
                    })}
                  />
                  {errors.bov?.message && <span className="cms-field-error">{errors.bov.message}</span>}
                </label>

                <article className="cms-info-card">
                  <h3>Base técnica activa</h3>
                  <p>La simulación utiliza parámetros vigentes para proyectar resultados de forma consistente.</p>
                  <span className="cms-tag">VERSION 2025</span>
                </article>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Resultados</h2>
              <p>Ejecutá la simulación y revisá los indicadores clave del escenario configurado.</p>

              <div className="cms-results-layout">
                <section className="cms-results-column">
                  <div className="cms-results-compact">
                    <div className="cms-actions-row">
                      <button
                        type="button"
                        className="cms-btn cms-btn-main"
                        disabled={loading || hasBlockingTitular || counts.n > 12}
                        onClick={() => void runSimulation()}
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

                    {result ? (
                      <>
                        <div className="cms-kpi-strip">
                          <article className="cms-kpi-item">
                            <span>PPUU Acumulados</span>
                            <strong>{formatNumber(result.ppuu)}</strong>
                          </article>
                          <article className="cms-kpi-item">
                            <span>Beneficio Mensual Proyectado</span>
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
                    ) : (
                      <div className="cms-inline-note">
                        <span>Sin resultados todavía.</span>
                        <span>Ejecutá la simulación para generar la proyección mensual estimada.</span>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="cms-trace-column">
                  <h3>Bitácora del cálculo</h3>
                  <ol className="cms-trace-list">
                    {traceSteps.map((traceStep, index) => {
                      const isVisible = index < traceRevealCount;
                      const isActive = loading && index === traceRevealCount - 1;
                      return (
                        <li
                          key={traceStep.title}
                          className={`cms-trace-item ${isVisible ? "visible" : ""} ${isActive ? "active" : ""}`}
                        >
                          <span className="cms-trace-number">{index + 1}.</span>
                          <div className="cms-trace-body">
                            <p className="cms-trace-title">{traceStep.title}</p>
                            <p>
                              <strong>Parámetros:</strong> {traceStep.parameters}
                            </p>
                            <p>
                              <strong>Fórmula / regla:</strong> {traceStep.formula}
                            </p>
                            <p>
                              <strong>Resultado:</strong> {traceStep.outcome}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="cms-trace-footer">Cálculo realizado en tiempo real</p>
                </aside>
              </div>

              {counts.n > 12 && (
                <div className="cms-status error">
                  El escenario supera el límite operativo de esta versión (máximo 12 beneficiarios por cálculo).
                </div>
              )}

              {error && <div className="cms-status error">{error}</div>}
            </>
          )}

          <div className="cms-wizard-nav">
            <button type="button" className="cms-btn cms-btn-soft" onClick={goPrev} disabled={step === 0}>
              Anterior
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-main"
              onClick={() => void goNext()}
              disabled={step === steps.length - 1 || !canProceedSync()}
            >
              Siguiente
            </button>
          </div>
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
