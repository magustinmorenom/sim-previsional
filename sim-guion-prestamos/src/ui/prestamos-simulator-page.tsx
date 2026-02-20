"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { JSX } from "react";
import styles from "@/sim-guion-prestamos/src/ui/prestamos-simulator.module.css";
import {
  formatCompactCurrency,
  formatCurrency,
  formatIsoDate,
  formatPercent
} from "@/sim-guion-prestamos/src/domain/formatters";
import { toChartPoints } from "@/sim-guion-prestamos/src/domain/contracts";
import { buildScenarioCsv, openPrintableScenario, triggerCsvDownload } from "@/sim-guion-prestamos/src/ui/export-utils";
import { usePrestamosSimulator } from "@/sim-guion-prestamos/src/ui/use-prestamos-simulator";

export default function PrestamosSimulatorPage(): JSX.Element {
  const {
    bootstrap,
    loadingBootstrap,
    bootstrapError,
    lineas,
    selectedLinea,
    form,
    validation,
    simulation,
    simulationError,
    simulating,
    canSimulate,
    scenarios,
    updateLinea,
    updateMonto,
    updateCuotas,
    runSimulation,
    clearSimulation,
    saveCurrentScenario,
    removeScenario
  } = usePrestamosSimulator();

  const chartPoints = useMemo(
    () => toChartPoints(simulation?.data.cuadroDeMarcha ?? []).slice(0, 24),
    [simulation?.data.cuadroDeMarcha]
  );

  const maxChartValue = useMemo(
    () => chartPoints.reduce((max, item) => Math.max(max, item.cuota), 0),
    [chartPoints]
  );

  const currentScenario = useMemo(() => {
    if (!selectedLinea || !simulation) {
      return null;
    }

    return {
      id: "current",
      titulo: `${selectedLinea.codigo} · ${form.cantidadCuotas} cuotas`,
      linea: selectedLinea,
      request: {
        lineaPrestamoId: selectedLinea.id,
        montoOtorgado: Number(form.montoOtorgado),
        cantidadCuotas: Number(form.cantidadCuotas)
      },
      response: simulation,
      createdAtIso: new Date().toISOString()
    };
  }, [selectedLinea, simulation, form.cantidadCuotas, form.montoOtorgado]);

  const cuotasConsumo = selectedLinea?.esConsumo ? selectedLinea.plazosDisponibles ?? [] : [];

  const sourceCatalogo = bootstrap?.catalogoSource ?? "unknown";
  const sourceTasas = bootstrap?.tasasSource ?? "unknown";

  return (
    <section className={styles.root}>
      <article className={`anx-panel ${styles.hero}`}>
        <h1>Simulador de préstamos</h1>
        <p>
          Simulá líneas activas, compará escenarios y exportá resultados. La elegibilidad final se
          confirma con validaciones operativas del SPS.
        </p>
        <div className={styles.sourcePills}>
          <span className={styles.sourceBadge}>Catálogo: {sourceCatalogo}</span>
          <span className={styles.sourceBadge}>Tasas: {sourceTasas}</span>
          {bootstrap?.catalogo.data.meta && (
            <span className={styles.sourceBadge}>
              Generado: {formatIsoDate(bootstrap.catalogo.data.meta.generadoEn)}
            </span>
          )}
        </div>
      </article>

      <p className={styles.warning}>
        Se muestran todas las líneas disponibles. La condición final del afiliado se valida en la capa de negocio al confirmar la solicitud.
      </p>

      {loadingBootstrap && <p className="anx-status">Cargando catálogo y tasas de préstamos...</p>}
      {bootstrapError && <p className="anx-status anx-status-error">{bootstrapError}</p>}

      {!loadingBootstrap && !bootstrapError && (
        <div className={styles.shellGrid}>
          <aside className={styles.sideStack}>
            <article className="anx-panel">
              <h2>Seleccionar línea</h2>
              <p className="anx-results-count">{lineas.length} líneas disponibles para simulación.</p>

              <div className={styles.lineaList}>
                {lineas.map((linea) => {
                  const active = selectedLinea?.id === linea.id;

                  return (
                    <button
                      key={linea.id}
                      type="button"
                      className={`${styles.lineaButton} ${active ? styles.lineaButtonActive : ""}`}
                      onClick={() => updateLinea(linea.id)}
                    >
                      <strong>
                        {linea.nombre} <small>({linea.codigo})</small>
                      </strong>
                      <p>{linea.descripcion}</p>

                      <div className={styles.badgeRow}>
                        <span className={styles.badge}>{linea.amortizacion.sistema}</span>
                        <span className={styles.badge}>Máx. {linea.limites.maxCuotas} cuotas</span>
                        <span className={styles.badge}>{formatPercent(linea.tasa.tea)} TEA</span>
                        {linea.tasa.tipo === "VARIABLE" && (
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>Cuota variable</span>
                        )}
                      </div>
                      <small>
                        Monto: {formatCurrency(linea.limites.montoMinimo)} a {formatCurrency(linea.limites.montoMaximo)}
                      </small>
                    </button>
                  );
                })}
              </div>
            </article>

            {bootstrap?.tasas?.data && (
              <article className="anx-panel anx-rate-card">
                <h2>Tasas vigentes</h2>
                <p>
                  Pública: <strong>{formatPercent(bootstrap.tasas.data.tasaPublica.valor)}</strong> ·
                  Variable: <strong>{formatPercent(bootstrap.tasas.data.tasaVariable.badlar)} + {bootstrap.tasas.data.tasaVariable.factor}</strong>
                </p>
                <small>
                  Vigencia: {formatIsoDate(bootstrap.tasas.data.ultimaActualizacion)}
                </small>
              </article>
            )}
          </aside>

          <main className={styles.mainStack}>
            <article className="anx-panel">
              <h2>Configurar simulación</h2>
              <div className={styles.formGrid}>
                <label>
                  Línea de préstamo
                  <select
                    value={selectedLinea?.id ?? ""}
                    onChange={(event) => updateLinea(Number(event.target.value))}
                  >
                    {lineas.map((linea) => (
                      <option key={linea.id} value={linea.id}>
                        {linea.nombre} ({linea.codigo})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Monto otorgado
                  <input
                    type="text"
                    value={form.montoOtorgado}
                    onChange={(event) => updateMonto(event.target.value)}
                    placeholder="Ej: 500000"
                  />
                  {validation.montoOtorgado && <p className={styles.fieldError}>{validation.montoOtorgado}</p>}
                </label>

                {selectedLinea?.esConsumo ? (
                  <label>
                    Cantidad de cuotas (plazos fijos)
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
                      max={selectedLinea?.limites.maxCuotas ?? 1}
                      value={form.cantidadCuotas}
                      onChange={(event) => updateCuotas(event.target.value)}
                    />
                    {validation.cantidadCuotas && <p className={styles.fieldError}>{validation.cantidadCuotas}</p>}
                  </label>
                )}

                <div className={styles.quickActions}>
                  {[300000, 500000, 1000000, 2500000].map((amount) => (
                    <button key={amount} type="button" onClick={() => updateMonto(String(amount))}>
                      {formatCompactCurrency(amount)}
                    </button>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className="anx-primary-btn"
                    onClick={() => void runSimulation()}
                    disabled={!canSimulate}
                  >
                    {simulating ? "Simulando..." : "Simular"}
                  </button>

                  <button type="button" className="anx-ghost-btn" onClick={clearSimulation}>
                    Limpiar resultado
                  </button>

                  <Link href="/app/biblioteca" className="anx-link-btn">
                    Ver requisitos
                  </Link>
                </div>
              </div>
            </article>

            {simulationError && <p className="anx-status anx-status-error">{simulationError}</p>}

            {simulation && (
              <>
                <article className="anx-panel">
                  <h2>Resultado de simulación</h2>
                  <p className="anx-results-count">
                    Línea {simulation.data.linea.nombre} · {simulation.data.resumen.cantidadCuotas} cuotas · {simulation.data.resumen.sistemaAmortizacion}
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

                  <div className={styles.actions}>
                    <button type="button" className="anx-primary-btn" onClick={saveCurrentScenario}>
                      Guardar escenario
                    </button>

                    <button
                      type="button"
                      className="anx-ghost-btn"
                      disabled={!currentScenario}
                      onClick={() => {
                        if (!currentScenario) {
                          return;
                        }

                        const csv = buildScenarioCsv(currentScenario);
                        triggerCsvDownload(`simulacion-${currentScenario.linea.codigo}.csv`, csv);
                      }}
                    >
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      className="anx-ghost-btn"
                      disabled={!currentScenario}
                      onClick={() => {
                        if (currentScenario) {
                          openPrintableScenario(currentScenario);
                        }
                      }}
                    >
                      Imprimir
                    </button>
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
                        <div key={point.nroCuota} className={styles.barGroup} title={`Cuota ${point.nroCuota}: ${formatCurrency(point.cuota)}`}>
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

            <article className="anx-panel">
              <h2>Comparador de escenarios</h2>
              <p className="anx-results-count">Guardá hasta 3 escenarios para comparar montos, cuotas y costos finales.</p>

              {scenarios.length === 0 && (
                <p className={styles.emptyState}>Todavía no hay escenarios guardados.</p>
              )}

              <div className={styles.compareList}>
                {scenarios.map((scenario) => (
                  <article key={scenario.id} className={styles.compareItem}>
                    <div className={styles.compareHead}>
                      <strong>{scenario.titulo}</strong>
                      <button
                        type="button"
                        className="anx-ghost-btn"
                        onClick={() => removeScenario(scenario.id)}
                      >
                        Quitar
                      </button>
                    </div>

                    <div className={styles.compareMeta}>
                      <span>Monto: {formatCurrency(scenario.request.montoOtorgado)}</span>
                      <span>Total: {formatCurrency(scenario.response.data.resumen.totalAPagar)}</span>
                      <span>Intereses: {formatCurrency(scenario.response.data.resumen.totalIntereses)}</span>
                      <span>Cuotas: {scenario.request.cantidadCuotas}</span>
                    </div>

                    <div className={styles.compareActions}>
                      <button
                        type="button"
                        className="anx-ghost-btn"
                        onClick={() => {
                          const csv = buildScenarioCsv(scenario);
                          triggerCsvDownload(`simulacion-${scenario.linea.codigo}-${scenario.request.cantidadCuotas}.csv`, csv);
                        }}
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        className="anx-ghost-btn"
                        onClick={() => openPrintableScenario(scenario)}
                      >
                        Imprimir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </main>
        </div>
      )}
    </section>
  );
}
