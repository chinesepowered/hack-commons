import { config } from "../config";

export async function verifyHuman(walletAddress: string): Promise<boolean> {
  if (!config.humanPassportEnabled) return true;
  // TODO: Integrate Human Passport API
  return true;
}
