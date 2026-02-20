import { NextResponse } from "next/server";
import { getNavigationContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getNavigationContent();
  return NextResponse.json(payload, { status: 200 });
}
