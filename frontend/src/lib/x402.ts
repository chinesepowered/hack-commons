import { NextResponse } from "next/server";
import { Keypair, PublicKey } from "@solana/web3.js";
import { eventBus } from "./events";
import { solanaClient } from "./solana-client";

export interface PaymentRequirements {
  recipient: string;
  amountSol: number;
  network?: string;
  description?: string;
}

export interface PaymentVerification {
  valid: boolean;
  signature?: string;
  error?: string;
}

export function create402Response(requirements: PaymentRequirements): NextResponse {
  return NextResponse.json(
    {
      error: "Payment Required",
      payment_requirements: {
        recipient: requirements.recipient,
        amount_lamports: Math.floor(requirements.amountSol * 1_000_000_000),
        amount_sol: requirements.amountSol,
        network: requirements.network || "solana-devnet",
        description: requirements.description || "",
      },
      protocol: "x402",
    },
    {
      status: 402,
      headers: {
        "X-Payment-Protocol": "x402",
        "X-Payment-Network": requirements.network || "solana-devnet",
      },
    }
  );
}

export async function verifyPaymentHeader(
  paymentHeader: string,
  expectedRecipient: string,
  minAmountSol: number
): Promise<PaymentVerification> {
  if (!paymentHeader) {
    return { valid: false, error: "Missing X-Payment header" };
  }

  try {
    const paymentData = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString()
    );
    const signature = paymentData.signature || "";

    if (signature) {
      eventBus.publish("x402.payment_verified", {
        recipient: expectedRecipient,
        amount_sol: minAmountSol,
        signature,
        explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      });
      return { valid: true, signature };
    }

    return { valid: false, error: "No signature in payment data" };
  } catch (e) {
    return { valid: false, error: `Invalid payment data: ${e}` };
  }
}

export async function createAndSendPayment(
  payerKeypair: Keypair,
  recipientPubkey: PublicKey,
  amountSol: number
): Promise<string | null> {
  const signature = await solanaClient.transferSol(
    payerKeypair,
    recipientPubkey,
    amountSol
  );
  if (signature) {
    const paymentData = {
      signature,
      payer: payerKeypair.publicKey.toBase58(),
      recipient: recipientPubkey.toBase58(),
      amount_sol: amountSol,
      network: "solana-devnet",
    };
    return Buffer.from(JSON.stringify(paymentData)).toString("base64");
  }
  return null;
}
