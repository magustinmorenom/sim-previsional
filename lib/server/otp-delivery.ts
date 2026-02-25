export type OtpDeliveryMode = "live" | "bypass";

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function resolveConfiguredMode(): OtpDeliveryMode {
  const raw = process.env.OTP_DELIVERY_MODE?.trim().toLowerCase();

  if (!raw) {
    return "live";
  }

  if (raw === "bypass" || raw === "local" || raw === "dev") {
    return "bypass";
  }

  return "live";
}

function isBypassAllowedInEnvironment(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return parseBoolean(process.env.OTP_BYPASS_ALLOW_IN_PROD);
}

function parseAllowedEmails(): Set<string> {
  const raw = process.env.OTP_BYPASS_ALLOWED_EMAILS;
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getOtpDeliveryMode(): OtpDeliveryMode {
  const configured = resolveConfiguredMode();

  if (configured === "bypass" && !isBypassAllowedInEnvironment()) {
    return "live";
  }

  return configured;
}

export function isOtpBypassMode(): boolean {
  return getOtpDeliveryMode() === "bypass";
}

export function isOtpBypassEmailAllowed(email: string): boolean {
  const allowed = parseAllowedEmails();
  if (allowed.size === 0) {
    return true;
  }

  return allowed.has(email.trim().toLowerCase());
}
