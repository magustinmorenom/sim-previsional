"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface ContentTransitionProps {
  children: ReactNode;
}

export function ContentTransition({ children }: ContentTransitionProps) {
  const pathname = usePathname();

  return (
    <section key={pathname} className="anx-content anx-content-transition">
      {children}
    </section>
  );
}
