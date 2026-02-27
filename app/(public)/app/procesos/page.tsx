"use client";

import { useEffect, useState } from "react";
import type { ContentResponse, ProcessGuide } from "@/lib/types/content";

function ProcessCardIcon() {
  return (
    <span className="anx-process-card-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="3.5" />
        <path d="M8.5 9.5h7" />
        <path d="M8.5 13.5h7" />
        <path d="m6.9 9.5.8.8 1.5-1.5" />
        <path d="m6.9 13.5.8.8 1.5-1.5" />
      </svg>
    </span>
  );
}

function StepsIcon() {
  return (
    <span className="anx-process-section-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="m5.5 7 2 2 3-3" />
        <path d="M11.5 7h7" />
        <path d="m5.5 12 2 2 3-3" />
        <path d="M11.5 12h7" />
        <path d="m5.5 17 2 2 3-3" />
        <path d="M11.5 17h7" />
      </svg>
    </span>
  );
}

function RequirementsIcon() {
  return (
    <span className="anx-process-section-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="4.5" width="14" height="15" rx="3" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    </span>
  );
}

function StepBulletIcon() {
  return (
    <span className="anx-process-step-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.8 12 2.2 2.2 4.2-4.2" />
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

              <section className="anx-process-block anx-process-block-steps">
                <h3 className="anx-process-section-title">
                  <StepsIcon />
                  Pasos
                </h3>
                <ul className="anx-check-list">
                  {guide.steps.map((step, index) => (
                    <li key={`${guide.id}-step-${index}`} className="anx-process-step-item">
                      <StepBulletIcon />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="anx-process-block anx-process-block-requirements">
                <h3 className="anx-process-section-title">
                  <RequirementsIcon />
                  Requisitos clave
                </h3>
                <ul className="anx-dot-list">
                  {guide.requirements.map((requirement, index) => (
                    <li key={`${guide.id}-req-${index}`} className="anx-process-requirement-item">
                      {requirement}
                    </li>
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
