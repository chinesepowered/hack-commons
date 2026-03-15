import { NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";
import { solanaClient } from "@/lib/solana-client";

export const maxDuration = 60;

const MIN_BALANCE = 0.005; // SOL — skip funding if agent already has enough

export async function POST() {
  // Wallets are auto-initialized from env on registry creation,
  // but call initWallet in case registry was created before env was loaded
  for (const agent of registry.allAgents) {
    if (!agent.profile.walletKeypair) agent.initWallet();
  }

  const orchestrator = registry.orchestrator;
  const workers = registry.allAgents.filter((a) => a.profile.agentId !== "orchestrator");
  let orchBalance = await orchestrator.getBalance(true);

  let airdropSig: string | null = null;

  // Only airdrop if orchestrator is low on funds
  if (orchBalance < MIN_BALANCE) {
    airdropSig = await solanaClient.airdrop(orchestrator.profile.walletKeypair!.publicKey, 2.0);
    orchBalance = await orchestrator.getBalance(true);
  }

  // Figure out which workers need funding
  const workersToFund = [];
  for (const worker of workers) {
    const workerBalance = await worker.getBalance(true);
    if (workerBalance < MIN_BALANCE) {
      workersToFund.push(worker);
    }
  }

  // Send up to 0.2 SOL to each worker that needs it
  const MAX_PER_WORKER = 0.2;
  const transferResults: Record<string, string | null> = {};
  if (workersToFund.length > 0 && orchBalance > MIN_BALANCE) {
    for (const worker of workersToFund) {
      const amount = Math.min(MAX_PER_WORKER, orchBalance * 0.1); // never send more than 10% of remaining
      if (amount < 0.001) break; // stop if orchestrator is running low
      const sig = await solanaClient.transferSol(
        orchestrator.profile.walletKeypair!,
        worker.profile.walletKeypair!.publicKey,
        amount
      );
      transferResults[worker.profile.agentId] = sig;
      orchBalance = await orchestrator.getBalance(true);
    }
  }

  // Collect final balances
  const results = [];
  for (const agent of registry.allAgents) {
    const balance = await agent.getBalance(true);
    results.push({
      agent_id: agent.profile.agentId,
      name: agent.profile.name,
      wallet_address: agent.profile.walletAddress,
      airdrop_signature: agent.profile.agentId === "orchestrator" ? airdropSig : transferResults[agent.profile.agentId] || null,
      balance,
    });
  }

  return NextResponse.json({ wallets: results });
}
