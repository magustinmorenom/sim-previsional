"use client";

import type { JSX } from "react";

const CHAT_OPEN_EVENT = "anx:chat-open";

type ContactCardVariant = "whatsapp" | "email" | "phone" | "ia";

type ContactCardAction =
  | {
      type: "link";
      label: string;
      href: string;
      external?: boolean;
    }
  | {
      type: "open-chat";
      label: string;
    };

interface ContactCard {
  id: string;
  title: string;
  description: string;
  value?: string;
  availability?: string;
  variant: ContactCardVariant;
  action?: ContactCardAction;
}

const CONTACT_CARDS: ContactCard[] = [
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Canal rápido para consultas generales y orientación inicial.",
    value: "+54 9 343 455-1605",
    availability: "Lunes a viernes, horario administrativo",
    variant: "whatsapp",
    action: {
      type: "link",
      label: "Abrir WhatsApp",
      href: "https://wa.me/5493434551605",
      external: true
    }
  },
  {
    id: "email",
    title: "Correo electrónico",
    description: "Canal formal para consultas y envío de documentación.",
    value: "plataforma@cajaceer.org.ar",
    availability: "Respuesta dentro de 24/48 hs hábiles",
    variant: "email",
    action: {
      type: "link",
      label: "Enviar mail",
      href: "mailto:plataforma@cajaceer.org.ar"
    }
  },
  {
    id: "phone",
    title: "Atención telefónica",
    description: "Atención por delegaciones para dudas de trámites y estado.",
    value: "+54 9 343 455-1605",
    availability: "Lunes a viernes, horario administrativo",
    variant: "phone"
  },
  {
    id: "chatbot",
    title: "Chat con IA",
    description: "Consultá con nuestro asistente para resolver dudas operativas en segundos.",
    value: "IA CPS",
    availability: "Disponible durante toda tu navegación",
    variant: "ia",
    action: {
      type: "open-chat",
      label: "Chatear con IA"
    }
  }
];

function ContactIcon({ variant }: { variant: ContactCardVariant }): JSX.Element {
  switch (variant) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 4a8 8 0 0 1 6.9 12l1.1 3.3-3.4-1A8 8 0 1 1 12 4Z" />
          <path d="M9.2 10.1c.3-.7.7-.8 1-.8h.4c.1 0 .3.1.4.4l.5 1.2c.1.2.1.4 0 .6l-.4.5c-.1.2-.2.3 0 .5.4.7 1.1 1.2 1.8 1.6.2.1.4.1.5 0l.6-.4c.2-.1.4-.2.6-.1l1.2.6c.2.1.3.2.4.4v.4c0 .3-.2.7-.8 1-.5.2-1 .3-1.4.2-2.3-.6-4.3-2.5-4.9-4.8-.1-.5 0-1 .2-1.4Z" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4.5 7 7.5 6L19.5 7" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M8.5 4.5h2l1 3.5-1.8 1.8a12.2 12.2 0 0 0 4.5 4.5L16 12.5l3.5 1v2c0 .6-.4 1-.9 1A15.5 15.5 0 0 1 7.5 5.4c0-.5.4-.9 1-.9Z" />
        </svg>
      );
    case "ia":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3 10 7.5 5.5 9.5 10 11.5 12 16l2-4.5 4.5-2-4.5-2L12 3Z" />
          <path d="M4.5 15.5 5.3 17.2 7 18l-1.7.8-.8 1.7-.8-1.7L2 18l1.7-.8.8-1.7Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function renderAction(action: ContactCardAction | undefined): JSX.Element | null {
  if (!action) {
    return null;
  }

  if (action.type === "open-chat") {
    return (
      <button
        type="button"
        className="anx-link-btn anx-link-btn-wide anx-contact-card-ia-btn"
        onClick={() => window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT))}
      >
        {action.label}
      </button>
    );
  }

  return (
    <a
      href={action.href}
      className="anx-link-btn anx-link-btn-wide"
      target={action.external ? "_blank" : undefined}
      rel={action.external ? "noreferrer" : undefined}
    >
      {action.label}
    </a>
  );
}

export default function ConsultasPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Consultas y derivación</h1>
      </article>

      <div className="anx-contact-grid">
        {CONTACT_CARDS.map((card) => (
          <article key={card.id} className={`anx-panel anx-contact-card anx-contact-card-${card.variant}`}>
            <header className="anx-contact-card-head">
              <span className="anx-contact-card-icon" aria-hidden="true">
                <ContactIcon variant={card.variant} />
              </span>
              <h2>{card.title}</h2>
            </header>

            <p>{card.description}</p>
            {card.value ? <p className="anx-contact-card-value">{card.value}</p> : null}
            {card.availability ? <small>{card.availability}</small> : null}
            {renderAction(card.action)}
          </article>
        ))}
      </div>
    </section>
  );
}
