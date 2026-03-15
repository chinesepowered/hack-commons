import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { verifyHuman } from "@/lib/integrations/human-passport";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description, wallet_address, max_budget = 1.0 } = body;

  if (wallet_address) {
    const isHuman = await verifyHuman(wallet_address);
    if (!isHuman) {
      return NextResponse.json({ error: "Human verification failed" }, { status: 403 });
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
