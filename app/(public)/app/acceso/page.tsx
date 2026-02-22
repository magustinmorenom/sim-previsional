"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthChallengeResponse, SessionInfo } from "@/lib/types/auth";

function safeNextPath(raw: string | null): string {
  if (!raw) {
    return "/app/simuladores/previsional";
  }

  if (!raw.startsWith("/app")) {
    return "/app/simuladores/previsional";
  }

  return raw;
}

export default function AccesoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);

  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/v1/auth/sessions", { method: "GET" });
        const payload = (await response.json()) as SessionInfo;

        if (response.ok && payload.authenticated) {
          router.replace(nextPath);
        }
      } catch {
        // no-op
      }
    })();
  }, [nextPath, router]);

  async function requestCode(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload
            ? String((payload as { error?: string }).error)
            : "No fue posible enviar el código de un solo uso.";

        throw new Error(message);
      }

      setChallenge(payload as AuthChallengeResponse);
      setOtpCode("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible enviar el código de un solo uso.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!challenge) {
      setError("Primero solicitá el código de un solo uso.");
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Ingresá un código de un solo uso válido de 6 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);

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

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: string }).error)
            : "No fue posible validar el código de un solo uso.";

        throw new Error(message);
      }

      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible validar el código de un solo uso.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="anx-grid anx-grid-narrow">
      <article className="anx-panel anx-auth-panel">
        <h1>Acceso de afiliado</h1>
        <p>Ingresá tu correo y te enviamos un código de acceso</p>

        {!challenge ? (
          <form onSubmit={(event) => void requestCode(event)} className="anx-form-grid">
            <label>
              Correo electrónico
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="afiliado@correo.com"
                required
              />
            </label>
            <button type="submit" className="anx-primary-btn" disabled={loading}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={(event) => void verifyCode(event)} className="anx-form-grid">
            <label>
              Código de un solo uso
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
              />
            </label>
            <button type="submit" className="anx-primary-btn" disabled={loading}>
              {loading ? "Validando..." : "Ingresar"}
            </button>
            <button
              type="button"
              className="anx-ghost-btn"
              disabled={loading}
              onClick={() => {
                setChallenge(null);
                setOtpCode("");
              }}
            >
              Cambiar email
            </button>

            {challenge.devMode && challenge.devOtpCode && (
              <small className="anx-dev-note">Modo desarrollo: código de un solo uso {challenge.devOtpCode}</small>
            )}
          </form>
        )}

        {error && <p className="anx-status anx-status-error">{error}</p>}
      </article>
    </section>
  );
}
