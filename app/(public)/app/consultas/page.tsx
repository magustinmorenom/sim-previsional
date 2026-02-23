"use client";

import { useEffect, useState } from "react";
import type { ContactChannel, ContentResponse } from "@/lib/types/content";

function resolveButtonLabel(type: ContactChannel["type"]): string {
  if (type === "whatsapp") {
    return "Abrir WhatsApp";
  }

  if (type === "email") {
    return "Enviar email";
  }

  if (type === "phone") {
    return "Ver canal";
  }

  return "Abrir";
}

export default function ConsultasPage() {
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/content/contact-channels", { method: "GET" });
        const payload = (await response.json()) as ContentResponse<ContactChannel[]>;

        if (!response.ok || !payload.success) {
          throw new Error("No fue posible cargar los canales de consulta.");
        }

        setChannels(payload.data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No fue posible cargar los canales de consulta.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Consultas y derivación</h1>
      </article>

      {loading && <p className="anx-status">Cargando canales...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <div className="anx-contact-grid">
          {channels.map((channel) => (
            <article key={channel.id} className="anx-panel anx-contact-card">
              <h2>{channel.name}</h2>
              <p>{channel.description}</p>
              {channel.availability && <small>{channel.availability}</small>}
              <a href={channel.url} target="_blank" rel="noreferrer" className="anx-link-btn anx-link-btn-wide">
                {resolveButtonLabel(channel.type)}
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
