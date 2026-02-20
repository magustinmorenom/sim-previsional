import type { ReactNode } from "react";
import { AnexoLayout } from "@/app/_anexo/anexo-layout";

export default async function PublicAppLayout({
  children
}: {
  children: ReactNode;
}) {
  return AnexoLayout({ children });
}
