"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const pathTitleMap: Record<string, string> = {
  "/app": "Inicio",
  "/app/biblioteca": "Biblioteca",
  "/app/procesos": "Procesos",
  "/app/faq": "FAQ",
  "/app/repositorio-normativo": "Normativa",
  "/app/consultas": "Consultas",
  "/app/tramites": "Trámites",
  "/app/simuladores/previsional": "Sim. Previsional",
  "/app/simuladores/prestamos": "Sim. Préstamos",
  "/app/chatbot": "Chatbot CPS",
  "/app/acceso": "Acceso"
};

function getTitleForPath(pathname: string): string {
  if (pathTitleMap[pathname]) {
    return pathTitleMap[pathname];
  }

  for (const [path, title] of Object.entries(pathTitleMap)) {
    if (path !== "/app" && pathname.startsWith(`${path}/`)) {
      return title;
    }
  }

  return "App CPS";
}

interface MobileHeaderProps {
  onOpenChat: () => void;
}

export function MobileHeader({ onOpenChat }: MobileHeaderProps) {
  const pathname = usePathname();
  const title = getTitleForPath(pathname);

  return (
    <header className="mob-header">
      <a href="https://cajaceer.org.ar" aria-label="Ir al sitio de CPS">
        <Image
          src="/cps-logo.svg"
          alt="CPS"
          width={36}
          height={36}
          priority
          className="mob-header-logo"
        />
      </a>

      <h1 className="mob-header-title">{title}</h1>

      <button
        type="button"
        className="mob-header-chat-btn"
        onClick={onOpenChat}
        aria-label="Abrir asistente IA"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3 10 7.5 5.5 9.5 10 11.5 12 16l2-4.5 4.5-2-4.5-2L12 3Z" />
          <path d="M4.5 15.5 5.3 17.2 7 18l-1.7.8-.8 1.7-.8-1.7L2 18l1.7-.8.8-1.7Z" />
        </svg>
      </button>
    </header>
  );
}
