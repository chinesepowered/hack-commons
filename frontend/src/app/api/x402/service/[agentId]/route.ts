import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { create402Response, verifyPaymentHeader } from "@/lib/x402";
import { eventBus } from "@/lib/events";
import { BaseAgent } from "@/lib/agents/base";

const SERVICE_PRICES: Record<string, number> = {
  researcher: 0.0001,
  analyst: 0.0002,
  executor: 0.0005,
  frontier_tower: 0.0001,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  if (!(agentId in SERVICE_PRICES)) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  const price = SERVICE_PRICES[agentId];

  const agents: Record<string, BaseAgent> = {
    researcher: registry.researcher,
    analyst: registry.analyst,
    executor: registry.executor,
    frontier_tower: registry.frontierTower,
  };

  const agent = agents[agentId];
  const recipientWallet = agent.profile.walletKeypair
    ? agent.profile.walletKeypair.publicKey.toBase58()
    : null;

  if (!recipientWallet) {
    return NextResponse.json(
      { error: "Agent wallet not initialized. Call POST /api/wallets/init first." },
      { status: 503 }
    );
  }

  const paymentHeader = request.headers.get("x-payment");

  if (!paymentHeader) {
    eventBus.publish("x402.payment_required", {
      agent_id: agentId,
      price_sol: price,
      recipient: recipientWallet,
    });

    return create402Response({
      recipient: recipientWallet,
      amountSol: price,
      description: `Payment for ${agent.profile.name} service`,
    });
  }

  const verification = await verifyPaymentHeader(
    paymentHeader,
    recipientWallet,
    price
  );

  if (!verification.valid) {
    return NextResponse.json(
      { error: `Payment verification failed: ${verification.error}` },
      { status: 402 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const task = body.task || { description: body.description || "", type: agentId };

  eventBus.publish("x402.service_executing", {
    agent_id: agentId,
    payment_signature: verification.signature,
  });

  const result = await agent.receiveTask(task);

  return NextResponse.json({
    success: result.success,
    data: result.data,
    payment: {
      signature: verification.signature,
      amount_sol: price,
      protocol: "x402",
    },
  });
}
