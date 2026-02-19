import nodemailer, { type Transporter } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface ReadSmtpConfigOptions {
  strict?: boolean;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readFromAddress(): string | null {
  const rawFrom = process.env.SMTP_FROM?.trim();
  const accountEmail = process.env.SMTP_ACCOUNT_NAME?.trim();

  if (rawFrom && looksLikeEmail(rawFrom)) {
    return rawFrom;
  }

  if (rawFrom && accountEmail && looksLikeEmail(accountEmail)) {
    return `${rawFrom} <${accountEmail}>`;
  }

  if (accountEmail && looksLikeEmail(accountEmail)) {
    return accountEmail;
  }

  return rawFrom ?? null;
}

function parsePort(rawValue: string | undefined): number {
  if (!rawValue) {
    return 587;
  }

  const parsed = Number(rawValue.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 587;
  }

  return Math.floor(parsed);
}

export function readSmtpConfig(options?: ReadSmtpConfigOptions): SmtpConfig | null {
  const host =
    process.env.SMTP_HOST?.trim() ||
    process.env.SMTP_HOSTNAME?.trim() ||
    process.env.SMTP_IP?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = readFromAddress();
  const port = parsePort(process.env.SMTP_PORT?.trim() || process.env.SMTP_PORT_ALT?.trim());
  const secureRaw = process.env.SMTP_SECURE?.trim();
  const secure = secureRaw ? secureRaw === "true" : port === 465;

  if (!host || !user || !pass || !from) {
    if (options?.strict) {
      throw new Error(
        [
          "Faltan variables SMTP obligatorias.",
          "Requeridas: SMTP_HOST (o SMTP_HOSTNAME/SMTP_IP), SMTP_USER, SMTP_PASS, SMTP_FROM."
        ].join(" ")
      );
    }

    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from
  };
}

export function createSmtpTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

export async function verifySmtpConnection(config: SmtpConfig): Promise<void> {
  const transport = createSmtpTransport(config);
  await transport.verify();
}
