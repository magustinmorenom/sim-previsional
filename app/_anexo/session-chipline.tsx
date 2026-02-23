"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface SessionChiplineProps {
  authenticated: boolean;
  fullName?: string | null;
  email?: string | null;
  fileNumber?: string | null;
}

function buildLoginHref(pathname: string): string {
  const nextPath = pathname && pathname !== "/app/acceso" ? pathname : "/app";
  return `/app/acceso?next=${encodeURIComponent(nextPath)}`;
}

function buildFallbackAffiliateName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "Afiliado";
  }

  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Afiliado";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function SessionChipline({
  authenticated,
  fullName,
  email,
  fileNumber
}: SessionChiplineProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const loginHref = useMemo(() => buildLoginHref(pathname ?? "/app"), [pathname]);
  const displayEmail = email?.trim() || "";
  const displayName = fullName?.trim() || (displayEmail ? buildFallbackAffiliateName(displayEmail) : "Afiliado");
  const displayFileNumber = fileNumber?.trim() || "N/D";

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/sessions", {
        method: "DELETE"
      });
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="anx-session-chipline" aria-label="Estado de sesión">
      {authenticated && (
        <>
          <span className="anx-session-chip anx-session-chip-online anx-session-chip-name" title={displayName}>
            <span className="anx-session-dot" aria-hidden="true" />
            <span>{displayName}</span>
          </span>

          {displayEmail && (
            <span className="anx-session-chip anx-session-chip-info" title={displayEmail}>
              <span className="anx-session-chip-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                  <path d="m5 7 7 5 7-5" />
                </svg>
              </span>
              <span>{displayEmail}</span>
            </span>
          )}

          <span className="anx-session-chip anx-session-chip-info">
            <span className="anx-session-chip-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="3.5" width="14" height="18" rx="2.5" />
                <path d="M8.5 8.5h7" />
                <path d="M8.5 12h7" />
                <path d="M8.5 15.5h4.5" />
              </svg>
            </span>
            <span>Legajo {displayFileNumber}</span>
          </span>

          <button
            type="button"
            className="anx-session-action"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            {loggingOut ? "Saliendo..." : "Salir"}
          </button>
        </>
      )}

      {!authenticated && (
        <>
          <span className="anx-session-chip anx-session-chip-offline">
            <span className="anx-session-dot" aria-hidden="true" />
            Sin sesión
          </span>
          <Link href={loginHref} className="anx-session-action">
            Iniciar sesión
          </Link>
        </>
      )}
    </section>
  );
}
