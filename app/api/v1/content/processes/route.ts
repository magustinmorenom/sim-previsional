import { NextResponse } from "next/server";
import { getProcessContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getProcessContent();
  return NextResponse.json(payload, { status: 200 });
}
