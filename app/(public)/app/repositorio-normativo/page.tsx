"use client";

import { useEffect, useState } from "react";
import type { ContentResponse, DocumentItem } from "@/lib/types/content";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export default function RepositorioNormativoPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/content/normative", { method: "GET" });
        const payload = (await response.json()) as ContentResponse<DocumentItem[]>;

        if (!response.ok || !payload.success) {
          throw new Error("No fue posible cargar el repositorio normativo.");
        }

        setItems(payload.data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No fue posible cargar el repositorio normativo.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Repositorio normativo</h1>
      </article>

      {loading && <p className="anx-status">Cargando normativa...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <div className="anx-doc-grid">
          {items.map((item) => (
            <article key={item.id} className="anx-panel anx-doc-card">
              <div>
                <h2>{item.title}</h2>
                <p>
                  {item.topic} · {item.fileType.toUpperCase()} · {formatDate(item.publishedAt)}
                </p>
              </div>
              <a href={item.url} target="_blank" rel="noreferrer" className="anx-link-btn">
                Abrir documento
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
