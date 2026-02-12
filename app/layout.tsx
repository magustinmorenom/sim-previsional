import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador Previsional CEER 2025",
  description:
    "Migración del proyectador CEER 2025 a aplicación web con wizard explicativo y cálculo actuarial equivalente"
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
