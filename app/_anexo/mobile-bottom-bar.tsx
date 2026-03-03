"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/app/_anexo/module-icons";

interface TabItem {
  key: string;
  label: string;
  path: string;
  iconKey: string;
}

const TABS: TabItem[] = [
  { key: "home", label: "Inicio", path: "/app", iconKey: "home" },
  { key: "simulador-previsional", label: "Sim. Prev.", path: "/app/simuladores/previsional", iconKey: "simulador-previsional" },
  { key: "simulador-prestamos", label: "Sim. Prést.", path: "/app/simuladores/prestamos", iconKey: "simulador-prestamos" },
  { key: "consultas", label: "Consultas", path: "/app/consultas", iconKey: "consultas" }
];

function isActivePath(pathname: string, target: string): boolean {
  if (target === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

interface MobileBottomBarProps {
  hasSession: boolean;
  onOpenDrawer: () => void;
}

export function MobileBottomBar({ hasSession, onOpenDrawer }: MobileBottomBarProps) {
  const pathname = usePathname();

  return (
    <nav className="mob-bottom-bar" aria-label="Navegación mobile">
      {TABS.map((tab) => {
        const active = isActivePath(pathname, tab.path);
        const isPrivate = tab.key === "simulador-previsional" || tab.key === "simulador-prestamos";
        const href = isPrivate && !hasSession
          ? `/app/acceso?next=${encodeURIComponent(tab.path)}`
          : tab.path;

        return (
          <Link
            key={tab.key}
            href={href}
            className={`mob-tab ${active ? "mob-tab-active" : ""}`}
          >
            <span className="mob-tab-icon">
              <ModuleIcon moduleKey={tab.iconKey} />
            </span>
            <span className="mob-tab-label">{tab.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        className="mob-tab"
        onClick={onOpenDrawer}
        aria-label="Más opciones"
      >
        <span className="mob-tab-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            width="22"
            height="22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </span>
        <span className="mob-tab-label">Más</span>
      </button>
    </nav>
  );
}
