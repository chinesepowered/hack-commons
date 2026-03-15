import { NextResponse } from "next/server";

const SERVICE_PRICES: Record<string, number> = {
  researcher: 0.001,
  analyst: 0.002,
  executor: 0.005,
  frontier_tower: 0.001,
};

export async function GET() {
  return NextResponse.json({
    prices: SERVICE_PRICES,
    network: "solana-devnet",
    protocol: "x402",
  });
}
