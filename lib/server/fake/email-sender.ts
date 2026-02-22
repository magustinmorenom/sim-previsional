import {
  createSmtpTransport,
  readSmtpConfig,
  verifySmtpConnection
} from "@/lib/server/fake/smtp-client";

const OTP_EXPIRY_MINUTES = 10;

export async function sendOtpByEmail(payload: {
  to: string;
  code: string;
  challengeId: string;
}): Promise<{ delivered: boolean; devMode: boolean }> {
  const config = readSmtpConfig();

  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[FAKE CODE DEV MODE] SMTP no configurado. Código para ${payload.to}: ${payload.code}`
      );

      return {
        delivered: false,
        devMode: true
      };
    }

    throw new Error(
      "No se pudo enviar el código de un solo uso por correo: faltan variables SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM."
    );
  }

  try {
    // Valida conectividad SMTP antes de intentar el envío real del código de un solo uso.
    await verifySmtpConnection(config);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : "Error SMTP no controlado";
      console.warn(
        `[FAKE CODE DEV MODE] SMTP falló en validación previa (${message}). Se usa código local para ${payload.to}: ${payload.code}`
      );

      return {
        delivered: false,
        devMode: true
      };
    }

    throw error;
  }

  const transport = createSmtpTransport(config);

  try {
    await transport.sendMail({
      from: config.from,
      to: payload.to,
      subject: "Código de verificación - Simulador Previsional",
      text: [
        "Hola,",
        "",
        "Tu código de verificación es:",
        payload.code,
        "",
        `Vence en ${OTP_EXPIRY_MINUTES} minutos.`,
        `ID de desafío: ${payload.challengeId}`,
        "",
        "Si no solicitaste este código, ignorá este correo."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f2742;line-height:1.45;">
          <h2 style="margin-bottom:8px;">Código de verificación</h2>
          <p style="margin:0 0 14px;">Tu código de acceso al Simulador Previsional es:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:4px;margin:0 0 14px;">${payload.code}</p>
          <p style="margin:0 0 6px;">Vence en ${OTP_EXPIRY_MINUTES} minutos.</p>
          <p style="margin:0 0 18px;color:#52637a;font-size:12px;">ID de desafío: ${payload.challengeId}</p>
          <p style="margin:0;color:#52637a;font-size:12px;">Si no solicitaste este código, podés ignorar este correo.</p>
        </div>
      `
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : "Error SMTP no controlado";
      console.warn(
        `[FAKE CODE DEV MODE] SMTP falló (${message}). Se usa código local para ${payload.to}: ${payload.code}`
      );

      return {
        delivered: false,
        devMode: true
      };
    }

    throw error;
  }

  return {
    delivered: true,
    devMode: false
  };
}
