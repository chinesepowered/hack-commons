import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { makeClient } from "alkahest-ts";

const ALKAHEST_PRIVATE_KEY = process.env.ALKAHEST_PRIVATE_KEY || "";
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

/** Check if Alkahest is configured */
export function isAlkahestConfigured(): boolean {
  return ALKAHEST_PRIVATE_KEY.length > 0 && ALKAHEST_PRIVATE_KEY.startsWith("0x");
}

/** Create an Alkahest client (lazy, only when needed) */
function getClient() {
  if (!isAlkahestConfigured()) throw new Error("Alkahest not configured");

  const account = privateKeyToAccount(ALKAHEST_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  return makeClient(walletClient);
}

export interface NegotiationAgreement {
  service: string;
  buyer: string;
  seller: string;
  list_price_sol: number;
  negotiated_price_sol: number;
  discount_pct: number;
  competing_venue: string;
  rounds: number;
  timestamp: string;
  solana_network: string;
}

/**
 * Record a negotiation agreement on-chain via Alkahest StringObligation.
 * Creates an EAS attestation on Base Sepolia containing the agreement JSON.
 * Returns the attestation UID and tx hash, or null if Alkahest is not configured.
 */
export async function recordNegotiationAgreement(
  agreement: NegotiationAgreement
): Promise<{ uid: string; txHash: string; explorerUrl: string } | null> {
  if (!isAlkahestConfigured()) return null;

  try {
    const client = getClient();
    const result = await client.stringObligation.doObligationJson(agreement);

    return {
      uid: result.attested.uid,
      txHash: result.hash,
      explorerUrl: `https://base-sepolia.easscan.org/attestation/view/${result.attested.uid}`,
    };
  } catch (err) {
    console.error("Alkahest attestation failed:", err);
    return null;
  }
}
