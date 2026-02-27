"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildSimulationInputFromContext,
  validateEditableSimulationValues,
  type EditableSimulationValidationResult,
  type EditableSimulationValues
} from "@/lib/simulation/build-simulation-input";
import type { AffiliateSimulationContext } from "@/lib/types/affiliate-context";
import type {
  AuthChallengeResponse,
  SessionInfo
} from "@/lib/types/auth";
import type {
  SimulationInput,
  SimulationResult,
  SolidaryStatus
} from "@/lib/types/simulation";

const WHAT_IF_STEP = 100000;
const WHAT_IF_SCENARIOS = 8;
const WHAT_IF_TICKS = 5;
const EDITABLE_AGE_OPTIONS = [65, 66, 67, 68, 69, 70] as const;
const VOLUNTARY_CONTRIBUTION_STEPS = [50000, 100000, 200000, 400000, 800000] as const;
const VOLUNTARY_END_AGE_DEFAULT = 65;

type EditableFormState = {
  voluntaryMonthlyAmount: string;
  retirementAge: string;
  voluntaryEndAge: string;
};

type WhatIfRow = {
  monthlyAmount: number;
  projectedBenefit: number;
};

type AuthenticatedSession = Extract<SessionInfo, { authenticated: true }>;

export default function HomePage() {
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [credentials, setCredentials] = useState({
    email: ""
  });
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [context, setContext] = useState<AffiliateSimulationContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [formState, setFormState] = useState<EditableFormState | null>(null);
  const [formErrors, setFormErrors] = useState<EditableSimulationValidationResult>({});

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [whatIfRows, setWhatIfRows] = useState<WhatIfRow[]>([]);
  const [hoveredWhatIfIndex, setHoveredWhatIfIndex] = useState<number | null>(null);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (!session) {
      setContext(null);
      setFormState(null);
      setContextError(null);
      setResult(null);
      setError(null);
      setWhatIfRows([]);
      return;
    }

    void loadSimulationContext();
  }, [session]);

  const counts = useMemo(() => {
    const items = context?.beneficiaries ?? [];
    const titulares = items.filter((item) => item.type === "T").length;
    const spouses = items.filter((item) => item.type === "C").length;
    const children = items.filter((item) => item.type === "H").length;

    return {
      titulares,
      spouses,
      children,
      total: items.length
    };
  }, [context?.beneficiaries]);

  const titular = useMemo(
    () => context?.beneficiaries.find((item) => item.type === "T") ?? null,
    [context?.beneficiaries]
  );

  const titularAge = useMemo(() => {
    if (!titular) {
      return null;
    }

    return calculateAgeFromIso(titular.birthDate);
  }, [titular]);

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

  const whatIfTickValues = useMemo(() => {
    if (maxWhatIfBenefit <= 0) {
      return Array.from({ length: WHAT_IF_TICKS }, () => 0);
    }

    const step = maxWhatIfBenefit / (WHAT_IF_TICKS - 1);
    return Array.from({ length: WHAT_IF_TICKS }, (_, index) => maxWhatIfBenefit - index * step);
  }, [maxWhatIfBenefit]);

  const voluntaryEndAgeLimits = useMemo(() => {
    const selectedRetirementAge = toFiniteNumber(formState?.retirementAge ?? "");
    const fallbackRetirementAge = EDITABLE_AGE_OPTIONS[0];
    const retirementAge = Number.isFinite(selectedRetirementAge)
      ? Math.max(fallbackRetirementAge, Math.trunc(selectedRetirementAge))
      : fallbackRetirementAge;
    const currentAge = titularAge ?? context?.voluntaryContribution.startAge ?? 0;

    return buildVoluntaryEndAgeLimits(retirementAge, currentAge);
  }, [context?.voluntaryContribution.startAge, formState?.retirementAge, titularAge]);

  const voluntaryEndAgeOptions = useMemo(() => {
    const count = Math.max(0, voluntaryEndAgeLimits.max - voluntaryEndAgeLimits.min) + 1;
    return Array.from({ length: count }, (_, index) => voluntaryEndAgeLimits.min + index);
  }, [voluntaryEndAgeLimits.max, voluntaryEndAgeLimits.min]);

  async function restoreSession(): Promise<void> {
    setSessionLoading(true);

    try {
      const response = await fetch("/api/v1/auth/sessions", {
        method: "GET"
      });

      if (!response.ok) {
        setSession(null);
        return;
      }

      const payload = (await response.json()) as SessionInfo;
      if (!payload.authenticated) {
        setSession(null);
        return;
      }

      setSession(payload);
      setCredentials({
        email: payload.email
      });
    } catch {
      setSession(null);
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadSimulationContext(): Promise<void> {
    setContextLoading(true);
    setContextError(null);

    try {
      const response = await fetch("/api/v1/affiliates/me/simulation-context", {
        method: "GET"
      });

      const payload = await safeReadJson(response);

      if (!response.ok) {
        const message = readErrorMessage(payload, "No fue posible cargar los datos del afiliado.");
        setContext(null);
        setFormState(null);
        setContextError(message);
        return;
      }

      const nextContext = payload as AffiliateSimulationContext;
      setContext(nextContext);
      setFormState({
        voluntaryMonthlyAmount: "0",
        retirementAge: String(nextContext.mandatoryContribution.endAgeDefault),
        voluntaryEndAge: String(VOLUNTARY_END_AGE_DEFAULT)
      });
      setResult(null);
      setError(null);
      setWhatIfRows([]);
      setFormErrors({});
    } catch {
      setContext(null);
      setFormState(null);
      setContextError("No fue posible cargar los datos del afiliado.");
    } finally {
      setContextLoading(false);
    }
  }

  async function handleChallengeRequest(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });

      const payload = await safeReadJson(response);

      if (!response.ok) {
        setAuthError(readErrorMessage(payload, "No fue posible enviar el código de verificación."));
        return;
      }

      const nextChallenge = payload as AuthChallengeResponse;
      setChallenge(nextChallenge);
      setOtpCode("");
    } catch {
      setAuthError("No fue posible iniciar el desafío del código de un solo uso.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOtpVerification(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!challenge) {
      setAuthError("Primero solicitá un código de verificación.");
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setAuthError("Ingresá un código de un solo uso de 6 dígitos.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/v1/auth/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          code: otpCode.trim()
        })
      });

      const payload = await safeReadJson(response);

      if (!response.ok) {
        setAuthError(readErrorMessage(payload, "No fue posible validar el código de un solo uso."));
        return;
      }

      setChallenge(null);
      setOtpCode("");
      await restoreSession();
    } catch {
      setAuthError("No fue posible validar el código de un solo uso.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleResendOtp(): Promise<void> {
    if (authLoading) {
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });

      const payload = await safeReadJson(response);

      if (!response.ok) {
        setAuthError(readErrorMessage(payload, "No fue posible reenviar el código de un solo uso."));
        return;
      }

      const nextChallenge = payload as AuthChallengeResponse;
      setChallenge(nextChallenge);
      setOtpCode("");
    } catch {
      setAuthError("No fue posible reenviar el código de un solo uso.");
    } finally {
      setAuthLoading(false);
    }
  }

  function updateVoluntaryAmountInput(rawValue: string): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        voluntaryMonthlyAmount: normalizeAmountInput(rawValue)
      };
    });
  }

  function applyVoluntaryContributionStep(step: number): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const parsed = parseAmountInput(current.voluntaryMonthlyAmount);
      const safeAmount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

      return {
        ...current,
        voluntaryMonthlyAmount: formatAmountInput(Math.round(safeAmount + step))
      };
    });
  }

  function setRetirementAgeFromQuickPicker(age: number): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const parsedVoluntaryEndAge = toFiniteNumber(current.voluntaryEndAge);
      const currentAge = titularAge ?? context?.voluntaryContribution.startAge ?? 0;
      const limits = buildVoluntaryEndAgeLimits(age, currentAge);
      const nextVoluntaryEndAge = clampInteger(
        parsedVoluntaryEndAge,
        limits.min,
        limits.max,
        Math.min(Math.max(VOLUNTARY_END_AGE_DEFAULT, limits.min), limits.max)
      );

      return {
        ...current,
        retirementAge: String(age),
        voluntaryEndAge: String(nextVoluntaryEndAge)
      };
    });
  }

  function updateVoluntaryEndAgeSelection(rawValue: string): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        voluntaryEndAge: rawValue
      };
    });
  }

  function isQuickAgeSelected(rawValue: string, option: number): boolean {
    return toFiniteNumber(rawValue) === option;
  }

  async function runSimulation(): Promise<void> {
    if (!context || !formState) {
      return;
    }

    const parsedValues = parseEditableFormState(formState);
    const nextErrors = validateEditableSimulationValues(context, parsedValues);

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const input = buildSimulationInputFromContext(context, parsedValues);

    setLoading(true);
    setError(null);
    setResult(null);
    setWhatIfRows([]);
    setHoveredWhatIfIndex(null);

    try {
      const response = await fetch("/api/v1/simulations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      const payload = await safeReadJson(response);

      if (!response.ok) {
        const message = readErrorMessage(payload, "No fue posible ejecutar la simulación.");
        throw new Error(sanitizeUserError(message));
      }

      const simulationResult = payload as SimulationResult;
      setResult(simulationResult);
      setWhatIfRows(buildWhatIfRows(input, simulationResult));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible ejecutar la simulación.";
      setError(sanitizeUserError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="anx-panel af-app-shell">
        <header className="af-header">
          <div>
            <h1>Simulador Previsional</h1>
            <p>Acceso y simulación en una sola vista.</p>
          </div>
        </header>

        {sessionLoading && (
          <article className="af-card af-loading-card">
            <h2>Validando sesión</h2>
            <p>Estamos verificando tu acceso.</p>
          </article>
        )}

        {!sessionLoading && !session && (
          <section className="af-auth-grid">
            {!challenge ? (
              <article className="af-card af-auth-card">
                <h2>Ingreso de afiliado</h2>
                <p>Ingresá tu correo y te enviamos un código de acceso</p>

                <form className="af-form" onSubmit={(event) => void handleChallengeRequest(event)}>
                  <label className="af-field">
                    Correo electrónico
                    <input
                      type="email"
                      value={credentials.email}
                      autoComplete="email"
                      onChange={(event) =>
                        setCredentials((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <button type="submit" className="af-btn af-btn-primary" disabled={authLoading}>
                    {authLoading ? "Enviando código..." : "Enviar código"}
                  </button>
                </form>

                {authError && <div className="af-status af-status-error">{authError}</div>}
              </article>
            ) : (
              <article className="af-card af-auth-card">
                <h2>Verificación de código de un solo uso</h2>
                <p>
                  Ingresá el código enviado a <strong>{credentials.email}</strong>. El código vence en 10 minutos.
                </p>

                <form className="af-form" onSubmit={(event) => void handleOtpVerification(event)}>
                  <label className="af-field">
                    Código de verificación
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </label>

                  <button type="submit" className="af-btn af-btn-primary" disabled={authLoading}>
                    {authLoading ? "Validando..." : "Ingresar"}
                  </button>
                </form>

                {challenge.devMode && challenge.devOtpCode && (
                  <div className="af-inline-note">
                    Modo desarrollo activo (sin SMTP): código de un solo uso {challenge.devOtpCode}
                  </div>
                )}

                <div className="af-actions-inline">
                  <button
                    type="button"
                    className="af-btn af-btn-soft"
                    disabled={authLoading}
                    onClick={() => void handleResendOtp()}
                  >
                    {authLoading ? "Reenviando..." : "Reenviar código"}
                  </button>

                  <button
                    type="button"
                    className="af-btn af-btn-soft"
                    disabled={authLoading}
                    onClick={() => {
                      setChallenge(null);
                      setOtpCode("");
                      setAuthError(null);
                    }}
                  >
                    Volver
                  </button>
                </div>

                {authError && <div className="af-status af-status-error">{authError}</div>}
              </article>
            )}
          </section>
        )}

        {!sessionLoading && session && (
          <section className="af-content-stack">
            {contextLoading && (
              <article className="af-card af-loading-card">
                <h2>Cargando información del afiliado</h2>
                <p>Estamos obteniendo titular, grupo familiar, fondos y VAR desde la API.</p>
              </article>
            )}

            {!contextLoading && contextError && (
              <article className="af-card">
                <h2>Error de integración</h2>
                <div className="af-status af-status-error">{contextError}</div>
                <button type="button" className="af-btn af-btn-primary" onClick={() => void loadSimulationContext()}>
                  Reintentar carga
                </button>
              </article>
            )}

            {!contextLoading && context && formState && (
              <section className="af-dashboard-grid">
                <aside className="af-side-column">
                  <article className="af-card af-side-card">
                    <div className="af-mini-label">Situación actual</div>
                    <div className="af-total-box">
                      <span>Tus fondos actuales acumulados</span>
                      <strong>{formatCurrency(context.funds.total)}</strong>
                    </div>
                    <div className="af-side-kpi-grid">
                      <article className="af-side-kpi">
                        <span>Obligatorio</span>
                        <strong>{formatCurrency(context.funds.mandatory)}</strong>
                      </article>
                      <article className="af-side-kpi">
                        <span>Voluntario</span>
                        <strong>{formatCurrency(context.funds.voluntary)}</strong>
                      </article>
                    </div>
                    <div className="af-side-inline-values">
                      <span>VAR: {formatCurrency(context.bov)}</span>
                      <span>
                        MRS:{" "}
                        {context.solidary.mrsValue !== null
                          ? formatCurrency(context.solidary.mrsValue)
                          : "No disponible"}
                      </span>
                      <span>Fecha cálculo: {formatIsoToDisplay(context.calculationDate)}</span>
                    </div>
                  </article>

                  {titular && (
                    <article className="af-card af-side-card">
                      <div className="af-mini-label">Tus datos personales</div>
                      <div className="af-holder-name">{titular.fullName}</div>
                      <div className="af-side-kpi-grid af-side-kpi-grid-3">
                        <article className="af-side-kpi">
                          <span>Nacimiento</span>
                          <strong>{formatIsoToDisplay(titular.birthDate)}</strong>
                        </article>
                        <article className="af-side-kpi">
                          <span>Sexo</span>
                          <strong>{formatSex(titular.sex)}</strong>
                        </article>
                        <article className="af-side-kpi">
                          <span>Edad</span>
                          <strong>{titularAge ?? "-"}</strong>
                        </article>
                      </div>
                      <div className="af-side-inline-values">
                        <span>Invalidez: {formatInvalidity(titular.invalid)}</span>
                        <span>Grupo familiar: {counts.total}</span>
                      </div>
                    </article>
                  )}

                  <article className="af-card af-side-card">
                    <div className="af-mini-label">Grupo familiar</div>
                    <div className="af-family-compact-list">
                      {context.beneficiaries.map((beneficiary, index) => (
                        <div key={`${beneficiary.type}-${beneficiary.fullName}-${index}`} className="af-family-compact-item">
                          <span>{beneficiary.fullName}</span>
                          <small className="af-family-compact-date">
                            {formatIsoToDisplay(beneficiary.birthDate)}
                          </small>
                          <small>{formatBeneficiaryType(beneficiary.type)}</small>
                        </div>
                      ))}
                    </div>
                  </article>

                </aside>

                <section className="af-main-column">
                  <article className="af-card af-control-panel">
                    <div className="af-control-heading">
                      <div>
                        <h2>Completá para Simular tu Jubilación</h2>
              
                      </div>
                    </div>

                    <div className="af-form af-form-compact">
                      <label className="af-field af-editable-group">
                        <span className="af-editable-label"><span className="af-step-badge">1</span>¿Cuánto aportarías a tu Fondo Voluntario por mes?</span>
                        <div className="af-currency-input af-currency-input-dark">
                          <span>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            list="voluntary-contribution-suggestions"
                            value={formState.voluntaryMonthlyAmount}
                            onChange={(event) => updateVoluntaryAmountInput(event.target.value)}
                          />
                        </div>
                        <div className="af-quick-button-row">
                          {VOLUNTARY_CONTRIBUTION_STEPS.map((step) => (
                            <button
                              type="button"
                              key={`voluntary-step-${step}`}
                              className="af-quick-button af-quick-button-dark"
                              onClick={() => applyVoluntaryContributionStep(step)}
                            >
                              {formatContributionStepLabel(step)}
                            </button>
                          ))}
                        </div>
                        <datalist id="voluntary-contribution-suggestions">
                          {VOLUNTARY_CONTRIBUTION_STEPS.map((amount) => (
                            <option key={`voluntary-amount-${amount}`} value={formatAmountInput(amount)} />
                          ))}
                        </datalist>
                        {formErrors.voluntaryMonthlyAmount && (
                          <span className="af-field-error">{formErrors.voluntaryMonthlyAmount}</span>
                        )}
                      </label>

                      <div className="af-editable-age-row af-editable-age-row-compact">
                        <label className="af-field af-editable-group af-editable-retirement-age-field">
                          <span className="af-editable-label"><span className="af-step-badge">2</span>¿A que edad esperas jubilarte?</span>
                          <div
                            className="af-age-inline-picker af-age-inline-picker-compact"
                            role="group"
                            aria-label="Selector de edad de jubilación"
                          >
                            <div className="af-age-option-track af-age-option-grid">
                              {EDITABLE_AGE_OPTIONS.map((age) => (
                                <button
                                  type="button"
                                  key={`retirement-age-${age}`}
                                  className={`af-quick-button af-quick-button-age ${isQuickAgeSelected(formState.retirementAge, age) ? "af-quick-button-active" : ""}`}
                                  onClick={() => setRetirementAgeFromQuickPicker(age)}
                                >
                                  {age}
                                </button>
                              ))}
                            </div>
                          </div>
                          {formErrors.retirementAge && (
                            <span className="af-field-error">{formErrors.retirementAge}</span>
                          )}
                        </label>

                        <label className="af-field af-editable-group af-editable-end-age-field">
                          <span className="af-editable-label"><span className="af-step-badge">3</span>Edad fin aportes voluntarios</span>
                          <div className="af-currency-input af-currency-input-dark af-select-input-dark">
                            <select
                              value={formState.voluntaryEndAge}
                              onChange={(event) => updateVoluntaryEndAgeSelection(event.target.value)}
                              aria-label="Edad fin de aportes voluntarios"
                            >
                              {voluntaryEndAgeOptions.map((age) => (
                                <option key={`voluntary-end-age-option-${age}`} value={String(age)}>
                                  {age}
                                </option>
                              ))}
                            </select>
                          </div>
                          {formErrors.voluntaryEndAge && (
                            <span className="af-field-error">{formErrors.voluntaryEndAge}</span>
                          )}
                        </label>
                      </div>

                      <button
                        type="button"
                        className="af-btn af-btn-primary af-calc-btn"
                        disabled={loading || counts.titulares !== 1}
                        onClick={() => void runSimulation()}
                      >
                        {loading ? "Calculando..." : "Calcular proyección"}
                      </button>
                    </div>

                    {counts.titulares !== 1 && (
                      <div className="af-status af-status-error">
                        El contexto del afiliado debe incluir exactamente un titular para simular.
                      </div>
                    )}

                    {error && <div className="af-status af-status-error">{error}</div>}
                  </article>

                  {!result ? (
                    <article className="af-card af-empty-main-card">
                      <div className="af-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 16.5V19h14v-2.5M6.5 14l3.8-4.3 3 2.7 4.2-5.4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16 7h3v3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <h2>Cálculo de proyección</h2>
                      <p>Configurá los valores del panel lateral y presioná calcular para ver resultados.</p>
                    </article>
                  ) : (
                    <>
                      <article className="af-jubilacion-hero">
                        <h3>Tu jubilación en el año {extractYear(result.retirementDate)} será</h3>
                        <strong className="af-jubilacion-hero-amount">{formatCurrency(resolveTotalProjectedBenefit(result))}</strong>
                        <div className="af-jubilacion-hero-breakdown">
                          <span>Capitalización: {formatCurrency(resolveCapitalizationBenefit(result))}</span>
                          <span>Fondo solidario: {formatCurrency(resolveSolidaryBenefit(result))}</span>
                        </div>
                      </article>

                      <article className="af-card af-chart-main-card af-chart-fullwidth">
                        <div className="af-chart-header">
                          <h2>Mirá cómo aumenta tu jubilación si hacés aportes voluntarios</h2>
                          <div className="af-whatif-meta">
                            <span>Mínimo: {formatCurrency(minWhatIfBenefit)}</span>
                            <span>Máximo: {formatCurrency(maxWhatIfBenefit)}</span>
                          </div>
                        </div>

                        {whatIfRows.length > 0 ? (
                          <div className="af-whatif-chart">
                            <div className="af-whatif-yaxis">
                              {whatIfTickValues.map((value, index) => (
                                <span key={`tick-${index}`}>{formatCurrency(value)}</span>
                              ))}
                            </div>
                            <div className="af-whatif-bars-wrap">
                              <div className="af-whatif-grid-lines" aria-hidden="true" />
                              <div className="af-whatif-bars">
                                {whatIfRows.map((row, index) => {
                                  const baseBenefit = whatIfRows[0]?.projectedBenefit ?? 0;
                                  const delta = row.projectedBenefit - baseBenefit;
                                  const ratio = maxWhatIfBenefit > 0 ? row.projectedBenefit / maxWhatIfBenefit : 0;
                                  const height = 16 + ratio * 108;

                                  return (
                                    <button
                                      type="button"
                                      key={`bar-${row.monthlyAmount}`}
                                      className="af-whatif-bar-item"
                                      onMouseEnter={() => setHoveredWhatIfIndex(index)}
                                      onMouseLeave={() => setHoveredWhatIfIndex(null)}
                                      onFocus={() => setHoveredWhatIfIndex(index)}
                                      onBlur={() => setHoveredWhatIfIndex(null)}
                                      aria-label={`${formatCurrency(row.monthlyAmount)}: beneficio ${formatCurrency(row.projectedBenefit)}`}
                                    >
                                      <div className="af-whatif-bar-track">
                                        <div className="af-whatif-bar-fill" style={{ height: `${height}px` }} />
                                      </div>
                                      {hoveredWhatIfIndex === index && (
                                        <div className="af-whatif-tooltip">
                                          <strong>{formatCurrency(row.monthlyAmount)}</strong>
                                          <span>Beneficio: {formatCurrency(row.projectedBenefit)}</span>
                                          <span>
                                            Variación: {delta >= 0 ? "+" : ""}
                                            {formatCurrency(delta)}
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
                        ) : (
                          <div className="af-inline-note">El gráfico se habilita al ejecutar la simulación.</div>
                        )}
                      </article>

                      <article className="af-main-disclaimer">
                        Este cálculo es estimativo y depende de supuestos actuariales. La composición familiar usada es:{" "}
                        {result.counts.spouses} cónyuge(s) y {result.counts.children} hijo(s).
                      </article>
                    </>
                  )}
                </section>
              </section>
            )}
          </section>
        )}
    </section>
  );
}

function buildVoluntaryEndAgeLimits(retirementAge: number, currentAge: number): { min: number; max: number } {
  const safeMax = Math.max(0, Math.trunc(retirementAge));
  const minCandidate = Math.max(0, Math.trunc(currentAge) + 1);
  const safeMin = Math.min(minCandidate, safeMax);

  return {
    min: safeMin,
    max: safeMax
  };
}

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function parseEditableFormState(state: EditableFormState): EditableSimulationValues {
  return {
    voluntaryMonthlyAmount: parseAmountInput(state.voluntaryMonthlyAmount),
    retirementAge: toFiniteNumber(state.retirementAge),
    voluntaryEndAge: toFiniteNumber(state.voluntaryEndAge)
  };
}

function toFiniteNumber(rawValue: string): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseAmountInput(rawValue: string): number {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) {
    return Number.NaN;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeAmountInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return formatAmountInput(parsed);
}

function formatAmountInput(value: number): string {
  const safe = Math.max(0, Math.trunc(value));
  return formatNumber(safe);
}

function formatContributionStepLabel(value: number): string {
  if (value >= 1000) {
    const kValue = value / 1000;
    const suffix = Number.isInteger(kValue) ? String(kValue) : kValue.toFixed(1);
    return `+$${suffix}k`;
  }

  return `+$${formatNumber(value)}`;
}

function buildWhatIfRows(baseInput: SimulationInput, baseResult: SimulationResult): WhatIfRow[] {
  const baseMonthlyAmount =
    typeof baseInput.voluntaryContribution.monthlyAmount === "number" &&
    Number.isFinite(baseInput.voluntaryContribution.monthlyAmount)
      ? Math.max(0, baseInput.voluntaryContribution.monthlyAmount)
      : 0;
  const contributionMonths =
    Math.max(0, baseInput.voluntaryContribution.endAge - baseInput.voluntaryContribution.startAge) * 12;
  const ppuuSafe = baseResult.ppuu > 0 ? baseResult.ppuu : 1;
  const fixedSolidaryBenefit = resolveSolidaryBenefit(baseResult);

  const scenarios = Array.from(
    { length: WHAT_IF_SCENARIOS },
    (_, index) => baseMonthlyAmount + index * WHAT_IF_STEP
  );

  return scenarios.map((monthlyAmount) => {
    const extraContribution = (monthlyAmount - baseMonthlyAmount) * contributionMonths;
    const estimatedFinalBalance = baseResult.finalBalance + extraContribution;

    return {
      monthlyAmount,
      projectedBenefit: Math.max(0, estimatedFinalBalance / ppuuSafe) + fixedSolidaryBenefit
    };
  });
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const error = (payload as Record<string, unknown>).error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  const message = (payload as Record<string, unknown>).message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return fallback;
}

function sanitizeUserError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("n <=") || normalized.includes("beneficiarios")) {
    return "El escenario supera el límite operativo de esta versión. Reducí el grupo a un máximo de 12 beneficiarios.";
  }

  return message;
}

function resolveSolidaryStatus(result: SimulationResult): SolidaryStatus {
  const fallback: SolidaryStatus = {
    code: "NOT_SIMULABLE_MISSING_DATA",
    message:
      "No se pudo simular el componente solidario porque faltan MRS o fecha de matriculación.",
    eligible: false,
    mrsValue: null,
    contributionYears: null,
    requiredYears: 35,
    ageAtRetirement: null,
    percentageApplied: 0
  };

  const statusCandidate = (result as unknown as { solidaryStatus?: SolidaryStatus })
    .solidaryStatus;
  if (!statusCandidate || typeof statusCandidate !== "object") {
    return fallback;
  }

  return {
    ...fallback,
    ...statusCandidate
  };
}

function resolveCapitalizationBenefit(result: SimulationResult): number {
  const candidate = (result as unknown as { capitalizationBenefit?: number })
    .capitalizationBenefit;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  return result.projectedBenefit;
}

function resolveSolidaryBenefit(result: SimulationResult): number {
  const candidate = (result as unknown as { solidaryBenefit?: number }).solidaryBenefit;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  return 0;
}

function resolveTotalProjectedBenefit(result: SimulationResult): number {
  const candidate = (result as unknown as { totalProjectedBenefit?: number })
    .totalProjectedBenefit;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  return resolveCapitalizationBenefit(result) + resolveSolidaryBenefit(result);
}

function formatBeneficiaryType(type: "T" | "C" | "H"): string {
  if (type === "T") {
    return "Titular";
  }

  if (type === "C") {
    return "Cónyuge";
  }

  return "Hijo";
}

function formatSex(value: 1 | 2): string {
  return value === 1 ? "M" : "F";
}

function formatInvalidity(value: 0 | 1): string {
  return value === 1 ? "Sí" : "No";
}

function formatIsoToDisplay(iso: string): string {
  const match = ISO_DATE_REGEX.exec(iso);
  if (!match) {
    return iso;
  }

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function extractYear(iso: string): string {
  const match = ISO_DATE_REGEX.exec(iso);
  if (!match) {
    return iso;
  }

  return iso.split("-")[0];
}

function calculateAgeFromIso(iso: string): number | null {
  if (!ISO_DATE_REGEX.test(iso)) {
    return null;
  }

  const [year, month, day] = iso.split("-").map(Number);
  const today = new Date();

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
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

function formatKLabel(value: number): string {
  if (value < 1000) {
    return formatNumber(value);
  }

  return `${formatNumber(value / 1000)}k`;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
