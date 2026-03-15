import { NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { solanaClient } from "@/lib/solana-client";

export const maxDuration = 60;

export async function POST() {
  const results = [];
  for (const agent of registry.allAgents) {
    agent.initWallet();
    const sig = await solanaClient.airdrop(agent.profile.walletKeypair!.publicKey, 1.0);
    const balance = await agent.getBalance();
    results.push({
      agent_id: agent.profile.agentId,
      name: agent.profile.name,
      wallet_address: agent.profile.walletAddress,
      airdrop_signature: sig,
      balance,
    });
  }
  return NextResponse.json({ wallets: results });
}
