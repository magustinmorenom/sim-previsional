"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentResponse, DocumentItem } from "@/lib/types/content";

function formatDate(dateIso: string): string {
  const value = new Date(dateIso);
  if (Number.isNaN(value.getTime())) {
    return dateIso;
  }

  return value.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export default function BibliotecaPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [topic, setTopic] = useState("all");
  const [fileType, setFileType] = useState("all");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/content/library", { method: "GET" });
        const payload = (await response.json()) as ContentResponse<DocumentItem[]>;

        if (!response.ok || !payload.success) {
          throw new Error("No fue posible cargar la biblioteca.");
        }

        setDocuments(payload.data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No fue posible cargar la biblioteca.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(documents.map((item) => item.category))).sort((a, b) => a.localeCompare(b, "es"))],
    [documents]
  );

  const topics = useMemo(
    () => ["all", ...Array.from(new Set(documents.map((item) => item.topic))).sort((a, b) => a.localeCompare(b, "es"))],
    [documents]
  );

  const fileTypes = useMemo(
    () => ["all", ...Array.from(new Set(documents.map((item) => item.fileType))).sort((a, b) => a.localeCompare(b, "es"))],
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.title.toLowerCase().includes(query) ||
        item.topic.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory = category === "all" || item.category === category;
      const matchesTopic = topic === "all" || item.topic === topic;
      const matchesType = fileType === "all" || item.fileType === fileType;

      return matchesSearch && matchesCategory && matchesTopic && matchesType;
    });
  }, [category, documents, fileType, search, topic]);

  return (
    <article className="anx-panel anx-stack">
      <header className="anx-section-header">
        <h1>Biblioteca de documentos</h1>
      </header>

      <section className="anx-filters">
        <label>
          Buscar
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: solicitud, tasas, jubilación"
          />
        </label>

        <label>
          Categoría
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Todas" : item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tema
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Todos" : item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo
          <select value={fileType} onChange={(event) => setFileType(event.target.value)}>
            {fileTypes.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Todos" : item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading && <p className="anx-status">Cargando biblioteca...</p>}
      {error && <p className="anx-status anx-status-error">{error}</p>}

      {!loading && !error && (
        <>
          <p className="anx-results-count">{filteredDocuments.length} archivo(s) encontrado(s)</p>

          <div className="anx-table-wrap">
            <table className="anx-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Tema</th>
                  <th>Tipo</th>
                  <th>Vigencia</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="anx-table-title">{item.title}</div>
                      <small>{item.tags.join(" · ")}</small>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.topic}</td>
                    <td>{item.fileType.toUpperCase()}</td>
                    <td>{formatDate(item.publishedAt)}</td>
                    <td>
                      <a href={item.url} target="_blank" rel="noreferrer" className="anx-link-btn">
                        Descargar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </article>
  );
}
