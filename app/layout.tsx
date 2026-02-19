import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador Previsional CEER 2025",
  description:
    "Simulador previsional para afiliados con autenticación OTP, datos remotos y cálculo actuarial en pantalla única"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
