"use client";

import { useMemo, useEffect, useState } from "react";
import type { JSX } from "react";
import styles from "@/sim-guion-prestamos/src/ui/prestamos-simulator.module.css";
import { formatCurrency } from "@/sim-guion-prestamos/src/domain/formatters";
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
    financialInfo,
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
  const [resultOpen, setResultOpen] = useState(false);

  useEffect(() => {
    if (simulation) {
      setResultOpen(true);
    }
  }, [simulation]);

  const chartPoints = useMemo(
    () => toChartPoints(simulation?.data.cuadroDeMarcha ?? []).slice(0, 24),
    [simulation?.data.cuadroDeMarcha]
  );

  const maxChartValue = useMemo(
    () => chartPoints.reduce((max, item) => Math.max(max, item.cuota), 0),
    [chartPoints]
  );

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

  function handleSimulate(): void {
    runSimulation();
  }

  function handleClear(): void {
    clearSimulation();
    setResultOpen(false);
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

              {financialInfo && (
                <div className={styles.financeChips}>
                  <span className={styles.financeChip}>TNA {financialInfo.tna}%</span>
                  <span className={styles.financeChip}>TEM {financialInfo.tem}%</span>
                  <span className={styles.financeChip}>{financialInfo.sistema === "FRANCES" ? "Francés" : "Alemán"}</span>
                  {financialInfo.fondoQuebranto > 0 && (
                    <span className={styles.financeChip}>Quebranto {financialInfo.fondoQuebranto}%</span>
                  )}
                  {financialInfo.gastosAdmin > 0 && (
                    <span className={styles.financeChip}>Gastos admin. {financialInfo.gastosAdmin}%</span>
                  )}
                  {financialInfo.sellado > 0 && (
                    <span className={styles.financeChip}>Sellado {financialInfo.sellado}%</span>
                  )}
                  {financialInfo.seguroVida > 0 && (
                    <span className={styles.financeChip}>Seguro vida {financialInfo.seguroVida}%</span>
                  )}
                  {financialInfo.fondoQuebranto === 0 && financialInfo.gastosAdmin === 0 && financialInfo.sellado === 0 && financialInfo.seguroVida === 0 && (
                    <span className={styles.financeChip}>Sin costos iniciales</span>
                  )}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.simulateBtn}
                  onClick={handleSimulate}
                  disabled={!canSimulate}
                >
                  Simular
                </button>

                <button type="button" className="anx-ghost-btn" onClick={handleClear}>
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

      {simulation && !resultOpen && (
        <div
          className={styles.resultMinBar}
          onClick={() => setResultOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter") setResultOpen(true); }}
        >
          <span>
            Resultado — {simulation.data.linea.nombre} · {simulation.data.resumen.cantidadCuotas} cuotas
          </span>
          <span className={styles.resultMinBarArrow}>▲</span>
        </div>
      )}

      {simulation && (
        <>
          <div
            className={`${styles.resultBackdrop} ${resultOpen ? styles.resultBackdropVisible : ""}`}
            onClick={() => setResultOpen(false)}
          />

          <div className={`${styles.resultSheet} ${resultOpen ? styles.resultSheetOpen : ""}`}>
            <button
              type="button"
              className={styles.resultSheetHandle}
              onClick={() => setResultOpen(false)}
            >
              <span>
                Resultado simulación — {simulation.data.linea.nombre} · {simulation.data.resumen.cantidadCuotas} cuotas · {simulation.data.resumen.sistemaAmortizacion}
              </span>
              <span className={styles.resultSheetHandleArrow}>▼</span>
            </button>

            <div className={styles.resultSheetBody}>
              <div className={styles.resultSectionCard}>
                <h3>Resumen</h3>
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
                    <span>Acreditado</span>
                    <strong>{formatCurrency(simulation.data.costosIniciales.montoAcreditado)}</strong>
                  </div>
                  <div className={styles.kpi}>
                    <span>Descuentos</span>
                    <strong>{formatCurrency(simulation.data.costosIniciales.totalDescuentos)}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.resultSectionCard}>
                <h3>Evolución de cuota (primeras 24)</h3>
                <div className={styles.chartLegend}>
                  <span className={styles.chartLegendItem}>
                    <span className={`${styles.chartLegendDot} ${styles.chartLegendDotInterest}`} />
                    Intereses
                  </span>
                  <span className={styles.chartLegendItem}>
                    <span className={`${styles.chartLegendDot} ${styles.chartLegendDotCapital}`} />
                    Capital
                  </span>
                </div>
                <div className={styles.barScroll}>
                  {chartPoints.map((point) => {
                    const totalHeight = maxChartValue > 0 ? (point.cuota / maxChartValue) * 100 : 0;
                    const interestRatio = point.cuota > 0 ? point.intereses / point.cuota : 0;
                    const capitalRatio = point.cuota > 0 ? point.amortizacion / point.cuota : 0;
                    const interestHeight = totalHeight * interestRatio;
                    const capitalHeight = totalHeight * capitalRatio;

                    return (
                      <div
                        key={point.nroCuota}
                        className={styles.barGroup}
                        title={`Cuota ${point.nroCuota}: ${formatCurrency(point.cuota)} (Capital: ${formatCurrency(point.amortizacion)}, Interés: ${formatCurrency(point.intereses)})`}
                      >
                        <div className={styles.barTrack}>
                          <div className={styles.barFillInterest} style={{ height: `${interestHeight}%` }} />
                          <div className={styles.barFillCapital} style={{ height: `${capitalHeight}%` }} />
                        </div>
                        <span className={styles.barLabel}>{point.nroCuota}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.resultSectionCard}>
                <h3>Tabla de Cuotas</h3>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Cuota</th>
                        <th>Cuota total</th>
                        <th>Amortización</th>
                        <th>Intereses</th>
                        <th>Capital restante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.data.cuadroDeMarcha.map((item) => (
                        <tr key={item.nroCuota}>
                          <td><span className={styles.cuotaChip}>{item.nroCuota}</span></td>
                          <td><span className={styles.cuotaTotalChip}>{formatCurrency(item.cuota)}</span></td>
                          <td>{formatCurrency(item.amortizacion)}</td>
                          <td>{formatCurrency(item.intereses)}</td>
                          <td>{formatCurrency(item.capitalRestante)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
