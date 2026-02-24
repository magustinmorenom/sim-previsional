import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createFakeChallenge } from "@/app/api/fake/v1/auth/challenges/route";
import { POST as verifyFakeSession } from "@/app/api/fake/v1/auth/sessions/route";
import { GET as getFakeContext } from "@/app/api/fake/v1/affiliates/simulation-context/route";

describe("fake API routes", () => {
  const envBackup = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM
  };

  beforeEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  afterEach(() => {
    restoreEnv("SMTP_HOST", envBackup.SMTP_HOST);
    restoreEnv("SMTP_PORT", envBackup.SMTP_PORT);
    restoreEnv("SMTP_SECURE", envBackup.SMTP_SECURE);
    restoreEnv("SMTP_USER", envBackup.SMTP_USER);
    restoreEnv("SMTP_PASS", envBackup.SMTP_PASS);
    restoreEnv("SMTP_FROM", envBackup.SMTP_FROM);
  });

  it("crea challenge OTP fake para amoreno@odin.ar y permite validar código", async () => {
    const challengeRequest = new Request("http://localhost/api/fake/v1/auth/challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "amoreno@odin.ar"
      })
    });

    const challengeResponse = await createFakeChallenge(challengeRequest);
    const challengeBody = await challengeResponse.json();

    expect(challengeResponse.status).toBe(200);
    expect(challengeBody.challengeId).toBeTypeOf("string");
    expect(challengeBody.devOtpCode).toMatch(/^\d{6}$/);

    const sessionRequest = new Request("http://localhost/api/fake/v1/auth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        challengeId: challengeBody.challengeId,
        code: challengeBody.devOtpCode
      })
    });

    const sessionResponse = await verifyFakeSession(sessionRequest);
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.authenticated).toBe(true);
    expect(sessionBody.email).toBe("amoreno@odin.ar");
  });

  it("expone contexto fake para ambos correos habilitados", async () => {
    const requestOne = new Request(
      "http://localhost/api/fake/v1/affiliates/simulation-context?email=amoreno@odin.ar",
      {
        method: "GET"
      }
    );
    const responseOne = await getFakeContext(requestOne);
    const bodyOne = await responseOne.json();

    expect(responseOne.status).toBe(200);
    expect(bodyOne.success).toBe(true);
    expect(bodyOne.data.titular.email).toBe("amoreno@odin.ar");
    expect(bodyOne.data.titular.nombre).toBeTruthy();
    expect(bodyOne.data.valorVAR).toBeTypeOf("number");
    expect(bodyOne.data.valorMRS).toBeTypeOf("number");

    const requestTwo = new Request(
      "http://localhost/api/fake/v1/affiliates/simulation-context?email=magustin.morenom@gmail.com",
      {
        method: "GET"
      }
    );
    const responseTwo = await getFakeContext(requestTwo);
    const bodyTwo = await responseTwo.json();

    expect(responseTwo.status).toBe(200);
    expect(bodyTwo.success).toBe(true);
    expect(bodyTwo.data.titular.email).toBe("magustin.morenom@gmail.com");
    expect(bodyTwo.data.titular.nombre).toBeTruthy();
    expect(Array.isArray(bodyTwo.data.grupoFamiliar)).toBe(true);
    expect(bodyTwo.data.cuentaCapitalizacion.saldoTotal).toBeTypeOf("number");
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
