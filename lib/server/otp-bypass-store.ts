import { randomUUID } from "node:crypto";

const DEFAULT_OTP_EXPIRY_SECONDS = 10 * 60;

interface BypassOtpChallenge {
  challengeId: string;
  email: string;
  code: string;
  createdAtMs: number;
  expiresAtMs: number;
}

type GlobalOtpStore = typeof globalThis & {
  __otpBypassStore?: Map<string, BypassOtpChallenge>;
  __otpBypassByEmail?: Map<string, string>;
};

const globalState = globalThis as GlobalOtpStore;
const challengeStore = globalState.__otpBypassStore ?? new Map<string, BypassOtpChallenge>();
const challengeByEmail = globalState.__otpBypassByEmail ?? new Map<string, string>();

globalState.__otpBypassStore = challengeStore;
globalState.__otpBypassByEmail = challengeByEmail;

function nowMs(): number {
  return Date.now();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function clearExpiredChallenges(): void {
  const now = nowMs();

  for (const [challengeId, challenge] of challengeStore.entries()) {
    if (challenge.expiresAtMs <= now) {
      challengeStore.delete(challengeId);
      challengeByEmail.delete(challenge.email);
    }
  }
}

export function createBypassOtpChallenge(payload: { email: string; expiresInSeconds?: number }): {
  challengeId: string;
  code: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
} {
  clearExpiredChallenges();

  const normalizedEmail = normalizeEmail(payload.email);
  const previousChallengeId = challengeByEmail.get(normalizedEmail);

  if (previousChallengeId) {
    challengeStore.delete(previousChallengeId);
    challengeByEmail.delete(normalizedEmail);
  }

  const ttl =
    typeof payload.expiresInSeconds === "number" && Number.isFinite(payload.expiresInSeconds)
      ? Math.max(1, Math.floor(payload.expiresInSeconds))
      : DEFAULT_OTP_EXPIRY_SECONDS;

  const now = nowMs();
  const challenge: BypassOtpChallenge = {
    challengeId: randomUUID(),
    email: normalizedEmail,
    code: generateCode(),
    createdAtMs: now,
    expiresAtMs: now + ttl * 1000
  };

  challengeStore.set(challenge.challengeId, challenge);
  challengeByEmail.set(normalizedEmail, challenge.challengeId);

  return {
    challengeId: challenge.challengeId,
    code: challenge.code,
    expiresInSeconds: Math.max(1, Math.ceil((challenge.expiresAtMs - nowMs()) / 1000)),
    resendAvailableInSeconds: 0
  };
}

export function verifyBypassOtpChallenge(payload: {
  challengeId: string;
  email: string;
  code: string;
}):
  | { ok: true; email: string }
  | { ok: false; status: 401 | 410; code: string; error: string } {
  clearExpiredChallenges();

  const challenge = challengeStore.get(payload.challengeId);
  const normalizedEmail = normalizeEmail(payload.email);

  if (!challenge || challenge.email !== normalizedEmail) {
    return {
      ok: false,
      status: 401,
      code: "OTP_BYPASS_CHALLENGE_NOT_FOUND",
      error: "El desafío del código de un solo uso no es válido o ya expiró."
    };
  }

  if (challenge.expiresAtMs <= nowMs()) {
    challengeStore.delete(challenge.challengeId);
    challengeByEmail.delete(challenge.email);

    return {
      ok: false,
      status: 410,
      code: "OTP_BYPASS_EXPIRED",
      error: "El código de un solo uso expiró. Solicitá uno nuevo."
    };
  }

  if (challenge.code !== payload.code) {
    return {
      ok: false,
      status: 401,
      code: "OTP_BYPASS_INVALID",
      error: "Código de un solo uso incorrecto."
    };
  }

  challengeStore.delete(challenge.challengeId);
  challengeByEmail.delete(challenge.email);

  return {
    ok: true,
    email: challenge.email
  };
}
