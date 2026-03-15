import { NextRequest, NextResponse } from "next/server";
import { eventBus } from "@/lib/events";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") || undefined;
  const events = eventBus.getRecent(since);
  return NextResponse.json(events);
}
