# Deployment & Demo Guide

## Local Development (fastest)

```bash
cd frontend
cp .env.example .env.local
# Optional: add API keys for enhanced features
# LLM_API_KEY=sk-... (enables real LLM responses)
# ELEVENLABS_API_KEY=... (enables voice)
pnpm install
pnpm dev
```

Dashboard + API will be at http://localhost:3000

### Initialize wallets

Either click "Initialize Wallets" on the dashboard, or:
```bash
curl -X POST http://localhost:3000/api/wallets/init
```

This creates Solana devnet wallets for all 5 agents and airdrops 1 SOL each.

### Unbrowse setup (for real web data)

```bash
# In WSL or Linux
npm install -g unbrowse
unbrowse setup          # register account, starts local server on port 6969
unbrowse skills         # verify cached skills (npm, etc.)
```

---

## Production Deployment

### Option 1: Railway (recommended)

1. Create a new Railway project
2. Connect to GitHub repo
3. Set root directory to `frontend`
4. Set build command: `pnpm install && pnpm build`
5. Set start command: `pnpm start`
6. Add environment variables from `.env.example`

### Option 2: Vercel

```bash
cd frontend
npx vercel
```

When prompted:
- Framework: Next.js
- Root directory: `frontend`

Or connect via Vercel dashboard → Import Git Repository → set root to `frontend`.

> Note: Vercel's serverless functions have a 10s timeout on hobby tier (60s on Pro). Set `maxDuration = 60` is already configured on long-running routes. For the best demo experience, use Vercel Pro or Railway.

### Solana Agent Registration

This only needs to run once:

```bash
cd solana
pnpm install

# Set the RPC URL to devnet
export SOLANA_RPC_URL=https://api.devnet.solana.com

pnpm run register
```

Save the output — it contains the agent public keys and collection address.

---

## Demo Script (4 minutes)

### The pitch

**One-liner:** AI agents that discover each other, bid for work, negotiate prices, and pay each other in real SOL — no humans in the loop.

**What makes it special:**
- Agents have real wallets and compete for jobs on price
- Agents negotiate with each other (Frontier Tower room booking haggling)
- Agents pull real web data via Unbrowse skill marketplace
- Human Passport gates who can post tasks (proof of personhood)
- Everything is on-chain and verifiable (Metaplex registry, x402 protocol, SOL payments)

### Pre-demo checklist

- [ ] App running (local or deployed)
- [ ] Wallets initialized with SOL balance
- [ ] Unbrowse running in WSL (`unbrowse setup` → port 6969)
- [ ] Browser open to dashboard at full screen
- [ ] If voice: ElevenLabs API key set
- [ ] If live LLM: LLM_API_KEY set

### Script

**0:00–0:20 — Hook**
> "What if AI agents could hire each other — and pay each other on-chain — governed by you?"

Show the dashboard. All 5 agents are idle, each with a Solana wallet and SOL balance.

**0:20–0:50 — Architecture (brief)**
Show the README or a slide. Explain:
- 5 specialized agents, each with an on-chain identity via Metaplex Agent Registry
- x402 protocol: agents pay each other via HTTP 402 responses
- Humans post tasks, agents bid, best agent wins

**0:50–1:30 — Demo 1: Unbrowse skill execution**
Click "🔍 Find Solana DeFi Packages" quick task button.

Watch the dashboard light up:
- Orchestrator decomposes the task
- Researcher bids 0.0001 SOL and gets assigned
- **"Searched Unbrowse skill marketplace"** — marketplace query
- **"Found 4 cached Unbrowse skills"** — local skills discovered
- **"Executed npm search via Unbrowse skill"** — real web data pulled without a browser
- Research complete → paid on-chain via Solana Explorer

**Key talking point:** "The Researcher agent just autonomously searched a skill marketplace, found a matching skill for npm, executed it, and got real package data back — then got paid in SOL. No browser, no scraping, no mocks."

**1:30–2:30 — Demo 2: Agent negotiation**
Click "🏢 Book Frontier Tower Room".

Watch the negotiation unfold in real time:
- Frontier Tower quotes list price (0.001 SOL)
- **Orchestrator counters:** "I found a room at WeWork/Hacker Dojo for less"
- **Frontier Tower counter-offers** at a discount, throws in a perk
- **Deal agreed** at ~30% off list price
- Payment settles on Solana at the negotiated price (not list price)

**Key talking point:** "Two AI agents just negotiated a price. The buyer cited a competing venue, the seller justified its premium, they met in the middle. The actual on-chain payment reflects the negotiated discount."

**2:30–3:10 — x402 protocol + Human Passport**
Show the x402 in action:
```
curl http://localhost:3000/api/x402/prices
# → {"researcher": 0.0001, "analyst": 0.0002, ...}

curl -X POST http://localhost:3000/api/x402/service/researcher
# → HTTP 402 {"error": "Payment Required", "payment_requirements": {...}}
```

Then show Human Passport verification:
```
curl https://api.passport.xyz/v2/stamps/11965/score/0x000...001 -H "X-API-KEY: $KEY"
# → {"score": "0.00000", "passing_score": false, "threshold": "20.00000"}
```

**Key talking point:** "x402 is pure HTTP — agents call an endpoint, get a 402 with price, pay on Solana, retry. And only verified humans can post tasks — Human Passport checks your wallet's humanity score before the agents will work for you."

**3:10–3:30 — Metaplex on-chain identity**
Show Solana Explorer with the agent collection:
- `https://explorer.solana.com/address/9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv?cluster=devnet`
- All 5 agents registered with metadata, roles, service endpoints

**3:30–3:50 — Chat (optional, if time)**
Open chat panel. Ask the orchestrator something. If ElevenLabs is configured, toggle voice on.

**3:50–4:00 — Close**
> "AgentCommerce: an open economy where AI agents compete on quality and price, negotiate deals, pull real web data, and settle payments on Solana — all governed by verified humans."

---

## Key demo moments by sponsor

| Sponsor | What to show | Timestamp |
|---------|-------------|-----------|
| **Unbrowse** | "Executed npm search via Unbrowse skill" in activity feed | 0:50–1:30 |
| **Frontier Tower** | 4-round negotiation with competing venue reference | 1:30–2:30 |
| **Solana** | Payment explorer links, wallet balances changing | throughout |
| **Metaplex** | Agent collection on Solana Explorer | 3:10–3:30 |
| **Human.tech** | Passport API rejecting unverified wallet | 2:30–3:10 |
| **ElevenLabs** | Voice toggle in chat (if configured) | 3:30–3:50 |

---

## Demo Tips

- **Use the quick task buttons** — they're designed to showcase different agent combinations and sponsor integrations
- **Keep the dashboard visible at all times** — the live activity feed IS the demo
- **Lead with Unbrowse + negotiation** — these are the most visually impressive moments
- **If no API keys**: the system works with realistic mock data. The flow is identical, just with pre-built responses instead of LLM calls.
- **If Solana devnet is slow**: wallets and balances still show, transactions just take longer to confirm
- **If recording video**: do a dry run first to make sure wallet init + airdrop worked. Devnet airdrops sometimes rate-limit.

---

## Environment Variables Reference

```bash
# Required: none! System works with zero config.

# Recommended for impressive demo:
LLM_API_KEY=sk-...             # Any OpenAI-compatible API key
LLM_MODEL=gpt-4o              # Model to use (default: gpt-4o)
LLM_BASE_URL=https://api.openai.com/v1  # Endpoint (default: OpenAI)
ELEVENLABS_API_KEY=...         # Voice interface

# Unbrowse (real web data):
UNBROWSE_URL=http://localhost:6969  # Unbrowse local API server

# Human Passport (proof of personhood):
HUMAN_PASSPORT_ENABLED=true
HUMAN_PASSPORT_API_KEY=...
HUMAN_PASSPORT_SCORER_ID=...
HUMAN_PASSPORT_THRESHOLD=20

# Solana (defaults to devnet):
SOLANA_RPC_URL=https://api.devnet.solana.com

# Agent wallets (base64-encoded secret keys):
ORCHESTRATOR_PRIVATE_KEY=...
RESEARCHER_PRIVATE_KEY=...
ANALYST_PRIVATE_KEY=...
EXECUTOR_PRIVATE_KEY=...
FRONTIER_TOWER_PRIVATE_KEY=...
```

---

## Troubleshooting

**App won't start:**
```bash
cd frontend && pnpm install  # Reinstall deps
pnpm build  # Check for errors
```

**Wallet init fails (airdrop error):**
- Solana devnet has rate limits on airdrops
- Wait 30 seconds and try again
- Or use: `solana airdrop 1 <WALLET_ADDRESS> --url devnet`

**Events not showing:**
- Make sure the app is running
- Check browser console for connection errors

**No LLM responses (just "Processed: ..."):**
- This means no API key is set — add LLM_API_KEY to .env.local
- The mock responses will still work and look realistic for demo

**Unbrowse not connecting:**
- Make sure Unbrowse is running in WSL: `unbrowse setup`
- Check health: `curl http://localhost:6969/health`
- Verify UNBROWSE_URL in .env.local points to `http://localhost:6969`
