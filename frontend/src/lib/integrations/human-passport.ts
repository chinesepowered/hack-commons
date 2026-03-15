import { config } from "../config";

const PASSPORT_API_BASE = "https://api.passport.xyz";

interface PassportScore {
  address: string;
  score: string;
  passing_score: boolean;
  threshold: string;
  last_score_timestamp: string | null;
  expiration_timestamp: string | null;
  error: string | null;
  stamp_scores: Record<string, string>;
}

/**
 * Verify a wallet address is human using Human Passport (formerly Gitcoin Passport).
 * Checks the address's Unique Humanity Score against the configured threshold.
 *
 * Returns true if:
 * - Human Passport is not enabled (dev mode)
 * - The address has a passing score
 */
export async function verifyHuman(walletAddress: string): Promise<boolean> {
  if (!config.humanPassportEnabled) return true;
  if (!config.humanPassportApiKey || !config.humanPassportScorerId) {
    console.warn("Human Passport enabled but API key or scorer ID not configured — allowing access");
    return true;
  }

  try {
    const score = await getPassportScore(walletAddress);
    if (!score) return false;
    if (score.error) {
      console.warn(`Human Passport error for ${walletAddress}: ${score.error}`);
      return false;
    }
    return score.passing_score;
  } catch (err) {
    console.error("Human Passport verification failed:", err);
    return false;
  }
}

/** Get the full Passport score for an address */
export async function getPassportScore(address: string): Promise<PassportScore | null> {
  if (!config.humanPassportApiKey || !config.humanPassportScorerId) return null;

  const response = await fetch(
    `${PASSPORT_API_BASE}/v2/stamps/${config.humanPassportScorerId}/score/${address}`,
    {
      headers: { "X-API-KEY": config.humanPassportApiKey },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null; // No passport for this address
    throw new Error(`Human Passport API error: ${response.status}`);
  }

  return response.json();
}

/** Check if Human Passport is configured and reachable */
export async function humanPassportStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  threshold: number;
}> {
  return {
    enabled: config.humanPassportEnabled,
    configured: !!(config.humanPassportApiKey && config.humanPassportScorerId),
    threshold: config.humanPassportThreshold,
  };
}
