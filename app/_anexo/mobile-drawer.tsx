"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ModuleIcon } from "@/app/_anexo/module-icons";
import type { ModuleDescriptor } from "@/lib/types/content";

const BOTTOM_BAR_KEYS = new Set(["home", "simulador-previsional", "simulador-prestamos", "consultas"]);

interface MobileDrawerProps {
  modules: ModuleDescriptor[];
  hasSession: boolean;
  session: { fullName?: string | null; email?: string | null; fileNumber?: string | null } | null;
  onClose: () => void;
}

function isActivePath(pathname: string, target: string): boolean {
  if (target === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

function buildFallbackName(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) return "Afiliado";
  return local
    .split(" ")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

function MobileSessionCard({
  hasSession,
  session,
  onClose
}: {
  hasSession: boolean;
  session: MobileDrawerProps["session"];
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!hasSession) {
    const loginHref = `/app/acceso?next=${encodeURIComponent(pathname ?? "/app")}`;
    return (
      <div className="mob-session-card">
        <div className="mob-session-status">
          <span className="mob-session-dot mob-session-dot-offline" />
          <span className="mob-session-label">Sin sesión</span>
        </div>
        <Link href={loginHref} className="mob-session-btn" onClick={onClose}>
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const email = session?.email?.trim() || "";
  const displayName = session?.fullName?.trim() || (email ? buildFallbackName(email) : "Afiliado");
  const fileNumber = session?.fileNumber?.trim() || "N/D";

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/sessions", { method: "DELETE" });
      router.refresh();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mob-session-card">
      <div className="mob-session-info">
        <div className="mob-session-status">
          <span className="mob-session-dot mob-session-dot-online" />
          <span className="mob-session-name">{displayName}</span>
        </div>
        {email && <p className="mob-session-detail">{email}</p>}
        <p className="mob-session-detail">Legajo {fileNumber}</p>
      </div>
      <button
        type="button"
        className="mob-session-btn mob-session-btn-logout"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? "Saliendo..." : "Cerrar sesión"}
      </button>
    </div>
  );
}

export function MobileDrawer({ modules, hasSession, session, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const drawerModules = modules.filter((m) => !BOTTOM_BAR_KEYS.has(m.key));

  return (
    <>
      <div className="mob-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="mob-drawer" role="dialog" aria-label="Más opciones">
        <div className="mob-drawer-handle" />
        <h2 className="mob-drawer-title">Más opciones</h2>

        <ul className="mob-drawer-list">
          {drawerModules.map((module) => {
            const active = isActivePath(pathname, module.path);
            const isPrivate = module.visibility === "private";
            const href = isPrivate && !hasSession
              ? `/app/acceso?next=${encodeURIComponent(module.path)}`
              : module.path;

            return (
              <li key={module.key}>
                <Link
                  href={href}
                  className={`mob-drawer-item ${active ? "mob-drawer-item-active" : ""}`}
                  onClick={onClose}
                >
                  <ModuleIcon moduleKey={module.key} />
                  <span>{module.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mob-drawer-session">
          <MobileSessionCard hasSession={hasSession} session={session} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
