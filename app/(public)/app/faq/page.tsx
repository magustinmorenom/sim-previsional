"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentResponse, FaqItem } from "@/lib/types/content";

export default function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/content/faq", { method: "GET" });
        const payload = (await response.json()) as ContentResponse<FaqItem[]>;

        if (!response.ok || !payload.success) {
          throw new Error("No fue posible cargar las preguntas frecuentes.");
        }

        setItems(payload.data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No fue posible cargar las preguntas frecuentes.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, FaqItem[]>();

    for (const item of items) {
      const current = groups.get(item.section) ?? [];
      current.push(item);
      groups.set(item.section, current);
    }

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [items]);

  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Preguntas frecuentes</h1>
      </article>

      {loading && <p className="anx-status">Cargando FAQ...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <div className="anx-faq-groups">
          {groupedItems.map(([section, sectionItems]) => (
            <article key={section} className="anx-panel anx-faq-group">
              <h2>{section}</h2>
              <div className="anx-faq-list">
                {sectionItems.map((item) => (
                  <details key={item.id}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
