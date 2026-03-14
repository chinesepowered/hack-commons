# Technical Reference — Collected Docs

## 1. Metaplex Agent Registry (CORE)

### NPM Packages
- `@metaplex-foundation/mpl-agent-registry`
- `@metaplex-foundation/mpl-core`
- `@metaplex-foundation/umi`
- `@metaplex-foundation/umi-bundle-defaults`

### On-chain Programs
- Agent Identity Program: `1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p`
- Agent Tools Program: `TLREGni9ZEyGC3vnPZtqUh95xQ8oPqJSvNjvB7FGK8S`

### Register an Agent (3 steps)

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplAgentIdentity } from '@metaplex-foundation/mpl-agent-registry';
import { registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry';
import { generateSigner } from '@metaplex-foundation/umi';
import { create, createCollection } from '@metaplex-foundation/mpl-core';

const umi = createUmi('https://api.mainnet-beta.solana.com')
  .use(mplAgentIdentity());

// Step 1: Create collection
const collection = generateSigner(umi);
await createCollection(umi, {
  collection,
  name: 'Agent Collection',
  uri: 'https://example.com/collection.json',
}).sendAndConfirm(umi);

// Step 2: Create asset
const asset = generateSigner(umi);
await create(umi, {
  asset,
  name: 'My Agent',
  uri: 'https://example.com/agent.json',
  collection,
}).sendAndConfirm(umi);

// Step 3: Register identity
await registerIdentityV1(umi, {
  asset: asset.publicKey,
  collection: collection.publicKey,
  agentRegistrationUri: 'https://example.com/agent-registration.json',
}).sendAndConfirm(umi);
```

### Registration Document Schema (JSON hosted at agentRegistrationUri)

```json
{
  "type": "agent-registration-v1",
  "name": "Agent Name",
  "description": "What the agent does",
  "image": "https://arweave.net/hash",
  "services": [
    {
      "name": "web",
      "endpoint": "https://domain.com/agent/<ASSET_PUBKEY>"
    },
    {
      "name": "A2A",
      "endpoint": "https://domain.com/agent/<ASSET_PUBKEY>/card.json",
      "version": "0.3.0"
    }
  ],
  "active": true,
  "registrations": [
    {
      "agentId": "PublicKeyString",
      "agentRegistry": "solana:mainnet:1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p"
    }
  ],
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

### Run an Agent (Executive Delegation)

```typescript
import { registerExecutiveV1, delegateExecutionV1, findExecutiveProfileV1Pda, findExecutionDelegateRecordV1Pda } from '@metaplex-foundation/mpl-agent-registry';

// Step 1: Register executive profile (one per wallet)
await registerExecutiveV1(umi, {
  payer: umi.payer,
}).sendAndConfirm(umi);

// Step 2: Delegate execution to executive
await delegateExecutionV1(umi, {
  agentAsset: agentAssetPublicKey,
  agentIdentity,
  executiveProfile,
}).sendAndConfirm(umi);

// Step 3: Verify delegation
const delegateRecord = findExecutionDelegateRecordV1Pda(umi, {
  executiveProfile,
  agentAsset: agentAssetPublicKey,
});
const account = await umi.rpc.getAccount(delegateRecord);
```

### Verify Registration

```typescript
import { fetchAsset } from '@metaplex-foundation/mpl-core';

const assetData = await fetchAsset(umi, assetPublicKey);
const agentIdentity = assetData.agentIdentities?.[0];
console.log(agentIdentity?.uri);
```

### Key Constraints
- Registration is one-time only per asset
- agentRegistrationUri must point to permanently hosted JSON (e.g., Arweave)
- PDA derived from seeds: `["agent_identity", <asset>]`

---

## 2. x402 Payments (CORE)

### Flow
1. Client requests protected endpoint
2. Server responds 402 with PaymentRequirements JSON (recipient, amount, token)
3. Client creates + signs Solana SPL token transfer
4. Client sends signed tx as base64 in `X-Payment` header
5. Server verifies on-chain, responds 200 with content

### Corbits SDK (Solana-first)

```typescript
// npm install @faremeter/payment-solana @faremeter/fetch
import { createPaymentHandler } from '@faremeter/payment-solana';
import { wrap } from '@faremeter/fetch';

const handler = createPaymentHandler(wallet, usdcMint, connection);
const fetchWithPayer = wrap(fetch, { handlers: [handler] });
// Payments happen automatically on 402 responses
```

### Coinbase Express Middleware (Server-side)

```typescript
app.use(paymentMiddleware(RECIPIENT, {
  "GET /premium": { price: "$0.0001", network: "solana-devnet" }
}));
```

### Key Details
- Uses SPL tokens (USDC etc) on Solana
- X-PAYMENT header: base64-encoded JSON with serialized transaction
- Low cost on Solana (fractions of a cent)
- ACK Protocol adds W3C DIDs/VCs for agent identity

---

## 3. Unbrowse (PLUGGABLE)

### Install
```bash
npx unbrowse setup
# or globally
npm install -g unbrowse
unbrowse setup
```

### Core API (runs locally on http://localhost:6969)

**Resolve intent (primary method):**
```bash
curl -s -X POST "$UNBROWSE/v1/intent/resolve" \
  -H "Content-Type: application/json" \
  -d '{"intent": "get trending searches on Google", "params": {"url": "https://google.com"}, "context": {"url": "https://google.com"}}'
```

**Search marketplace:**
```bash
curl -s -X POST "$UNBROWSE/v1/search" \
  -H "Content-Type: application/json" \
  -d '{"intent": "get product prices", "k": 5}'
```

**Auth (interactive login):**
```bash
curl -s -X POST "$UNBROWSE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/login"}'
```

### Integration
- Try `/v1/intent/resolve` first — handles full pipeline
- Runs entirely locally, no cloud proxy
- Auto-registers agents on first startup
- Fallback: if Unbrowse unavailable, use normal fetch

---

## 4. Kalibr (PLUGGABLE)

### Install
```bash
pip install kalibr
# or
npm install @kalibr/sdk
```

### Python Usage

```python
from kalibr import Router

router = Router(
    goal="extract_company",
    paths=["gpt-4o", "claude-sonnet-4-20250514"],
    success_when=lambda output: len(output) > 0
)

response = router.completion(messages=[
    {"role": "user", "content": "Extract the company name from: ..."}
])

print(response.choices[0].message.content)

# Manual reporting for complex validation
router.report(success=True, score=0.9)
```

### TypeScript Usage

```typescript
import { Router } from '@kalibr/sdk';

const router = new Router({
  goal: 'extract_company',
  paths: ['gpt-4o', 'claude-sonnet-4-20250514'],
  successWhen: (output) => output.length > 0,
});

const response = await router.completion([...]);
await router.report(true);
```

### Auth
```bash
kalibr auth  # browser-based sign-in
# or set env vars: KALIBR_API_KEY, KALIBR_TENANT_ID
```

### Key Details
- Auto-instrumentation: 2 lines of code
- Response format matches OpenAI SDK standard
- Resilience benchmark: 88-100% vs 16-36% for hardcoded

---

## 5. Meteora (PLUGGABLE — if we add LP agent)

### APIs
- DLMM API: 30 RPS rate limit
- DAMM v1/v2 API: 10 RPS
- Dynamic Vault API: unlimited
- Swagger: https://dlmm.datapi.meteora.ag/swagger-ui/
- LLM docs: https://docs.meteora.ag/llms.txt

### Key Endpoints
- `/pool` — single pool metadata
- `/pools` — paginated pool list
- `/ohlcv` — candlestick data
- `/historical-volume` — volume aggregation

### SDKs
- TypeScript SDK (all products)
- Rust SDK (DAMM v2, DBC, Dynamic Vault)
- Go SDK (DAMM v2, DBC)
- GitHub: https://github.com/MeteoraAg

---

## 6. ElevenLabs (PLUGGABLE)

- Docs: elevenlabs.io/docs
- Free 1 month Creator tier for hackathon participants
- Claim via ElevenLabs Discord #🎟️│coupon-codes channel

---

## 7. Human.tech / Human Passport (PLUGGABLE)

- Register at: frontier.human.tech
- Products: WaaP (wallet), Human Passport (sybil resistance), Human Network
- Docs sparse — will need to explore during integration
- Key: Passport Embed for sybil-resistant access in apps

---

## 8. Arkhai / Alkahest (PLUGGABLE)

- MCP Server: `npx alkahest-mcp`
- Agent Skills: `/plugin marketplace add arkhai-io/claude-plugins`
- Docs endpoint was unreachable — will explore during integration
- Core: general-purpose conditional escrow on EAS (Ethereum Attestation Service)
- NOTE: Arkhai is on EVM, not Solana — cross-chain consideration

---

## Key Architecture Decisions from Docs

1. **Metaplex uses TypeScript/Umi SDK** — our agent registration layer needs to be in TypeScript (or we call it from Python via subprocess/API)
2. **x402 is HTTP-native** — fits perfectly with FastAPI endpoints
3. **Unbrowse is local REST API** — easy to call from any language
4. **Kalibr wraps LLM calls** — drop-in replacement for direct OpenAI/Anthropic calls
5. **Arkhai is EVM-based** — might be harder to integrate than expected since our core is Solana. Consider whether the $1,000 prize justifies the cross-chain complexity.
