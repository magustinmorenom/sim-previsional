"use client";

import { useEffect, useState } from "react";
import type { ContentResponse, ProcessGuide } from "@/lib/types/content";

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
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Procesos y guías</h1>
      </article>

      {loading && <p className="anx-status">Cargando procesos...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <div className="anx-guide-grid">
          {guides.map((guide) => (
            <article key={guide.id} className="anx-panel anx-guide-card">
              <header>
                <h2>{guide.title}</h2>
                <small>{guide.audience}</small>
              </header>

              <p>{guide.summary}</p>

              <div>
                <h3>Pasos</h3>
                <ul className="anx-check-list">
                  {guide.steps.map((step, index) => (
                    <li key={`${guide.id}-step-${index}`}>{step}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Requisitos clave</h3>
                <ul className="anx-dot-list">
                  {guide.requirements.map((requirement, index) => (
                    <li key={`${guide.id}-req-${index}`}>{requirement}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
