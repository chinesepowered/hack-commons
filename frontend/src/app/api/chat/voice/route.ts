import { NextRequest, NextResponse } from "next/server";
import { llmCompletion } from "@/lib/llm";
import { eventBus } from "@/lib/events";
import { textToSpeech } from "@/lib/integrations/elevenlabs";

export const maxDuration = 60;

const ORCHESTRATOR_VOICE_SYSTEM = `You are the Orchestrator agent of AgentCommerce — a multi-agent economy running on Solana.

Your agent network:
- Researcher: Gathers web data via Unbrowse, market intelligence, protocol analysis
- Analyst: Processes data, risk assessment, yield analysis, actionable recommendations
- Executor: On-chain actions on Solana — swaps, LP positions, staking, token operations
- Frontier Tower: Services for the 16-floor SF innovation hub — room booking, bounty posting, expert matching, event coordination

You coordinate these agents using x402 payments on Solana. Keep responses under 2 sentences. Be direct, specific, and reference agents by name.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message } = body;

  const responseText = await llmCompletion("orchestrator_voice", [
    { role: "system", content: ORCHESTRATOR_VOICE_SYSTEM },
    { role: "user", content: message },
  ]);

  eventBus.publish("orchestrator.voice", {
    agent_id: "orchestrator",
    agent_name: "Orchestrator",
    message: `Voice: ${message.slice(0, 100)}`,
  });

  const audio = await textToSpeech(responseText);
  if (audio) {
    return new NextResponse(Buffer.from(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Text-Response": responseText.slice(0, 500),
      },
    });
  }

  return NextResponse.json({ text: responseText, voice_available: false });
}
