import { NextResponse } from "next/server";
import { getContactChannelsContent } from "@/lib/server/content/content-service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const payload = await getContactChannelsContent();
  return NextResponse.json(payload, { status: 200 });
}
