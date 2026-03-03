import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DeviceProvider } from "@/app/_anexo/device-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "App CPS",
  description:
    "Sistema de gestión para afiliados con biblioteca documental, procesos, consultas y simuladores"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const deviceType = cookieStore.get("device-type")?.value;
  const initialIsMobile = deviceType === "mobile";

  return (
    <html lang="es">
      <body>
        <DeviceProvider initialIsMobile={initialIsMobile}>
          {children}
        </DeviceProvider>
      </body>
    </html>
  );
}
