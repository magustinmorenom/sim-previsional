"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const segmentLabelMap: Record<string, string> = {
  app: "Inicio",
  biblioteca: "Biblioteca",
  procesos: "Procesos",
  faq: "FAQ",
  "repositorio-normativo": "Normativa",
  consultas: "Consultas",
  tramites: "Trámites",
  simuladores: "Simuladores",
  previsional: "Previsional",
  prestamos: "Préstamos",
  acceso: "Acceso"
};

function labelForSegment(segment: string): string {
  return segmentLabelMap[segment] ?? segment.replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <div className="anx-breadcrumbs" />;
  }

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;

    return {
      href,
      label: labelForSegment(segment),
      isLast
    };
  });

  return (
    <nav className="anx-breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="anx-breadcrumb-item">
          {crumb.isLast ? (
            <span className="anx-breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link href={crumb.href}>{crumb.label}</Link>
          )}
          {index < crumbs.length - 1 && <span className="anx-breadcrumb-sep">/</span>}
        </span>
      ))}
    </nav>
  );
}
