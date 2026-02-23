"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/app/_anexo/module-icons";
import type { ModuleDescriptor } from "@/lib/types/content";

interface TopNavProps {
  modules: ModuleDescriptor[];
  hasSession: boolean;
  className?: string;
}

function normalizePath(path: string): string {
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function isActivePath(pathname: string, target: string): boolean {
  const normalizedPathname = normalizePath(pathname);
  const normalizedTarget = normalizePath(target);

  if (normalizedTarget === "/app") {
    return normalizedPathname === "/app";
  }

  if (normalizedPathname === normalizedTarget) {
    return true;
  }

  return normalizedPathname.startsWith(`${normalizedTarget}/`);
}

function isSimulatorModule(module: ModuleDescriptor): boolean {
  return module.key === "simulador-previsional" || module.key === "simulador-prestamos";
}

export function TopNav({ modules, hasSession, className }: TopNavProps) {
  const pathname = usePathname();
  const navClassName = className ? `anx-topnav ${className}` : "anx-topnav";

  return (
    <nav className={navClassName} aria-label="Navegación principal">
      <div className="anx-topnav-scroll">
        {modules.map((module) => {
          const active = isActivePath(pathname, module.path);
          const isPrivate = module.visibility === "private";
          const destination = isPrivate && !hasSession
            ? `/app/acceso?next=${encodeURIComponent(module.path)}`
            : module.path;
          const simulatorClass = isSimulatorModule(module) ? "anx-topnav-link-simulator" : "";
          const activeClass = active ? "anx-topnav-link-active" : "";

          return (
            <Link
              key={module.key}
              href={destination}
              className={`anx-topnav-link ${simulatorClass} ${activeClass}`.trim()}
            >
              <ModuleIcon moduleKey={module.key} className="anx-topnav-link-icon" />
              <span className="anx-topnav-link-label">{module.title}</span>
              {isPrivate && !hasSession && <small>Login</small>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
