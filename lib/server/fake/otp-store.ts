import { randomUUID } from "node:crypto";

const OTP_EXPIRY_SECONDS = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;

export interface FakeOtpChallenge {
  challengeId: string;
  email: string;
  code: string;
  attempts: number;
  maxAttempts: number;
  expiresAtMs: number;
  createdAtMs: number;
}

const globalState = globalThis as typeof globalThis & {
  __fakeOtpStore?: Map<string, FakeOtpChallenge>;
  __fakeOtpByEmail?: Map<string, string>;
};

const challengeStore = globalState.__fakeOtpStore ?? new Map<string, FakeOtpChallenge>();
globalState.__fakeOtpStore = challengeStore;

const challengeByEmail = globalState.__fakeOtpByEmail ?? new Map<string, string>();
globalState.__fakeOtpByEmail = challengeByEmail;

function nowMs(): number {
  return Date.now();
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

export function createFakeOtpChallenge(email: string): FakeOtpChallenge {
  clearExpiredChallenges();

  const normalizedEmail = normalizeEmail(email);
  const existingChallengeId = challengeByEmail.get(normalizedEmail);
  if (existingChallengeId) {
    const existing = challengeStore.get(existingChallengeId);
    if (existing) {
      challengeStore.delete(existingChallengeId);
      challengeByEmail.delete(normalizedEmail);
    }
  }

  const now = nowMs();
  const challenge: FakeOtpChallenge = {
    challengeId: randomUUID(),
    email: normalizedEmail,
    code: generateCode(),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAtMs: now + OTP_EXPIRY_SECONDS * 1000,
    createdAtMs: now
  };

  challengeStore.set(challenge.challengeId, challenge);
  challengeByEmail.set(normalizedEmail, challenge.challengeId);

  return challenge;
}

export function verifyFakeOtpCode(payload: {
  challengeId: string;
  code: string;
}):
  | { ok: true; email: string }
  | { ok: false; status: 400 | 401 | 410 | 429; error: string; code: string } {
  clearExpiredChallenges();

  const challenge = challengeStore.get(payload.challengeId);
  if (!challenge) {
    return {
      ok: false,
      status: 401,
      error: "El desafío del código de un solo uso no es válido o ya expiró.",
      code: "FAKE_OTP_CHALLENGE_NOT_FOUND"
    };
  }

  if (challenge.expiresAtMs <= nowMs()) {
    challengeStore.delete(challenge.challengeId);
    challengeByEmail.delete(challenge.email);
    return {
      ok: false,
      status: 410,
      error: "El código de un solo uso expiró. Solicitá uno nuevo.",
      code: "FAKE_OTP_EXPIRED"
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challengeStore.delete(challenge.challengeId);
    challengeByEmail.delete(challenge.email);
    return {
      ok: false,
      status: 429,
      error: "Se alcanzó el máximo de intentos para este código de un solo uso.",
      code: "FAKE_OTP_MAX_ATTEMPTS"
    };
  }

  if (challenge.code !== payload.code) {
    challenge.attempts += 1;

    if (challenge.attempts >= challenge.maxAttempts) {
      challengeStore.delete(challenge.challengeId);
      challengeByEmail.delete(challenge.email);
      return {
        ok: false,
        status: 429,
        error: "Se alcanzó el máximo de intentos para este código de un solo uso.",
        code: "FAKE_OTP_MAX_ATTEMPTS"
      };
    }

    challengeStore.set(challenge.challengeId, challenge);

    return {
      ok: false,
      status: 401,
      error: "Código de un solo uso incorrecto.",
      code: "FAKE_OTP_INVALID"
    };
  }

  challengeStore.delete(challenge.challengeId);
  challengeByEmail.delete(challenge.email);

  return {
    ok: true,
    email: challenge.email
  };
}

export function getFakeOtpChallengeMetadata(challengeId: string): {
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
} | null {
  clearExpiredChallenges();
  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return null;
  }

  return {
    expiresInSeconds: Math.max(1, Math.ceil((challenge.expiresAtMs - nowMs()) / 1000)),
    resendAvailableInSeconds: 0
  };
}

export function getFakeOtpDebugCode(challengeId: string): string | null {
  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return null;
  }

  return challenge.code;
}
