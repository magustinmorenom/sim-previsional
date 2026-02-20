"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleDescriptor } from "@/lib/types/content";

interface TopNavProps {
  modules: ModuleDescriptor[];
  hasSession: boolean;
}

function normalizePath(path: string): string {
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function isActivePath(pathname: string, target: string): boolean {
  const normalizedPathname = normalizePath(pathname);
  const normalizedTarget = normalizePath(target);

  if (normalizedPathname === normalizedTarget) {
    return true;
  }

  return normalizedPathname.startsWith(`${normalizedTarget}/`);
}

export function TopNav({ modules, hasSession }: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="anx-topnav" aria-label="Navegación principal">
      <div className="anx-topnav-scroll">
        {modules.map((module) => {
          const active = isActivePath(pathname, module.path);
          const isPrivate = module.visibility === "private";
          const destination = isPrivate && !hasSession
            ? `/app/acceso?next=${encodeURIComponent(module.path)}`
            : module.path;

          return (
            <Link
              key={module.key}
              href={destination}
              className={`anx-topnav-link ${active ? "anx-topnav-link-active" : ""}`}
            >
              <span>{module.title}</span>
              {isPrivate && <small>{hasSession ? "Privado" : "Login"}</small>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
