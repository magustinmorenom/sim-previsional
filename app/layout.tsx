import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPS",
  description:
    "Sistema de gestión para afiliados con biblioteca documental, procesos, consultas y simuladores"
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
