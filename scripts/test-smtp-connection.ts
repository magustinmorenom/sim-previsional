import { loadEnvConfig } from "@next/env";
import {
  createSmtpTransport,
  readSmtpConfig
} from "../lib/server/fake/smtp-client";

function formatMasked(value: string): string {
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

function shouldSendTestEmail(args: string[]): boolean {
  return args.includes("--send");
}

function readToAddress(args: string[], fallback: string): string {
  const toFlagIndex = args.indexOf("--to");
  if (toFlagIndex >= 0 && args[toFlagIndex + 1]) {
    return args[toFlagIndex + 1].trim();
  }

  return fallback;
}

function printHelp(): void {
  console.log("Uso:");
  console.log("  npm run smtp:test");
  console.log("  npm run smtp:test -- --send");
  console.log("  npm run smtp:test -- --send --to correo@dominio.com");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  loadEnvConfig(process.cwd());
  const config = readSmtpConfig({ strict: true });
  if (!config) {
    throw new Error("No se pudo leer configuración SMTP.");
  }

  console.log("Probando conexión SMTP con:");
  console.log(`- host: ${config.host}`);
  console.log(`- port: ${config.port}`);
  console.log(`- secure: ${String(config.secure)}`);
  console.log(`- user: ${formatMasked(config.user)}`);
  console.log(`- from: ${config.from}`);

  const transport = createSmtpTransport(config);

  await transport.verify();
  console.log("OK: conexión SMTP verificada.");

  if (!shouldSendTestEmail(args)) {
    return;
  }

  const to = readToAddress(args, config.from);

  await transport.sendMail({
    from: config.from,
    to,
    subject: "Prueba SMTP - Simulador Previsional",
    text: [
      "Este es un correo de prueba para validar la configuración SMTP.",
      "",
      `Host: ${config.host}`,
      `Puerto: ${config.port}`,
      `Secure: ${String(config.secure)}`
    ].join("\n")
  });

  console.log(`OK: correo de prueba enviado a ${to}.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR SMTP: ${message}`);
  process.exitCode = 1;
});
