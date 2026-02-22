"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SAFETY_TIMEOUT_MS = 12000;

function isNavigableAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const nextUrl = new URL(href, window.location.origin);
  if (nextUrl.origin !== window.location.origin) {
    return false;
  }

  const current = `${window.location.pathname}${window.location.search}`;
  const destination = `${nextUrl.pathname}${nextUrl.search}`;

  return destination !== current;
}

export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      return;
    }

    setLoading(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [loading, routeKey]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!isNavigableAnchor(anchor)) {
        return;
      }

      setLoading(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setLoading(false);
        timeoutRef.current = null;
      }, SAFETY_TIMEOUT_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`anx-global-loading ${loading ? "anx-global-loading-active" : ""}`} aria-hidden={!loading}>
      <span className="anx-global-loading-spinner" aria-hidden="true" />
      <span className="sr-only" aria-live="polite">Cargando contenido</span>
    </div>
  );
}
