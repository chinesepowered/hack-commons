# Deployment & Demo Guide

## Local Development (fastest)

### 1. Start the backend

```bash
cd backend
cp .env.example .env
# Optional: add API keys for enhanced features
# OPENAI_API_KEY=sk-... (enables real LLM responses)
# ELEVENLABS_API_KEY=... (enables voice)
uv sync
uv run uvicorn src.main:app --reload --port 8000
```

### 2. Start the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Dashboard will be at http://localhost:3000

### 3. Initialize wallets

Either click "Initialize Wallets" on the dashboard, or:
```bash
curl -X POST http://localhost:8000/api/wallets/init
```

This creates Solana devnet wallets for all 5 agents and airdrops 1 SOL each.

---

## Production Deployment

### Backend → Railway / Fly.io / Render

**Railway (recommended):**

1. Create a new Railway project
2. Connect to GitHub repo
3. Set root directory to `backend`
4. Set build command: `pip install uv && uv sync`
5. Set start command: `uv run uvicorn src.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from `.env.example`

**Fly.io alternative:**

Create `backend/fly.toml`:
```toml
app = "agentcommerce-api"
primary_region = "sjc"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
```

```bash
cd backend
fly launch
fly secrets set OPENAI_API_KEY=sk-... SOLANA_RPC_URL=https://api.devnet.solana.com
fly deploy
```

### Frontend → Vercel

```bash
cd frontend
pnpm install
npx vercel
```

When prompted:
- Framework: Next.js
- Root directory: `frontend`
- Environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app`

Or connect via Vercel dashboard → Import Git Repository → set root to `frontend`.

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

### Pre-demo checklist

- [ ] Backend running (local or deployed)
- [ ] Frontend running (local or deployed)
- [ ] Wallets initialized (click the button or curl)
- [ ] Browser open to dashboard at full screen
- [ ] If voice: ElevenLabs API key set
- [ ] If live LLM: OpenAI or Anthropic key set

### Script

**0:00–0:20 — Hook**
> "What if AI agents could hire each other — and pay each other on-chain — governed by you?"

Show the dashboard. All 5 agents are idle, each with a Solana wallet and SOL balance.

**0:20–0:50 — Architecture**
Show the README architecture diagram or a slide. Explain:
- 5 specialized agents, each with an on-chain identity via Metaplex
- x402 protocol: agents pay each other via HTTP 402 responses
- Humans post tasks, agents bid, best agent wins

**0:50–1:10 — First task: DeFi research**
Click "🔍 Research Solana DeFi" quick task button (or type your own).

Watch the dashboard light up:
- Orchestrator decomposes the task
- Researcher bids and gets assigned
- Research results flow in
- Analyst gets the research, produces insights
- Executor plans the on-chain action
- Payments settle on Solana (show explorer links)

**1:10–2:00 — Explain what happened**
Point out in the activity feed:
- "Orchestrator decomposed into 3 sub-tasks"
- "Researcher bid 0.001 SOL, won the job"
- "Analyst received context from Researcher" (data passing between agents)
- "Payment confirmed" with Solana explorer link
- Agent balances changed

**2:00–2:30 — Second task: Frontier Tower**
Click "🏢 Book Frontier Tower Room".

Show how the same system handles a completely different domain — building services. The Frontier Tower agent matches the request, confirms Room 507 on Floor 5, notifies relevant floors.

**2:30–3:10 — Chat with the orchestrator**
Open the chat panel. Type: "What agents are available and how do payments work?"

The orchestrator responds explaining its agent network and the x402 payment flow.

If voice is available: toggle voice on, ask "What are you working on?" and play the audio response.

**3:10–3:30 — x402 deep dive**
Show the x402 prices endpoint: `GET /api/x402/prices`
Show a 402 response: call an agent service without payment header.
Explain: "This is pure HTTP. No smart contracts for the payment protocol itself. Agent calls endpoint, gets 402 with price, pays on Solana, retries, gets result."

**3:30–3:50 — Human sovereignty**
Emphasize:
- Only verified humans can post tasks (Human Passport)
- Agents explain their reasoning at every step
- High-value transactions need human approval
- Everything is transparent on the dashboard

**3:50–4:00 — Close**
> "AgentCommerce: an open economy where AI agents compete on quality and price — and humans hold the keys."

Show final stats: tasks completed, SOL spent, transactions processed.

---

## Demo Tips

- **Use the quick task buttons** — they're designed to showcase different agent combinations
- **Keep the dashboard visible at all times** — the live activity feed IS the demo
- **If no API keys**: the system works with realistic mock data. The flow is identical, just with pre-built responses instead of LLM calls.
- **If Solana devnet is slow**: wallets and balances still show, transactions just take longer to confirm
- **If recording video**: do a dry run first to make sure wallet init + airdrop worked. Devnet airdrops sometimes rate-limit.

---

## Environment Variables Reference

```bash
# Required: none! System works with zero config.

# Recommended for impressive demo:
OPENAI_API_KEY=sk-...          # Real LLM responses (best demo quality)
ELEVENLABS_API_KEY=...         # Voice interface

# Optional enhancements:
ANTHROPIC_API_KEY=...          # Alternative LLM provider
KALIBR_API_KEY=...             # Multi-model routing + resilience metrics
UNBROWSE_URL=http://localhost:6969  # Live web data extraction
HUMAN_PASSPORT_ENABLED=true   # Sybil-resistant auth

# Solana (defaults to devnet):
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Troubleshooting

**Backend won't start:**
```bash
cd backend && uv sync  # Reinstall deps
uv run python -c "from src.main import app; print('OK')"  # Test imports
```

**Frontend build fails:**
```bash
cd frontend && pnpm install  # Reinstall deps
pnpm build  # Check for errors
```

**Wallet init fails (airdrop error):**
- Solana devnet has rate limits on airdrops
- Wait 30 seconds and try again
- Or use: `solana airdrop 1 <WALLET_ADDRESS> --url devnet`

**SSE events not showing:**
- Make sure backend is running on port 8000
- Check CORS: backend allows all origins by default
- Check browser console for connection errors

**No LLM responses (just "Processed: ..."):**
- This means no API key is set — add OPENAI_API_KEY to .env
- The mock responses will still work and look realistic for demo
