import type { ReactNode } from "react";
import { AnexoLayout } from "@/app/_anexo/anexo-layout";

export default async function PrivateAppLayout({
  children
}: {
  children: ReactNode;
}) {
  return AnexoLayout({ children });
}
