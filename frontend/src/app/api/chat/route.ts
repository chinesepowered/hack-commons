import { NextRequest, NextResponse } from "next/server";
import { llmCompletion } from "@/lib/llm";
import { eventBus } from "@/lib/events";
import { isVoiceAvailable, textToSpeech } from "@/lib/integrations/elevenlabs";

export const maxDuration = 60;

const ORCHESTRATOR_SYSTEM = `You are the Orchestrator agent of AgentCommerce — a multi-agent economy running on Solana.

Your agent network:
- Researcher: Gathers web data via Unbrowse, market intelligence, protocol analysis
- Analyst: Processes data, risk assessment, yield analysis, actionable recommendations
- Executor: On-chain actions on Solana — swaps, LP positions, staking, token operations
- Frontier Tower: Services for the 16-floor SF innovation hub — room booking, bounty posting, expert matching, event coordination

You coordinate these agents using x402 payments on Solana. When a task comes in, you decompose it, collect bids, assign the best agent, and manage payments — all visible in real-time on the dashboard.

Speak concisely and confidently. Reference specific agents by name. If asked about capabilities, be specific about what each agent can do.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, voice_response = false } = body;

  const responseText = await llmCompletion("orchestrator_chat", [
    { role: "system", content: ORCHESTRATOR_SYSTEM },
    { role: "user", content: message },
  ]);

  eventBus.publish("orchestrator.chat", {
    agent_id: "orchestrator",
    agent_name: "Orchestrator",
    message: `Chat: ${message.slice(0, 100)}`,
    response: responseText.slice(0, 200),
  });

  const result: Record<string, unknown> = {
    text: responseText,
    voice_available: isVoiceAvailable(),
  };

  if (voice_response && isVoiceAvailable()) {
    const audio = await textToSpeech(responseText);
    if (audio) {
      result.audio_available = true;
    }
  }

  return NextResponse.json(result);
}
