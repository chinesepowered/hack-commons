import { NextResponse } from "next/server";
import { isVoiceAvailable } from "@/lib/integrations/elevenlabs";

export async function GET() {
  return NextResponse.json({
    voice_available: isVoiceAvailable(),
    provider: isVoiceAvailable() ? "elevenlabs" : null,
    fallback: "text",
  });
}
