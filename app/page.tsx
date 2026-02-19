"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import type { SimulationInput, SimulationResult } from "@/lib/types/simulation";

const WHAT_IF_STEP = 100000;
const WHAT_IF_SCENARIOS = 8;
const WHAT_IF_TICKS = 5;
const EDITABLE_AGE_OPTIONS = [65, 66, 67, 68, 69, 70] as const;
const VOLUNTARY_CONTRIBUTION_STEPS = [50, 100, 200, 300, 500, 800] as const;

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
        voluntaryEndAge: String(
          Math.min(
            nextContext.voluntaryContribution.endAgeDefault,
            nextContext.mandatoryContribution.endAgeDefault
          )
        )
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
      setAuthError("No fue posible iniciar el desafío OTP.");
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
      setAuthError("Ingresá un código OTP de 6 dígitos.");
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
        setAuthError(readErrorMessage(payload, "No fue posible validar el código OTP."));
        return;
      }

      setChallenge(null);
      setOtpCode("");
      await restoreSession();
    } catch {
      setAuthError("No fue posible validar el código OTP.");
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
        setAuthError(readErrorMessage(payload, "No fue posible reenviar el código OTP."));
        return;
      }

      const nextChallenge = payload as AuthChallengeResponse;
      setChallenge(nextChallenge);
      setOtpCode("");
    } catch {
      setAuthError("No fue posible reenviar el código OTP.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setAuthLoading(true);
    setAuthError(null);

    try {
      await fetch("/api/v1/auth/sessions", {
        method: "DELETE"
      });
    } finally {
      setSession(null);
      setChallenge(null);
      setOtpCode("");
      setAuthLoading(false);
    }
  }

  function updateFormField(name: keyof EditableFormState, value: string): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [name]: value
      };
    });
  }

  function enforceAgeMinimum(name: "retirementAge" | "voluntaryEndAge"): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const parsed = toFiniteNumber(current[name]);
      if (!Number.isFinite(parsed)) {
        return current;
      }

      if (parsed >= 65) {
        return current;
      }

      return {
        ...current,
        [name]: "65"
      };
    });
  }

  function applyVoluntaryContributionStep(step: number): void {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const parsed = toFiniteNumber(current.voluntaryMonthlyAmount);
      const safeAmount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

      return {
        ...current,
        voluntaryMonthlyAmount: String(Math.round(safeAmount + step))
      };
    });
  }

  function setAgeFromQuickPicker(name: "retirementAge" | "voluntaryEndAge", age: number): void {
    updateFormField(name, String(age));
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
    <main className="af-shell">
      <section className="af-surface">
        <header className="af-header">
          <div>
            <h1>Simulador Previsional</h1>
            <p>
              Versión afiliado final con autenticación OTP, datos automáticos y simulación en una única pantalla.
            </p>
          </div>
          <Image
            src="/cps-logo.svg"
            alt="CPS PCEER"
            className="af-logo"
            width={130}
            height={130}
            priority
          />
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
                <p>Ingresá tu correo electrónico para recibir un código de verificación.</p>

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
                <h2>Verificación OTP</h2>
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
                    Modo desarrollo activo (sin SMTP): código OTP {challenge.devOtpCode}
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
            <div className="af-toolbar">
              <div className="af-toolbar-copy">
                <span className="af-session-title">
                  <span className="af-online-dot" aria-hidden="true" />
                  Afiliado en sesión activa
                </span>
                <strong>{context?.affiliate.fullName ?? "Cargando datos del afiliado..."}</strong>
              </div>
              <button type="button" className="af-btn af-btn-soft" onClick={() => void handleLogout()}>
                Cerrar sesión
              </button>
            </div>

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
              <>
                <section className="af-grid af-grid-context">
                  <article className="af-card">
                    <h2>Tu información previsional</h2>

                    <div className="af-summary-grid">
                      <article className="af-summary-item">
                        <span>Fecha de cálculo</span>
                        <strong>{formatIsoToDisplay(context.calculationDate)}</strong>
                      </article>
                      <article className="af-summary-item">
                        <span>VAR (Valor Actual de Referencia)</span>
                        <strong>{formatCurrency(context.bov)}</strong>
                      </article>
                      <article className="af-summary-item">
                        <span>Fondo obligatorio</span>
                        <strong>{formatCurrency(context.funds.mandatory)}</strong>
                      </article>
                      <article className="af-summary-item">
                        <span>Fondo voluntario acumulado</span>
                        <strong>{formatCurrency(context.funds.voluntary)}</strong>
                      </article>
                      <article className="af-summary-item af-summary-item-highlight">
                        <span>Total acumulado</span>
                        <strong>{formatCurrency(context.funds.total)}</strong>
                      </article>
                    </div>

                    {titular && (
                      <section className="af-person-block">
                        <h3>Titular</h3>
                        <div className="af-person-grid">
                          <div>
                            <span>Nombre completo</span>
                            <strong>{titular.fullName}</strong>
                          </div>
                          <div>
                            <span>Fecha de nacimiento</span>
                            <strong>{formatIsoToDisplay(titular.birthDate)}</strong>
                          </div>
                          <div>
                            <span>Sexo</span>
                            <strong>{formatSex(titular.sex)}</strong>
                          </div>
                          <div>
                            <span>Estado de invalidez</span>
                            <strong>{formatInvalidity(titular.invalid)}</strong>
                          </div>
                        </div>
                      </section>
                    )}

                    <section className="af-family-block">
                      <div className="af-family-header">
                        <h3>Grupo familiar</h3>
                        <span>{counts.total} personas registradas</span>
                      </div>

                      <div className="af-family-table-wrap">
                        <table className="af-family-table">
                          <thead>
                            <tr>
                              <th>Nombre completo</th>
                              <th>Parentesco</th>
                              <th>Fecha de nacimiento</th>
                              <th>Sexo</th>
                              <th>Invalidez</th>
                            </tr>
                          </thead>
                          <tbody>
                            {context.beneficiaries.map((beneficiary, index) => (
                              <tr key={`${beneficiary.type}-${beneficiary.fullName}-${index}`}>
                                <td>{beneficiary.fullName}</td>
                                <td>{formatBeneficiaryType(beneficiary.type)}</td>
                                <td>{formatIsoToDisplay(beneficiary.birthDate)}</td>
                                <td>{formatSex(beneficiary.sex)}</td>
                                <td>{formatInvalidity(beneficiary.invalid)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="af-inline-note">
                        Composición: {counts.spouses} cónyuge(s) y {counts.children} hijo(s).
                      </div>
                    </section>
                  </article>

                  <article className="af-card af-editables-card">
                    <div className="af-editables-heading">
                      <span className="af-editables-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m19.4 15-1.1.63a1 1 0 0 0-.47.95l.13 1.26a1 1 0 0 1-.93 1.1l-1.28.07a1 1 0 0 0-.84.62l-.48 1.17a1 1 0 0 1-1.22.57l-1.24-.38a1 1 0 0 0-.9.2l-.95.8a1 1 0 0 1-1.35 0l-.95-.8a1 1 0 0 0-.9-.2l-1.24.38a1 1 0 0 1-1.22-.57l-.48-1.17a1 1 0 0 0-.84-.62l-1.28-.07a1 1 0 0 1-.93-1.1l.13-1.26a1 1 0 0 0-.47-.95L4.6 15a1 1 0 0 1-.47-1.26l.5-1.16a1 1 0 0 0-.08-.95l-.7-1.06a1 1 0 0 1 .2-1.43l1-.84a1 1 0 0 0 .34-.9L5.24 6.1a1 1 0 0 1 .72-1.24l1.23-.33a1 1 0 0 0 .7-.65l.46-1.18a1 1 0 0 1 1.21-.6l1.25.35a1 1 0 0 0 .9-.22l.93-.82a1 1 0 0 1 1.36 0l.93.82a1 1 0 0 0 .9.22l1.25-.35a1 1 0 0 1 1.21.6l.46 1.18a1 1 0 0 0 .7.65l1.23.33a1 1 0 0 1 .72 1.24l-.15 1.3a1 1 0 0 0 .34.9l1 .84a1 1 0 0 1 .2 1.43l-.7 1.06a1 1 0 0 0-.08.95l.5 1.16A1 1 0 0 1 19.4 15Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <div className="af-editables-copy">
                        <h2>Variables editables</h2>
                        <p>
                          Personalizá tu escenario eligiendo valores rápidos o ingresando los tuyos manualmente.
                        </p>
                      </div>
                    </div>

                    <div className="af-form af-form-compact">
                      <label className="af-field af-editable-group">
                        <span className="af-editable-label">Aporte voluntario mensual</span>
                        <div className="af-currency-input">
                          <span>$</span>
                          <input
                            type="number"
                            list="voluntary-contribution-suggestions"
                            step={1}
                            min={0}
                            value={formState.voluntaryMonthlyAmount}
                            onChange={(event) => updateFormField("voluntaryMonthlyAmount", event.target.value)}
                          />
                        </div>
                        <div className="af-quick-button-row">
                          {VOLUNTARY_CONTRIBUTION_STEPS.map((step) => (
                            <button
                              type="button"
                              key={`voluntary-step-${step}`}
                              className="af-quick-button"
                              onClick={() => applyVoluntaryContributionStep(step)}
                            >
                              + ${formatNumber(step)}
                            </button>
                          ))}
                        </div>
                        <datalist id="voluntary-contribution-suggestions">
                          {VOLUNTARY_CONTRIBUTION_STEPS.map((amount) => (
                            <option key={`voluntary-amount-${amount}`} value={amount} />
                          ))}
                        </datalist>
                        {formErrors.voluntaryMonthlyAmount && (
                          <span className="af-field-error">{formErrors.voluntaryMonthlyAmount}</span>
                        )}
                      </label>

                      <div className="af-editable-age-row">
                        <label className="af-field af-editable-group">
                          <span className="af-editable-label">Edad de jubilación</span>
                          <input
                            type="number"
                            list="editable-age-options"
                            min={65}
                            step={1}
                            value={formState.retirementAge}
                            onChange={(event) => updateFormField("retirementAge", event.target.value)}
                            onBlur={() => enforceAgeMinimum("retirementAge")}
                          />
                          <div className="af-quick-button-row">
                            {EDITABLE_AGE_OPTIONS.map((age) => (
                              <button
                                type="button"
                                key={`retirement-age-${age}`}
                                className={`af-quick-button ${isQuickAgeSelected(formState.retirementAge, age) ? "af-quick-button-active" : ""}`}
                                onClick={() => setAgeFromQuickPicker("retirementAge", age)}
                              >
                                {age} años
                              </button>
                            ))}
                          </div>
                          {formErrors.retirementAge && (
                            <span className="af-field-error">{formErrors.retirementAge}</span>
                          )}
                        </label>

                        <label className="af-field af-editable-group">
                          <span className="af-editable-label">Edad fin de aportes voluntarios</span>
                          <input
                            type="number"
                            list="editable-age-options"
                            min={65}
                            step={1}
                            value={formState.voluntaryEndAge}
                            onChange={(event) => updateFormField("voluntaryEndAge", event.target.value)}
                            onBlur={() => enforceAgeMinimum("voluntaryEndAge")}
                          />
                          <div className="af-quick-button-row">
                            {EDITABLE_AGE_OPTIONS.map((age) => (
                              <button
                                type="button"
                                key={`voluntary-end-age-${age}`}
                                className={`af-quick-button ${isQuickAgeSelected(formState.voluntaryEndAge, age) ? "af-quick-button-active" : ""}`}
                                onClick={() => setAgeFromQuickPicker("voluntaryEndAge", age)}
                              >
                                {age} años
                              </button>
                            ))}
                          </div>
                          {formErrors.voluntaryEndAge && (
                            <span className="af-field-error">{formErrors.voluntaryEndAge}</span>
                          )}
                        </label>
                      </div>

                      <datalist id="editable-age-options">
                        {EDITABLE_AGE_OPTIONS.map((age) => (
                          <option key={`editable-age-${age}`} value={age} />
                        ))}
                      </datalist>

                      <button
                        type="button"
                        className="af-btn af-btn-primary"
                        disabled={loading || counts.titulares !== 1}
                        onClick={() => void runSimulation()}
                      >
                        {loading ? "Calculando..." : "Calcular"}
                      </button>
                    </div>

                    {counts.titulares !== 1 && (
                      <div className="af-status af-status-error">
                        El contexto del afiliado debe incluir exactamente un titular para simular.
                      </div>
                    )}

                    {error && <div className="af-status af-status-error">{error}</div>}
                  </article>
                </section>

                <section className="af-grid af-grid-results">
                  <article className="af-card af-results-card">
                    <h2>Resultado de la simulación</h2>

                    {result ? (
                      <>
                        <div className="af-kpi-grid">
                          <article className="af-kpi-card">
                            <span>PPUU</span>
                            <strong>{formatNumber(result.ppuu, 2)}</strong>
                          </article>
                          <article className="af-kpi-card af-kpi-card-primary">
                            <span>Beneficio mensual proyectado</span>
                            <strong>{formatCurrency(result.projectedBenefit)}</strong>
                          </article>
                          <article className="af-kpi-card">
                            <span>Saldo final</span>
                            <strong>{formatCurrency(result.finalBalance)}</strong>
                          </article>
                          <article className="af-kpi-card">
                            <span>Fecha de jubilación</span>
                            <strong>{formatIsoToDisplay(result.retirementDate)}</strong>
                          </article>
                        </div>
                        <div className="af-inline-note">
                          La proyección considera tu composición familiar actual: {result.counts.spouses} cónyuge(s) y{" "}
                          {result.counts.children} hijo(s).
                        </div>
                      </>
                    ) : (
                      <div className="af-inline-note">Todavía no hay resultados. Ejecutá el cálculo para generar la proyección.</div>
                    )}
                  </article>

                  <article className="af-card">
                    <h2>Análisis What-If</h2>

                    {whatIfRows.length > 0 ? (
                      <div className="af-whatif-stack">
                        <div className="af-whatif-meta">
                          <span>Mínimo: {formatCurrency(minWhatIfBenefit)}</span>
                          <span>Máximo: {formatCurrency(maxWhatIfBenefit)}</span>
                        </div>

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
                      </div>
                    ) : (
                      <div className="af-inline-note">El gráfico se habilita al ejecutar la simulación.</div>
                    )}
                  </article>
                </section>
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function parseEditableFormState(state: EditableFormState): EditableSimulationValues {
  return {
    voluntaryMonthlyAmount: toFiniteNumber(state.voluntaryMonthlyAmount),
    retirementAge: toFiniteNumber(state.retirementAge),
    voluntaryEndAge: toFiniteNumber(state.voluntaryEndAge)
  };
}

function toFiniteNumber(rawValue: string): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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

  const scenarios = Array.from(
    { length: WHAT_IF_SCENARIOS },
    (_, index) => baseMonthlyAmount + index * WHAT_IF_STEP
  );

  return scenarios.map((monthlyAmount) => {
    const extraContribution = (monthlyAmount - baseMonthlyAmount) * contributionMonths;
    const estimatedFinalBalance = baseResult.finalBalance + extraContribution;

    return {
      monthlyAmount,
      projectedBenefit: Math.max(0, estimatedFinalBalance / ppuuSafe)
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
