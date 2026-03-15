import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { verifyHuman, getPassportScore } from "@/lib/integrations/human-passport";
import { config } from "@/lib/config";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description, wallet_address, max_budget = 1.0 } = body;

  // Human verification gate
  if (wallet_address && config.humanPassportEnabled) {
    const isHuman = await verifyHuman(wallet_address);
    if (!isHuman) {
      const score = await getPassportScore(wallet_address);
      return NextResponse.json(
        {
          error: "Human verification failed",
          detail: score
            ? `Score ${score.score} below threshold ${score.threshold}`
            : "No Human Passport found for this address",
          passport_url: "https://passport.human.tech",
        },
        { status: 403 }
      );
    }
  }

  const result = await registry.orchestrator.receiveTask({
    description,
    wallet_address,
    max_budget,
  });

  return NextResponse.json({
    success: result.success,
    data: result.data,
    total_cost: result.cost,
  });
}
