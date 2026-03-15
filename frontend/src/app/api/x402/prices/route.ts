import { NextResponse } from "next/server";

const SERVICE_PRICES: Record<string, number> = {
  researcher: 0.0001,
  analyst: 0.0002,
  executor: 0.0005,
  frontier_tower: 0.0001,
};

export async function GET() {
  return NextResponse.json({
    prices: SERVICE_PRICES,
    network: "solana-devnet",
    protocol: "x402",
  });
}
