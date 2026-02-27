"use client";

import { useMemo, useState } from "react";
import type { JSX } from "react";
import styles from "@/sim-guion-prestamos/src/ui/prestamos-simulator.module.css";
import { formatCompactCurrency, formatCurrency } from "@/sim-guion-prestamos/src/domain/formatters";
import { toChartPoints } from "@/sim-guion-prestamos/src/domain/contracts";
import { usePrestamosIsolatedSimulator } from "@/sim-guion-prestamos/src/isolated/use-prestamos-isolated-simulator";

function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(parsed);
}

export default function PrestamosIsolatedSimulatorPage(): JSX.Element {
  const {
    lineas,
    selectedLinea,
    form,
    validation,
    simulation,
    simulationError,
    canSimulate,
    cuotasConsumo,
    affiliateOptions,
    affiliateLabels,
    rateModeLabels,
    maxCuotasPermitidas,
    updateLinea,
    updateMonto,
    updateCuotas,
    updateIngreso,
    updateTipoAfiliado,
    updateModalidadTasa,
    runSimulation,
    clearSimulation
  } = usePrestamosIsolatedSimulator();

  const [expandedLineaId, setExpandedLineaId] = useState<number | null>(selectedLinea?.id ?? null);

  const chartPoints = useMemo(
    () => toChartPoints(simulation?.data.cuadroDeMarcha ?? []).slice(0, 24),
    [simulation?.data.cuadroDeMarcha]
  );

  const maxChartValue = useMemo(
    () => chartPoints.reduce((max, item) => Math.max(max, item.cuota), 0),
    [chartPoints]
  );

  const montoSuggestions = useMemo(() => {
    if (!selectedLinea) {
      return [300_000, 500_000, 1_000_000, 2_500_000];
    }

    const candidates = [
      Math.round(selectedLinea.montoMaximo * 0.25),
      Math.round(selectedLinea.montoMaximo * 0.5),
      Math.round(selectedLinea.montoMaximo * 0.75),
      selectedLinea.montoMaximo
    ];

    return [...new Set(candidates)]
      .filter((amount) => amount >= selectedLinea.montoMinimo)
      .sort((a, b) => a - b)
      .slice(0, 4);
  }, [selectedLinea]);

  function handleLineaClick(lineaId: number): void {
    updateLinea(lineaId);
    setExpandedLineaId((prev) => (prev === lineaId ? null : lineaId));
  }

  function handleMontoChange(rawValue: string): void {
    const digits = rawValue.replace(/\D/g, "");
    updateMonto(digits);
  }

  function handleIngresoChange(rawValue: string): void {
    const digits = rawValue.replace(/\D/g, "");
    updateIngreso(digits);
  }

  const displayMonto = formatThousands(form.montoOtorgado);
  const displayIngreso = formatThousands(form.ingresoMensual);

  return (
    <section className={styles.root}>
      <div className={styles.shellGrid}>
        <aside className={styles.sideStack}>
          <article className={`anx-panel ${styles.sidePanel}`}>
            <h2>Seleccionar línea</h2>
            <p className="anx-results-count">{lineas.length} líneas disponibles</p>

            <div className={styles.lineaList}>
              {lineas.map((linea) => {
                const active = selectedLinea?.id === linea.id;
                const expanded = expandedLineaId === linea.id;

                return (
                  <div key={linea.id} className={`${styles.accordionItem} ${active ? styles.accordionItemActive : ""}`}>
                    <button
                      type="button"
                      className={styles.accordionHeader}
                      onClick={() => handleLineaClick(linea.id)}
                      aria-expanded={expanded}
                    >
                      <span className={styles.accordionArrow}>{expanded ? "▾" : "▸"}</span>
                      <strong>{linea.nombre}</strong>
                      <small>({linea.codigo})</small>
                    </button>

                    {expanded && (
                      <div className={styles.accordionBody}>
                        <p>{linea.descripcion}</p>

                        <div className={styles.badgeRow}>
                          <span className={styles.badge}>{linea.amortizacionSistema}</span>
                          <span className={styles.badge}>Máx. {linea.maxCuotas} cuotas</span>
                          <span className={styles.badge}>{linea.categoria}</span>
                          {linea.tasaModes.length > 1 && (
                            <span className={styles.badge}>Fija / Variable</span>
                          )}
                        </div>

                        <small>
                          Monto: {formatCurrency(linea.montoMinimo)} a {formatCurrency(linea.montoMaximo)}
                        </small>

                        <p className={styles.accordionDetail}>
                          Garantía: <strong>{linea.garantia}</strong>
                        </p>

                        {linea.restricciones.length > 0 && (
                          <ul className={styles.restrictionListCompact}>
                            {linea.restricciones.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        </aside>

        <main className={styles.mainStack}>
          <article className={`anx-panel ${styles.mainPanel}`}>
            <h2>Configurar simulación</h2>
            <div className={styles.formGrid}>
              <div className={styles.formColumns}>
                <label>
                  Tipo de afiliado
                  <select
                    value={form.tipoAfiliado}
                    onChange={(event) => updateTipoAfiliado(event.target.value as typeof form.tipoAfiliado)}
                  >
                    {affiliateOptions.map((affiliate) => (
                      <option key={affiliate} value={affiliate}>
                        {affiliateLabels[affiliate]}
                      </option>
                    ))}
                  </select>
                  {validation.tipoAfiliado && <p className={styles.fieldError}>{validation.tipoAfiliado}</p>}
                </label>

                <label>
                  Modalidad de tasa
                  <select
                    value={form.modalidadTasa}
                    onChange={(event) => updateModalidadTasa(event.target.value as typeof form.modalidadTasa)}
                  >
                    {(selectedLinea?.tasaModes ?? ["FIJA"]).map((mode) => (
                      <option key={mode} value={mode}>
                        {rateModeLabels[mode]}
                      </option>
                    ))}
                  </select>
                  {validation.modalidadTasa && <p className={styles.fieldError}>{validation.modalidadTasa}</p>}
                </label>
              </div>

              <div className={styles.formColumns}>
                <label>
                  Ingreso mensual declarado
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayIngreso}
                    onChange={(event) => handleIngresoChange(event.target.value)}
                    placeholder="Ej: 1.500.000"
                  />
                  {validation.ingresoMensual && <p className={styles.fieldError}>{validation.ingresoMensual}</p>}
                </label>

                {selectedLinea?.plazosDisponibles ? (
                  <label>
                    Cantidad de cuotas
                    <select
                      value={form.cantidadCuotas}
                      onChange={(event) => updateCuotas(event.target.value)}
                    >
                      {cuotasConsumo.map((cuota) => (
                        <option key={cuota} value={cuota}>
                          {cuota} cuotas
                        </option>
                      ))}
                    </select>
                    {validation.cantidadCuotas && <p className={styles.fieldError}>{validation.cantidadCuotas}</p>}
                  </label>
                ) : (
                  <label>
                    Cantidad de cuotas
                    <input
                      type="number"
                      min={1}
                      max={maxCuotasPermitidas || selectedLinea?.maxCuotas || 1}
                      value={form.cantidadCuotas}
                      onChange={(event) => updateCuotas(event.target.value)}
                    />
                    {validation.cantidadCuotas && <p className={styles.fieldError}>{validation.cantidadCuotas}</p>}
                  </label>
                )}
              </div>

              <label>
                Monto otorgado
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayMonto}
                  onChange={(event) => handleMontoChange(event.target.value)}
                  placeholder="Ej: 500.000"
                />
                {validation.montoOtorgado && <p className={styles.fieldError}>{validation.montoOtorgado}</p>}
              </label>

              <div className={styles.quickActions}>
                {montoSuggestions.map((amount) => (
                  <button key={amount} type="button" onClick={() => updateMonto(String(amount))}>
                    {formatCompactCurrency(amount)}
                  </button>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="anx-primary-btn"
                  onClick={runSimulation}
                  disabled={!canSimulate}
                >
                  Simular
                </button>

                <button type="button" className="anx-ghost-btn" onClick={clearSimulation}>
                  Limpiar resultado
                </button>

                <a
                  href="https://sps.cpceer.org.ar/prestamos/"
                  target="_blank"
                  rel="noreferrer"
                  className="anx-link-btn"
                >
                  Ver requisitos
                </a>
              </div>
            </div>
          </article>
        </main>
      </div>

      {simulationError && <p className="anx-status anx-status-error">{simulationError}</p>}

      {simulation && (
        <>
          <article className="anx-panel">
            <h2>Resultado de simulación</h2>
            <p className="anx-results-count">
              Línea {simulation.data.linea.nombre} · {simulation.data.resumen.cantidadCuotas} cuotas ·{" "}
              {simulation.data.resumen.sistemaAmortizacion}
            </p>

            <div className={styles.kpiGrid}>
              <div className={`${styles.kpi} ${styles.kpiPrimary}`}>
                <span>Total a pagar</span>
                <strong>{formatCurrency(simulation.data.resumen.totalAPagar)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Intereses</span>
                <strong>{formatCurrency(simulation.data.resumen.totalIntereses)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Monto acreditado</span>
                <strong>{formatCurrency(simulation.data.costosIniciales.montoAcreditado)}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Descuentos iniciales</span>
                <strong>{formatCurrency(simulation.data.costosIniciales.totalDescuentos)}</strong>
              </div>
            </div>
          </article>

          <article className={`anx-panel ${styles.chartCard}`}>
            <h2>Evolución de cuota (primeras 24)</h2>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>Cuota total</span>
              <span className={styles.legendItem}>Máximo: {formatCurrency(maxChartValue)}</span>
            </div>

            <div className={styles.barScroll}>
              {chartPoints.map((point) => {
                const height = maxChartValue > 0 ? (point.cuota / maxChartValue) * 100 : 0;

                return (
                  <div
                    key={point.nroCuota}
                    className={styles.barGroup}
                    title={`Cuota ${point.nroCuota}: ${formatCurrency(point.cuota)}`}
                  >
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ height: `${height}%` }} />
                    </div>
                    <span className={styles.barLabel}>{point.nroCuota}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="anx-panel">
            <h2>Cuadro de marcha</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cuota</th>
                    <th>Vencimiento</th>
                    <th>Capital pendiente</th>
                    <th>Amortización</th>
                    <th>Intereses</th>
                    <th>Cuota total</th>
                    <th>Capital restante</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.data.cuadroDeMarcha.map((item) => (
                    <tr key={item.nroCuota}>
                      <td>{item.nroCuota}</td>
                      <td>{item.fechaVencimientoEstimada}</td>
                      <td>{formatCurrency(item.capitalPendiente)}</td>
                      <td>{formatCurrency(item.amortizacion)}</td>
                      <td>{formatCurrency(item.intereses)}</td>
                      <td>{formatCurrency(item.cuota)}</td>
                      <td>{formatCurrency(item.capitalRestante)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
