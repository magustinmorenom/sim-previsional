import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma de Servicios SPS",
  description:
    "App anexa a WordPress con biblioteca documental, procesos, consultas y subapps de simulación para afiliados"
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
