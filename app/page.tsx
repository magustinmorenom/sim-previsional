"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useController,
  useFieldArray,
  useForm,
  useWatch,
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

const steps = ["Grupo familiar", "Edades y aportes", "Parámetros", "Resultados"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WHAT_IF_STEP = 100000;
const WHAT_IF_SCENARIOS = 8;
const WHAT_IF_TICKS = 5;

const resultFaqQuestions = [
  "¿Cuánto representa el beneficio mensual estimado?",
  "¿Este valor está en términos actuales o ajusta inflación?",
  "¿Desde qué fecha empezaría a cobrar?",
  "¿Qué parte depende de mis datos y qué parte de supuestos técnicos?",
  "¿Cuánto cambia el resultado si modifico VAR o años de aporte?",
  "¿Qué efecto tiene aumentar el aporte voluntario mensual?",
  "¿Cómo impacta mi grupo familiar en el cálculo?",
  "¿Qué es el PPUU y por qué aparece en el resultado?",
  "¿Qué tan confiable es este resultado?",
  "¿Estoy por encima o por debajo de mi objetivo?"
] as const;

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

function ageInYearsOnDate(birthDateIso: string, referenceDateIso: string): number | null {
  const birth = parseIsoDate(birthDateIso);
  const reference = parseIsoDate(referenceDateIso);

  if (!birth || !reference) {
    return null;
  }

  let age = reference.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    reference.getMonth() < birth.getMonth() ||
    (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return Math.max(0, age);
}

type TraceStep = {
  title: string;
  parameters: ReactNode;
  formula: ReactNode;
  outcome: ReactNode;
};

type WhatIfRow = {
  monthlyAmount: number;
  projectedBenefit: number;
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
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const showFaq = false;
  const [traceRevealCount, setTraceRevealCount] = useState(0);
  const [whatIfRows, setWhatIfRows] = useState<WhatIfRow[]>([]);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const traceIntervalRef = useRef<number | null>(null);
  const traceCompletionRef = useRef<number | null>(null);
  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const defaultValues = useMemo<SimulationInput>(
    () => ({
      ...defaultSimulationInput,
      calculationDate: todayIso
    }),
    [todayIso]
  );
  const zeroValues = useMemo<SimulationInput>(
    () => ({
      calculationDate: todayIso,
      accountBalance: 0,
      bov: 0,
      mandatoryContribution: {
        startAge: 0,
        endAge: 0
      },
      voluntaryContribution: {
        startAge: 0,
        endAge: 0,
        monthlyAmount: 0
      },
      beneficiaries: [
        {
          type: "T",
          sex: 1,
          birthDate: todayIso,
          invalid: 0
        }
      ]
    }),
    [todayIso]
  );

  const {
    control,
    register,
    setValue,
    reset,
    trigger,
    handleSubmit,
    formState: { errors }
  } = useForm<SimulationInput>({
    resolver: zodResolver(simulationInputSchema),
    defaultValues,
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "beneficiaries"
  });

  const beneficiaries = useWatch({ control, name: "beneficiaries" });
  const calculationDate = useWatch({ control, name: "calculationDate" });
  const mandatoryStartAge = useWatch({ control, name: "mandatoryContribution.startAge" });
  const voluntaryStartAge = useWatch({ control, name: "voluntaryContribution.startAge" });
  const voluntaryEndAge = useWatch({ control, name: "voluntaryContribution.endAge" });
  const voluntaryMonthlyAmount = useWatch({ control, name: "voluntaryContribution.monthlyAmount" });
  const accountBalance = useWatch({ control, name: "accountBalance" });
  const varValue = useWatch({ control, name: "bov" });

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

  useEffect(() => {
    if (calculationDate !== todayIso) {
      setValue("calculationDate", todayIso, { shouldDirty: false, shouldValidate: true });
    }
  }, [calculationDate, setValue, todayIso]);

  const titularBirthDate = beneficiaries?.find((item) => item.type === "T")?.birthDate ?? null;
  const currentAge = titularBirthDate ? ageInYearsOnDate(titularBirthDate, calculationDate || todayIso) : null;

  useEffect(() => {
    const nextAge = currentAge ?? 0;

    if (mandatoryStartAge !== nextAge) {
      setValue("mandatoryContribution.startAge", nextAge, {
        shouldDirty: false,
        shouldValidate: true
      });
    }

    if (voluntaryStartAge !== nextAge) {
      setValue("voluntaryContribution.startAge", nextAge, {
        shouldDirty: false,
        shouldValidate: true
      });
    }
  }, [currentAge, mandatoryStartAge, setValue, voluntaryStartAge]);

  const retirementPreview = useMemo(
    () => estimateRetirementDate(beneficiaries, calculationDate) ?? "pendiente",
    [beneficiaries, calculationDate]
  );

  const voluntaryMonths = useMemo(() => {
    if (
      typeof voluntaryStartAge !== "number" ||
      Number.isNaN(voluntaryStartAge) ||
      typeof voluntaryEndAge !== "number" ||
      Number.isNaN(voluntaryEndAge)
    ) {
      return 0;
    }

    const years = Math.max(0, voluntaryEndAge - voluntaryStartAge);
    return years * 12;
  }, [voluntaryEndAge, voluntaryStartAge]);

  const voluntaryNominalContribution = useMemo(() => {
    if (typeof voluntaryMonthlyAmount !== "number" || Number.isNaN(voluntaryMonthlyAmount)) {
      return 0;
    }

    return Math.max(0, voluntaryMonthlyAmount) * voluntaryMonths;
  }, [voluntaryMonthlyAmount, voluntaryMonths]);

  const benefitAnnual = result ? result.projectedBenefit * 12 : 0;
  const benefitVsVarPct =
    result && varValue > 0 ? (result.projectedBenefit / varValue) * 100 : null;
  const balanceGrowthPct =
    result && accountBalance > 0 ? ((result.finalBalance - accountBalance) / accountBalance) * 100 : null;
  const maxWhatIfBenefit = useMemo(
    () => whatIfRows.reduce((max, row) => Math.max(max, row.projectedBenefit), 0),
    [whatIfRows]
  );
  const minWhatIfBenefit = useMemo(() => {
    if (whatIfRows.length === 0) {
      return 0;
    }

    return whatIfRows.reduce((min, row) => Math.min(min, row.projectedBenefit), whatIfRows[0].projectedBenefit);
  }, [whatIfRows]);
  const [hoveredWhatIfIndex, setHoveredWhatIfIndex] = useState<number | null>(null);
  const whatIfTickValues = useMemo(() => {
    if (maxWhatIfBenefit <= 0) {
      return Array.from({ length: WHAT_IF_TICKS }, () => 0);
    }

    const step = maxWhatIfBenefit / (WHAT_IF_TICKS - 1);
    return Array.from({ length: WHAT_IF_TICKS }, (_, index) => maxWhatIfBenefit - index * step);
  }, [maxWhatIfBenefit]);

  const resultFaqItems = useMemo(
    () => [
      {
        question: resultFaqQuestions[0],
        answer: (
          <>
            Es el monto mensual estimado para tu jubilación. En este escenario, el valor es{" "}
            {tracePill(result ? formatCurrency(result.projectedBenefit) : "pendiente", "result")} por mes, que
            equivale a {tracePill(result ? formatCurrency(benefitAnnual) : "pendiente", "calc")} por año (12 meses).
          </>
        )
      },
      {
        question: resultFaqQuestions[1],
        answer: (
          <>
            Está expresado con las bases técnicas vigentes y su actualización operativa se refleja con la distribución
            cuatrimestral de la rentabilidad de los rendimientos de la Caja. Ejemplo simple: si la inflación anual
            fuera {tracePill("60%", "param")}, mantener poder de compra requeriría subir de{" "}
            {tracePill("$100.000", "result")} a {tracePill("$160.000", "result")} en 12 meses.
          </>
        )
      },
      {
        question: resultFaqQuestions[2],
        answer: (
          <>
            El cobro se proyecta desde la fecha de jubilación estimada:{" "}
            {tracePill(result?.retirementDate ?? retirementPreview, "result")}. Esa fecha surge al comparar fecha de
            cálculo vs. cumplimiento de 65 años.
          </>
        )
      },
      {
        question: resultFaqQuestions[3],
        answer: (
          <>
            Tus datos (edades, grupo, aportes, saldo y VAR) definen el escenario. Las bases técnicas aplican la
            transformación actuarial. En este caso usamos {tracePill(`${counts.n} personas`, "param")},{" "}
            {tracePill("tasa 4%", "param")} y tablas vigentes para llegar al resultado.
          </>
        )
      },
      {
        question: resultFaqQuestions[4],
        answer: (
          <>
            Regla práctica: subir VAR o extender años de aporte tiende a subir el beneficio. Hoy tenés{" "}
            {tracePill(`VAR ${formatCurrency(varValue || 0)}`, "param")} y un beneficio estimado de{" "}
            {tracePill(result ? formatCurrency(result.projectedBenefit) : "pendiente", "result")}. Si aumentás VAR en{" "}
            {tracePill("10%", "calc")}, esperá un impacto positivo al recalcular.
          </>
        )
      },
      {
        question: resultFaqQuestions[5],
        answer: (
          <>
            El aporte voluntario suma capital antes del retiro. Con tu configuración actual serían{" "}
            {tracePill(`${formatNumber(voluntaryMonths)} meses`, "param")} x{" "}
            {tracePill(formatCurrency(voluntaryMonthlyAmount || 0), "param")} ={" "}
            {tracePill(formatCurrency(voluntaryNominalContribution), "result")} nominales (sin rendimiento). A mayor
            aporte mensual, mayor beneficio esperado.
          </>
        )
      },
      {
        question: resultFaqQuestions[6],
        answer: (
          <>
            El grupo familiar modifica cobertura y probabilidades actuariales. Hoy el escenario tiene{" "}
            {tracePill(`${counts.spouses} cónyuge(s)`, "param")} y {tracePill(`${counts.children} hijo(s)`, "param")}.
            Si agregás beneficiarios, el PPUU puede subir o bajar según composición y edades.
          </>
        )
      },
      {
        question: resultFaqQuestions[7],
        answer: (
          <>
            El PPUU es el divisor actuarial del saldo. En este caso: {tracePill(formatNumber(result?.ppuu ?? 0), "param")}{" "}
            y la relación es {tracePill("beneficio = saldo final / PPUU", "calc")}. Si el PPUU sube, el beneficio
            mensual tiende a bajar; si baja, el beneficio tiende a subir.
          </>
        )
      },
      {
        question: resultFaqQuestions[8],
        answer: (
          <>
            Es una proyección técnica útil para comparar escenarios, no una promesa de cobro exacto. Tomala como guía
            de decisión: hoy el resultado refleja tus datos actuales y{" "}
            {tracePill(`${result?.trace.warnings.length ?? 0} advertencias`, "param")}.
          </>
        )
      },
      {
        question: resultFaqQuestions[9],
        answer: (
          <>
            Compará beneficio proyectado contra tu objetivo mensual (VAR). Escenario actual: beneficio{" "}
            {tracePill(result ? formatCurrency(result.projectedBenefit) : "pendiente", "result")} vs VAR{" "}
            {tracePill(formatCurrency(varValue || 0), "param")}. Cobertura aproximada:{" "}
            {tracePill(benefitVsVarPct !== null ? formatPercent(benefitVsVarPct) : "pendiente", "calc")}.
          </>
        )
      }
    ],
    [
      benefitAnnual,
      benefitVsVarPct,
      counts.children,
      counts.n,
      counts.spouses,
      result,
      retirementPreview,
      varValue,
      voluntaryMonthlyAmount,
      voluntaryMonths,
      voluntaryNominalContribution
    ]
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
            Tomamos saldo actual {tracePill(formatCurrency(accountBalance || 0), "param")}, VAR{" "}
            {tracePill(formatCurrency(varValue || 0), "param")}, rango voluntario{" "}
            {tracePill(`${voluntaryStartAge}-${voluntaryEndAge}`, "param")} y aporte mensual{" "}
            {tracePill(formatCurrency(voluntaryMonthlyAmount || 0), "param")}.
          </>
        ),
        formula: (
          <>
            Proyectamos el saldo acumulando al retiro, sumando el componente por VAR y el efecto de aportes voluntarios
            según rango configurado. Referencia rápida: {tracePill(`${formatNumber(voluntaryMonths)} meses`, "calc")} x{" "}
            {tracePill(formatCurrency(voluntaryMonthlyAmount || 0), "calc")} ={" "}
            {tracePill(formatCurrency(voluntaryNominalContribution), "calc")} nominales.
          </>
        ),
        outcome: result
          ? (
            <>
              Saldo final interno: {tracePill(formatCurrency(result.finalBalance), "result")}. Variación vs saldo
              actual: {tracePill(balanceGrowthPct !== null ? formatPercent(balanceGrowthPct) : "sin referencia", "result")}.
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
      balanceGrowthPct,
      beneficiaries,
      calculationDate,
      counts.n,
      counts.titulares,
      hasBlockingTitular,
      result,
      retirementPreview,
      varValue,
      voluntaryEndAge,
      voluntaryMonthlyAmount,
      voluntaryNominalContribution,
      voluntaryMonths,
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

  const requestSimulation = async (input: SimulationInput): Promise<SimulationResult> => {
    const response = await fetch("/api/v1/simulations/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const apiError =
        typeof payload === "object" && payload && "error" in payload
          ? (payload as { error?: string }).error
          : undefined;
      throw new Error(sanitizeUserError(apiError ?? "No fue posible ejecutar la simulación."));
    }

    return payload as SimulationResult;
  };

  const buildWhatIfRows = (baseInput: SimulationInput, baseResult: SimulationResult): WhatIfRow[] => {
    const baseMonthlyAmount =
      typeof baseInput.voluntaryContribution.monthlyAmount === "number" &&
      Number.isFinite(baseInput.voluntaryContribution.monthlyAmount)
        ? Math.max(0, baseInput.voluntaryContribution.monthlyAmount)
        : 0;
    const contributionMonths =
      Math.max(0, baseInput.voluntaryContribution.endAge - baseInput.voluntaryContribution.startAge) * 12;
    const ppuuSafe = baseResult.ppuu > 0 ? baseResult.ppuu : 1;

    const scenarios = Array.from({ length: WHAT_IF_SCENARIOS }, (_, index) => baseMonthlyAmount + index * WHAT_IF_STEP);
    return scenarios.map((monthlyAmount) => {
      const extraContribution = (monthlyAmount - baseMonthlyAmount) * contributionMonths;
      const estimatedFinalBalance = baseResult.finalBalance + extraContribution;
      return {
        monthlyAmount,
        projectedBenefit: Math.max(0, estimatedFinalBalance / ppuuSafe)
      };
    });
  };

  const runSimulation = handleSubmit(async (formValues) => {
    setLoading(true);
    setError(null);
    setTraceRevealCount(0);
    setWhatIfLoading(true);
    setWhatIfError(null);
    setWhatIfRows([]);
    setHoveredWhatIfIndex(null);

    try {
      const simulationResult = await requestSimulation(formValues);
      setResult(simulationResult);
      setStep(3);
      setWhatIfRows(buildWhatIfRows(formValues, simulationResult));
    } catch (cause) {
      setResult(null);
      setWhatIfRows([]);
      const message = cause instanceof Error ? cause.message : "No fue posible ejecutar la simulación.";
      setError(sanitizeUserError(message));
    } finally {
      setLoading(false);
      setWhatIfLoading(false);
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
          <div className="cms-header-copy">
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
          </div>
          <div className="cms-header-logo-wrap" aria-hidden="true">
            <img src="/cps-logo.svg" alt="CPS PCEER" className="cms-header-logo" />
          </div>
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
                    reset(defaultValues);
                    setResult(null);
                    setError(null);
                    setIsTraceOpen(false);
                    setWhatIfRows([]);
                    setWhatIfError(null);
                    setWhatIfLoading(false);
                    setHoveredWhatIfIndex(null);
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
              <h2>Edades y aportes</h2>
              <p>Completá saldo de cuenta y el tramo de aportes para personalizar la proyección.</p>

              <div className="cms-form-grid">
                <label className="cms-field">
                  Fecha de cálculo
                  <span className="cms-chip cms-chip-primary">
                    {formatIsoToDisplay(calculationDate || todayIso)}
                  </span>
                  <input type="hidden" {...register("calculationDate")} />
                  {errors.calculationDate?.message && (
                    <span className="cms-field-error">{errors.calculationDate.message}</span>
                  )}
                </label>

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
                  <span className="cms-chip cms-chip-primary">
                    {typeof currentAge === "number" && !Number.isNaN(currentAge) ? currentAge : "-"}
                  </span>
                  {errors.mandatoryContribution?.startAge?.message && (
                    <span className="cms-field-error">{errors.mandatoryContribution.startAge.message}</span>
                  )}
                </label>

                <label className="cms-field">
                  <span className="cms-field-label-row">
                    <span>Aportes obligatorios - Edad fin</span>
                    <span className="cms-chip cms-chip-neutral">Edad de jubilación</span>
                  </span>
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
                  <span className="cms-chip cms-chip-primary">
                    {typeof currentAge === "number" && !Number.isNaN(currentAge) ? currentAge : "-"}
                  </span>
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
                  <span className="cms-field-label-row">
                    <span>Importe mensual aportes voluntarios</span>
                    <span
                      className="cms-tooltip-trigger"
                      tabIndex={0}
                      aria-label="Información sobre importe mensual de aportes voluntarios"
                      data-tooltip="Simula el aporte mensual de aportes voluntarios hasta la edad que elijas, usualmente la misma edad que se jubila. Luego ves como impacta en el resultado."
                    >
                      ?
                    </span>
                  </span>
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
                  VAR
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
              <div className="cms-results-topbar">
                <button
                  type="button"
                  className="cms-btn cms-btn-soft cms-btn-mini"
                  onClick={() => setIsTraceOpen(true)}
                >
                  Mostrar bitácora de cálculo
                </button>
              </div>

              <div className="cms-results-layout">
                <section className="cms-results-column">
                  <div className="cms-results-compact">
                    <div className="cms-actions-row cms-results-actions">
                      <button
                        type="button"
                        className="cms-btn cms-btn-main cms-btn-run"
                        disabled={loading || hasBlockingTitular || counts.n > 12}
                        onClick={() => void runSimulation()}
                      >
                        <span className="cms-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 20 20" focusable="false">
                            <path d="M6 4L16 10L6 16V4Z" />
                          </svg>
                        </span>
                        {loading ? "Calculando..." : "Ejecutar simulación"}
                      </button>

                      <button
                        type="button"
                        className="cms-btn cms-btn-secondary"
                        disabled={!result || downloadingPdf}
                        onClick={() => void onDownloadPdf()}
                      >
                        <span className="cms-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 20 20" focusable="false">
                            <path d="M12 2H6C4.9 2 4 2.9 4 4V16C4 17.1 4.9 18 6 18H14C15.1 18 16 17.1 16 16V6L12 2Z" />
                            <path d="M12 2V6H16" />
                            <path d="M7.5 11H12.5" />
                            <path d="M7.5 14H11.5" />
                          </svg>
                        </span>
                        {downloadingPdf ? "Generando PDF..." : "Exportar PDF"}
                      </button>
                    </div>

                    {result ? (
                      <>
                        <div className="cms-kpi-strip">
                          <article className="cms-kpi-item">
                            <span>PPUU Acumulados</span>
                            <strong>{formatNumber(result.ppuu, 2)}</strong>
                          </article>
                          <article className="cms-kpi-item cms-kpi-item-primary">
                            <span>Beneficio Mensual Proyectado</span>
                            <strong>{formatCurrency(result.projectedBenefit)}</strong>
                          </article>
                        </div>

                        <div className="cms-info-chips">
                          <span className="cms-chip">Fecha de jubilación: {result.retirementDate}</span>
                          <span className="cms-chip">
                            Grupo: {result.counts.n} personas ({result.counts.spouses} cónyuges, {result.counts.children} hijos)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="cms-info-chips">
                        <span className="cms-chip">Sin resultados todavía.</span>
                        <span className="cms-chip">Ejecutá la simulación para generar la proyección mensual estimada.</span>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="cms-analysis-column">
                  <h3>Análisis What-If</h3>

                  {whatIfLoading && (
                    <div className="cms-inline-note">
                      <span>Calculando escenarios de variabilidad...</span>
                    </div>
                  )}

                  {whatIfError && <div className="cms-status error">{whatIfError}</div>}

                  {!whatIfLoading && !whatIfError && whatIfRows.length > 0 && (
                    <div className="cms-whatif-stack">
                      <div className="cms-whatif-table-wrap">
                        <table className="cms-whatif-table">
                          <thead>
                            <tr>
                              <th>Aporte voluntario mensual</th>
                              <th>Beneficio proyectado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {whatIfRows.map((row) => (
                              <tr key={row.monthlyAmount}>
                                <td>{formatCurrency(row.monthlyAmount)}</td>
                                <td>{formatCurrency(row.projectedBenefit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="cms-whatif-chart">
                        <p>Gráfico de barras</p>
                        <div className="cms-whatif-meta">
                          <span>Mínimo: {formatCurrency(minWhatIfBenefit)}</span>
                          <span>Máximo: {formatCurrency(maxWhatIfBenefit)}</span>
                        </div>
                        <div className="cms-whatif-plot">
                          <div className="cms-whatif-yaxis">
                            {whatIfTickValues.map((tickValue, index) => (
                              <span key={`tick-${index}`}>{formatCurrency(tickValue)}</span>
                            ))}
                          </div>
                          <div className="cms-whatif-bars-wrap">
                            <div className="cms-whatif-grid-lines" aria-hidden="true" />
                            <div className="cms-whatif-bars">
                              {whatIfRows.map((row, index) => {
                                const baseBenefit = whatIfRows[0]?.projectedBenefit ?? 0;
                                const delta = row.projectedBenefit - baseBenefit;
                                const deltaPct = baseBenefit > 0 ? (delta / baseBenefit) * 100 : 0;
                                const ratio = maxWhatIfBenefit > 0 ? row.projectedBenefit / maxWhatIfBenefit : 0;
                                const height = 24 + ratio * 120;
                                return (
                                  <button
                                    type="button"
                                    key={`bar-${row.monthlyAmount}`}
                                    className="cms-whatif-bar-item"
                                    onMouseEnter={() => setHoveredWhatIfIndex(index)}
                                    onMouseLeave={() => setHoveredWhatIfIndex(null)}
                                    onFocus={() => setHoveredWhatIfIndex(index)}
                                    onBlur={() => setHoveredWhatIfIndex(null)}
                                    aria-label={`${formatCurrency(row.monthlyAmount)}: beneficio ${formatCurrency(row.projectedBenefit)}`}
                                  >
                                    <div className="cms-whatif-bar-track">
                                      <div className="cms-whatif-bar-fill" style={{ height: `${height}px` }} />
                                    </div>
                                    {hoveredWhatIfIndex === index && (
                                      <div className="cms-whatif-tooltip">
                                        <strong>{formatCurrency(row.monthlyAmount)}</strong>
                                        <span>Beneficio: {formatCurrency(row.projectedBenefit)}</span>
                                        <span>
                                          Variación: {delta >= 0 ? "+" : ""}
                                          {formatCurrency(delta)} ({formatSignedPercent(deltaPct)})
                                        </span>
                                      </div>
                                    )}
                                    <span>{formatKLabel(row.monthlyAmount)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!whatIfLoading && !whatIfError && whatIfRows.length === 0 && (
                    <div className="cms-inline-note">
                      <span>Ejecutá la simulación para generar el análisis What-If.</span>
                    </div>
                  )}
                </aside>
              </div>
              {showFaq && (
                <article className="cms-faq-card cms-faq-standalone">
                  <button
                    type="button"
                    className="cms-section-chip-toggle cms-section-chip-toggle-wide"
                    aria-expanded={isFaqOpen}
                    onClick={() => setIsFaqOpen((prev) => !prev)}
                  >
                    {isFaqOpen ? "Ocultar preguntas frecuentes" : "Preguntas frecuentes sobre el resultado"}
                  </button>
                  {isFaqOpen && (
                    <div className="cms-faq-list">
                      {resultFaqItems.map((item, index) => {
                        const isOpen = openFaqIndex === index;
                        return (
                          <div key={item.question} className={`cms-faq-item ${isOpen ? "open" : ""}`}>
                            <button
                              type="button"
                              className="cms-faq-trigger"
                              aria-expanded={isOpen}
                              onClick={() => setOpenFaqIndex((prev) => (prev === index ? null : index))}
                            >
                              <span>{item.question}</span>
                              <span className="cms-faq-chevron" aria-hidden="true">
                                ▾
                              </span>
                            </button>
                            <div className="cms-faq-panel">
                              <div className="cms-faq-content">
                                <p>{item.answer}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              )}

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
            {step === steps.length - 1 ? (
              <button
                type="button"
                className="cms-btn cms-btn-main"
                onClick={() => {
                  reset(zeroValues);
                  setResult(null);
                  setError(null);
                  setIsTraceOpen(false);
                  setTraceRevealCount(0);
                  setWhatIfRows([]);
                  setWhatIfError(null);
                  setWhatIfLoading(false);
                  setHoveredWhatIfIndex(null);
                  setStep(0);
                }}
              >
                Realizar nueva simulación
              </button>
            ) : (
              <button
                type="button"
                className="cms-btn cms-btn-main"
                onClick={() => void goNext()}
                disabled={!canProceedSync()}
              >
                Siguiente
              </button>
            )}
          </div>

          {step === 3 && (
            <>
              <div
                className={`cms-trace-drawer-backdrop ${isTraceOpen ? "open" : ""}`}
                onClick={() => setIsTraceOpen(false)}
              />
              <aside className={`cms-trace-drawer ${isTraceOpen ? "open" : ""}`} aria-hidden={!isTraceOpen}>
                <div className="cms-trace-head">
                  <h3>Bitácora del cálculo</h3>
                  <button type="button" className="cms-btn cms-btn-soft cms-btn-mini" onClick={() => setIsTraceOpen(false)}>
                    Cerrar
                  </button>
                </div>
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

function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1
  }).format(value) + "%";
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function formatKLabel(value: number): string {
  if (value < 1000) {
    return formatNumber(value);
  }

  return `${formatNumber(value / 1000)}k`;
}
