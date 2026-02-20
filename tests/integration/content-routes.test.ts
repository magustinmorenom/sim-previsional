import { describe, expect, it } from "vitest";
import { GET as getNavigation } from "@/app/api/v1/content/navigation/route";
import { GET as getLibrary } from "@/app/api/v1/content/library/route";
import { GET as getProcesses } from "@/app/api/v1/content/processes/route";
import { GET as getFaq } from "@/app/api/v1/content/faq/route";
import { GET as getNormative } from "@/app/api/v1/content/normative/route";
import { GET as getContactChannels } from "@/app/api/v1/content/contact-channels/route";

describe("content BFF routes", () => {
  it("GET /api/v1/content/navigation responde catálogo de módulos", async () => {
    const response = await getNavigation();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/content/library responde biblioteca", async () => {
    const response = await getLibrary();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/content/processes responde guías", async () => {
    const response = await getProcesses();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/content/faq responde FAQ", async () => {
    const response = await getFaq();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/content/normative responde normativa", async () => {
    const response = await getNormative();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.every((item: { isNormative: boolean }) => item.isNormative)).toBe(true);
  });

  it("GET /api/v1/content/contact-channels responde canales", async () => {
    const response = await getContactChannels();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
