import { NextResponse } from "next/server";
import { getFaqContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getFaqContent();
  return NextResponse.json(payload, { status: 200 });
}
