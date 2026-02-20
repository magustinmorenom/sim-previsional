import { NextResponse } from "next/server";
import { getNormativeContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getNormativeContent();
  return NextResponse.json(payload, { status: 200 });
}
