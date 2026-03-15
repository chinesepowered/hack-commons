import { NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { createAndSendPayment } from "@/lib/x402";
import { eventBus } from "@/lib/events";

export const maxDuration = 60;

export async function POST() {
  const { orchestrator, researcher } = registry;

  if (!orchestrator.profile.walletKeypair || !researcher.profile.walletKeypair) {
    return NextResponse.json({
      error: "Wallets not initialized. Call POST /api/wallets/init first.",
    });
  }

  eventBus.publish("x402.demo.start", {
    message: "Starting x402 payment demo: Orchestrator → Researcher",
    payer: orchestrator.profile.walletKeypair.publicKey.toBase58(),
    recipient: researcher.profile.walletKeypair.publicKey.toBase58(),
    amount_sol: 0.0001,
  });

  const paymentHeader = await createAndSendPayment(
    orchestrator.profile.walletKeypair,
    researcher.profile.walletKeypair.publicKey,
    0.0001
  );

  if (!paymentHeader) {
    return NextResponse.json({ error: "Payment failed — check wallet balances" });
  }

  eventBus.publish("x402.demo.complete", {
    message: "x402 payment flow completed successfully",
    payment_header_preview: paymentHeader.slice(0, 50) + "...",
  });

  return NextResponse.json({
    success: true,
    message: "x402 agent-to-agent payment completed",
    payment_header: paymentHeader,
    protocol: "x402",
  });
}
