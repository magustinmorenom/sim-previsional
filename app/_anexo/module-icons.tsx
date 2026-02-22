import type { JSX } from "react";

export type ModuleIconKey =
  | "home"
  | "biblioteca"
  | "procesos"
  | "faq"
  | "repositorio-normativo"
  | "normativa"
  | "consultas"
  | "chatbot-cps"
  | "simulador-previsional"
  | "simulador-prestamos";

interface ModuleIconProps {
  moduleKey: string;
  className?: string;
}

function iconFor(moduleKey: string): JSX.Element {
  switch (moduleKey as ModuleIconKey) {
    case "biblioteca":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17.5H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
          <path d="M6.5 3H4v17" />
          <path d="M8.5 8H16" />
          <path d="M8.5 12H16" />
        </svg>
      );
    case "procesos":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 5h14" />
          <path d="M5 12h14" />
          <path d="M5 19h14" />
          <path d="M9 8l1.5 1.5L13 7" />
          <path d="M9 15l1.5 1.5L13 14" />
        </svg>
      );
    case "faq":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
          <path d="M10 9a2 2 0 1 1 3.2 1.6c-.8.6-1.2 1-1.2 2" />
          <path d="M12 15h.01" />
        </svg>
      );
    case "repositorio-normativo":
    case "normativa":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16" />
          <path d="M6 7h5v4H6a2 2 0 1 1 0-4Z" />
          <path d="M18 7h-5v4h5a2 2 0 1 0 0-4Z" />
          <path d="M6 17h12" />
        </svg>
      );
    case "consultas":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v9A2.5 2.5 0 0 1 16.5 18H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 15.5v-9Z" />
          <path d="M9 9h6" />
          <path d="M9 12h4" />
        </svg>
      );
    case "chatbot-cps":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3 10 7.5 5.5 9.5 10 11.5 12 16l2-4.5 4.5-2-4.5-2L12 3Z" />
          <path d="M4.5 15.5 5.3 17.2 7 18l-1.7.8-.8 1.7-.8-1.7L2 18l1.7-.8.8-1.7Z" />
          <path d="M12 16v5" />
          <path d="M9.5 21h5" />
        </svg>
      );
    case "simulador-previsional":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 19h16" />
          <path d="M6 16.5 10 12l3 2.5L18 8" />
          <path d="M15 8h3v3" />
        </svg>
      );
    case "simulador-prestamos":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 14h4" />
          <path d="M14 14h3" />
        </svg>
      );
    case "home":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3.5 11.5 12 4l8.5 7.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
  }
}

export function ModuleIcon({ moduleKey, className }: ModuleIconProps): JSX.Element {
  const classes = className ? `anx-module-icon ${className}` : "anx-module-icon";

  return <span className={classes}>{iconFor(moduleKey)}</span>;
}
