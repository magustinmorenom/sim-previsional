import { getNavigationModules } from "@/lib/config/module-access";
import type {
  ContactChannel,
  ContentResponse,
  DocumentItem,
  FaqItem,
  ModuleDescriptor,
  ProcessGuide
} from "@/lib/types/content";
import {
  fallbackContactChannels,
  fallbackDocuments,
  fallbackFaqItems,
  fallbackProcesses
} from "@/lib/server/content/fallback-content";

const DEFAULT_TTL_SECONDS = 180;

type CachedRecord<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CachedRecord<unknown>>();

function nowMs(): number {
  return Date.now();
}

function getCacheTtlMs(): number {
  const raw = process.env.CONTENT_CACHE_TTL_SECONDS;
  const parsed = Number(raw);

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TTL_SECONDS * 1000;
  }

  return Math.floor(parsed) * 1000;
}

function readFromCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < nowMs()) {
    memoryCache.delete(key);
    return null;
  }

  return cached.value as T;
}

function writeCache<T>(key: string, value: T): void {
  memoryCache.set(key, {
    value,
    expiresAt: nowMs() + getCacheTtlMs()
  });
}

function getWordpressBaseUrl(): string {
  return process.env.WP_APP_CONTENT_BASE_URL?.trim() || "";
}

function normalizeWordpressPayload<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function fetchWordpressSection<T>(sectionPath: string): Promise<T> {
  const baseUrl = getWordpressBaseUrl();

  if (!baseUrl) {
    throw new Error("WP_APP_CONTENT_BASE_URL no configurada.");
  }

  const url = new URL(sectionPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`WordPress API devolvió ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return normalizeWordpressPayload<T>(payload);
}

async function resolveSection<T>(
  key: string,
  sectionPath: string,
  fallback: T
): Promise<ContentResponse<T>> {
  const cached = readFromCache<T>(key);
  if (cached !== null) {
    return {
      success: true,
      data: cached,
      source: "cache"
    };
  }

  try {
    const fromWordpress = await fetchWordpressSection<T>(sectionPath);
    writeCache(key, fromWordpress);

    return {
      success: true,
      data: fromWordpress,
      source: "wordpress"
    };
  } catch {
    writeCache(key, fallback);
    return {
      success: true,
      data: fallback,
      source: "fallback"
    };
  }
}

function sortDocumentsByDateDesc(items: DocumentItem[]): DocumentItem[] {
  return [...items].sort((a, b) => {
    if (a.publishedAt === b.publishedAt) {
      return a.title.localeCompare(b.title, "es");
    }

    return a.publishedAt > b.publishedAt ? -1 : 1;
  });
}

export async function getNavigationContent(): Promise<ContentResponse<ModuleDescriptor[]>> {
  const fallback = getNavigationModules();

  return resolveSection<ModuleDescriptor[]>(
    "content_navigation",
    "navigation",
    fallback
  );
}

export async function getLibraryContent(): Promise<ContentResponse<DocumentItem[]>> {
  const fallback = sortDocumentsByDateDesc(fallbackDocuments);
  return resolveSection<DocumentItem[]>("content_library", "library", fallback);
}

export async function getNormativeContent(): Promise<ContentResponse<DocumentItem[]>> {
  const fallback = sortDocumentsByDateDesc(fallbackDocuments.filter((doc) => doc.isNormative));
  return resolveSection<DocumentItem[]>("content_normative", "normative", fallback);
}

export async function getProcessContent(): Promise<ContentResponse<ProcessGuide[]>> {
  return resolveSection<ProcessGuide[]>("content_processes", "processes", fallbackProcesses);
}

export async function getFaqContent(): Promise<ContentResponse<FaqItem[]>> {
  return resolveSection<FaqItem[]>("content_faq", "faq", fallbackFaqItems);
}

export async function getContactChannelsContent(): Promise<ContentResponse<ContactChannel[]>> {
  return resolveSection<ContactChannel[]>(
    "content_contact_channels",
    "contact-channels",
    fallbackContactChannels
  );
}
