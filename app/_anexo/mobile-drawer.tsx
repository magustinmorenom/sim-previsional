"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/app/_anexo/module-icons";
import { SessionChipline } from "@/app/_anexo/session-chipline";
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
          <SessionChipline
            authenticated={hasSession}
            fullName={session?.fullName}
            email={session?.email}
            fileNumber={session?.fileNumber}
          />
        </div>
      </div>
    </>
  );
}
