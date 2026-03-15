export const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gpt-4o",
  llmBaseUrl: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  unbrowseUrl: process.env.UNBROWSE_URL || "http://localhost:6969",
  humanPassportEnabled: process.env.HUMAN_PASSPORT_ENABLED === "true",
};
