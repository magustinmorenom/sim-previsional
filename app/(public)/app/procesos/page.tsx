"use client";

import { useEffect, useState } from "react";
import type { ContentResponse, ProcessGuide } from "@/lib/types/content";

function ProcessCardIcon() {
  return (
    <span className="anx-process-card-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 4h12" />
        <path d="M6 10h12" />
        <path d="M6 16h12" />
        <path d="M8 7.5 9.5 9 12 6.5" />
        <path d="M8 13.5 9.5 15 12 12.5" />
      </svg>
    </span>
  );
}

function StepsIcon() {
  return (
    <span className="anx-process-section-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4.5 6h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 18h15" />
        <path d="M7 8.5 8.2 9.7 10.6 7.3" />
      </svg>
    </span>
  );
}

function RequirementsIcon() {
  return (
    <span className="anx-process-section-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 5h12v14H6z" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    </span>
  );
}

export default function ProcesosPage() {
  const [guides, setGuides] = useState<ProcessGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/content/processes", { method: "GET" });
        const payload = (await response.json()) as ContentResponse<ProcessGuide[]>;

        if (!response.ok || !payload.success) {
          throw new Error("No fue posible cargar los procesos.");
        }

        setGuides(payload.data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No fue posible cargar los procesos.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="anx-stack anx-processes-shell">
      <article className="anx-panel anx-section-header">
        <h1>Procesos y guías</h1>
      </article>

      {loading && <p className="anx-status">Cargando procesos...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <div className="anx-guide-grid">
          {guides.map((guide) => (
            <article key={guide.id} className="anx-panel anx-guide-card anx-process-card">
              <header className="anx-process-card-head">
                <div className="anx-process-title-wrap">
                  <ProcessCardIcon />
                  <h2>{guide.title}</h2>
                </div>
                <small className="anx-process-meta">{guide.audience}</small>
              </header>

              <p className="anx-process-summary">{guide.summary}</p>

              <section className="anx-process-block">
                <h3 className="anx-process-section-title">
                  <StepsIcon />
                  Pasos
                </h3>
                <ul className="anx-check-list">
                  {guide.steps.map((step, index) => (
                    <li key={`${guide.id}-step-${index}`}>{step}</li>
                  ))}
                </ul>
              </section>

              <section className="anx-process-block">
                <h3 className="anx-process-section-title">
                  <RequirementsIcon />
                  Requisitos clave
                </h3>
                <ul className="anx-dot-list">
                  {guide.requirements.map((requirement, index) => (
                    <li key={`${guide.id}-req-${index}`}>{requirement}</li>
                  ))}
                </ul>
              </section>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
