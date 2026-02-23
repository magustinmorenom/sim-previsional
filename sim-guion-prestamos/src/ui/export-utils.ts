import type { ScenarioSnapshot } from "@/sim-guion-prestamos/src/domain/contracts";
import { formatCurrency, formatIsoDate } from "@/sim-guion-prestamos/src/domain/formatters";

function escapeCsvCell(value: string | number): string {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

export function buildScenarioCsv(snapshot: ScenarioSnapshot): string {
  const header = [
    "Linea",
    "Codigo",
    "Monto solicitado",
    "Cuotas",
    "Sistema",
    "Total a pagar",
    "Total intereses",
    "Costos iniciales",
    "Monto neto"
  ];

  const summary = [
    snapshot.linea.nombre,
    snapshot.linea.codigo,
    formatCurrency(snapshot.request.montoOtorgado),
    snapshot.request.cantidadCuotas,
    snapshot.response.amortizacion.sistemaAmortizacion,
    formatCurrency(snapshot.response.amortizacion.resumen.totalAPagar),
    formatCurrency(snapshot.response.amortizacion.resumen.totalIntereses),
    formatCurrency(snapshot.response.costosIniciales.total),
    formatCurrency(snapshot.response.costosIniciales.montoNeto)
  ];

  const rows = snapshot.response.amortizacion.cuadroDeMarcha.map((item) => [
    item.numeroCuota,
    item.capitalPendiente,
    item.amortizacion,
    item.intereses,
    item.cuota,
    item.capitalRestante
  ]);

  const lines = [
    header.map(escapeCsvCell).join(","),
    summary.map(escapeCsvCell).join(","),
    "",
    [
      "Nro cuota",
      "Capital pendiente",
      "Amortización",
      "Intereses",
      "Cuota",
      "Capital restante"
    ].map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(","))
  ];

  return lines.join("\n");
}

export function triggerCsvDownload(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function openPrintableScenario(snapshot: ScenarioSnapshot): void {
  const printableWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
  if (!printableWindow) {
    return;
  }

  const rows = snapshot.response.amortizacion.cuadroDeMarcha
    .map(
      (item) => `
        <tr>
          <td>${item.numeroCuota}</td>
          <td>${formatCurrency(item.capitalPendiente)}</td>
          <td>${formatCurrency(item.amortizacion)}</td>
          <td>${formatCurrency(item.intereses)}</td>
          <td>${formatCurrency(item.cuota)}</td>
          <td>${formatCurrency(item.capitalRestante)}</td>
        </tr>
      `
    )
    .join("");

  printableWindow.document.write(`
    <html>
      <head>
        <title>Simulación ${snapshot.linea.codigo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 22px; color: #0f2f58; }
          h1 { margin: 0 0 8px; }
          p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #d8e4f1; padding: 6px; text-align: left; }
          th { background: #edf5ff; }
        </style>
      </head>
      <body>
        <h1>Simulación de préstamo</h1>
        <p><strong>Línea:</strong> ${snapshot.linea.nombre} (${snapshot.linea.codigo})</p>
        <p><strong>Monto:</strong> ${formatCurrency(snapshot.request.montoOtorgado)} - <strong>Cuotas:</strong> ${snapshot.request.cantidadCuotas}</p>
        <p><strong>Fecha:</strong> ${formatIsoDate(snapshot.createdAtIso)}</p>
        <p><strong>Total a pagar:</strong> ${formatCurrency(snapshot.response.amortizacion.resumen.totalAPagar)}</p>
        <p><strong>Total intereses:</strong> ${formatCurrency(snapshot.response.amortizacion.resumen.totalIntereses)}</p>
        <p><strong>Costos iniciales:</strong> ${formatCurrency(snapshot.response.costosIniciales.total)}</p>

        <table>
          <thead>
            <tr>
              <th>Nro cuota</th>
              <th>Capital pendiente</th>
              <th>Amortización</th>
              <th>Intereses</th>
              <th>Cuota</th>
              <th>Capital restante</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}
