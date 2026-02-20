import { NextResponse } from "next/server";
import { getLibraryContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getLibraryContent();
  return NextResponse.json(payload, { status: 200 });
}
