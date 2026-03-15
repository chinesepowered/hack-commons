# Sponsor Integration Details

**Project:** AgentCommerce — Multi-Agent Economy on Solana
**Status:** New build

---

## Metaplex — Onchain Agent ($5,000)

### What we built
All 5 agents registered on the Metaplex Agent Registry with on-chain identities, metadata, and x402-compatible service endpoints. Agents form an autonomous economy where they discover each other, competitively bid on tasks, and settle payments on-chain.

### On-chain assets (Solana devnet)

| Agent | Asset ID | Role |
|-------|----------|------|
| Collection | `9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv` | — |
| Orchestrator | `2hMU6TRaKsPmR1LkGy4wJPPgVo7n7YfvBbPbc7JX7568` | Coordinator |
| Researcher | `2nnZeVivvVag5jjN3XHJKfZj2M9HJuvbmA7KEW4tQHbf` | Intelligence |
| Analyst | `BAgTXYE45iQwWYJZjXNzuJauxtGZ4EQj5uXxzFEe8wKb` | Processing |
| Executor | `bhB2ot5Q69hcUuLhUBKqSfbcK2rYirEhx5BzjZyW6hR` | On-chain |
| Frontier Tower | `32zzwZDjqkAoibPVsYCMYBgrhJrtvzhadKRXWEGL7Nup` | Services |

### Technical details
- **SDK:** `@metaplex-foundation/mpl-agent-registry` v0.2.0, `@metaplex-foundation/mpl-core` v1.8.0, `@metaplex-foundation/umi`
- **Registration script:** `solana/src/register-agents.ts`
- Each agent has an on-chain registration document with name, description, role, and x402 service endpoint
- Executive profile registered for delegation
- Collection groups all agents under a single AgentCommerce identity

### x402 agent-to-agent commerce
- Every specialist agent exposes an x402-protected endpoint (`/api/x402/service/{agent_id}`)
- Calling without payment returns HTTP 402 + `PaymentRequirements` (recipient wallet, amount in SOL)
- Calling with valid `X-Payment` header (base64 signed Solana tx) executes the service
- Orchestrator pays agents after task completion — real SOL transfers on devnet
- See `GET /api/x402/prices` for live pricing

### Verification
- Explorer: `https://explorer.solana.com/address/9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv?cluster=devnet`
- All transactions visible in the dashboard with clickable explorer links

---

## Solana — Agentic Funding & Coordination ($1,200)

### What we built
A multi-agent economy where 5 AI agents coordinate autonomously on Solana. Agents have real devnet wallets, make real SOL transfers, and settle work via the x402 payment protocol.

### How agents coordinate
1. Human posts a task on the dashboard
2. Orchestrator decomposes it into sub-tasks using LLM
3. Specialist agents bid competitively (Researcher: 0.0001 SOL, Analyst: 0.0002 SOL, etc.)
4. Best bid wins each sub-task
5. Winning agent executes the work
6. Orchestrator pays the agent via real SOL transfer on devnet
7. Results and context pass between agents (Researcher → Analyst → Executor)

### Agent wallets (Solana devnet)

| Agent | Wallet |
|-------|--------|
| Orchestrator | `HJCdoVyA169Q2MWXADGsccM7nw424qYXXxqGXhVtzHae` |
| Researcher | `2CuZnzJw6BXgK42BkExr1h9bwggpNkW8F4rha4ZizPTj` |
| Analyst | `BPpoJK7Usn2u9yqmpALqEWEjCGXMkd94oHqyjwuuMfex` |
| Executor | `4MrPkLLAQpus6zbnr5wnUVSppTtMLShFt3S5MTuniWYT` |
| Frontier Tower | `HN2khMz8ijKXif6kbPSJyhotqJh4mJ437QugYAgGDtsu` |

### Technical details
- **SDK:** `@solana/web3.js` v1.98
- Real `Keypair`, `Connection`, `SystemProgram.transfer` — no mocks for the blockchain layer
- Wallet keys stored in environment variables (base64-encoded secret keys)
- Balance caching to avoid RPC rate limits (15s TTL, invalidated on payments)
- Airdrop-and-spread pattern: airdrop to orchestrator, transfer to workers

### Key files
- `frontend/src/lib/solana-client.ts` — wallet management, transfers, airdrops
- `frontend/src/lib/x402.ts` — x402 protocol (402 responses, payment verification)
- `frontend/src/lib/agents/orchestrator.ts` — task decomposition, bidding, payment flow
- `frontend/src/app/api/x402/service/[agentId]/route.ts` — x402-protected endpoints

---

## Unbrowse — Data Layer ($1,500)

### What we built
The Researcher agent uses Unbrowse as its primary web intelligence layer. When a research task arrives, the agent queries the Unbrowse Skill Marketplace to find relevant cached skills, then executes matching skills to pull real-time web data — all without needing a browser.

### Integration architecture
Unbrowse runs as a local API server on port 6969. The Researcher agent uses three endpoints in sequence:

1. **Marketplace Search** (`POST /v1/search`) — Searches the Unbrowse skill marketplace for skills matching the task intent. Returns ranked skill matches.
2. **Cached Skills** (`GET /v1/skills`) — Lists all locally cached skills available for direct execution.
3. **Skill Execution** (`POST /v1/skills/{skillId}/execute`) — Executes a specific cached skill with parameters. Returns structured web data without any browser interaction.

### How it works in the agent pipeline
1. Researcher agent receives a task from the Orchestrator
2. Checks Unbrowse health (`GET /health`)
3. Searches the skill marketplace for relevant skills matching the task
4. Lists locally cached skills and matches them by intent keywords
5. If a matching skill is found, executes it directly (e.g., npm package search)
6. If no skill matches, falls back to LLM knowledge
7. Synthesizes all collected data into a research report via LLM

### Known cached skills
| Skill | Domain | Use case |
|-------|--------|----------|
| npm search | www.npmjs.com | Search for packages by keyword |
| trendyol | trendyol.com | Product search |
| saucedemo | www.saucedemo.com | Demo/testing |
| httpbin | httpbin.org | API testing |

### Direct skill execution
The npm skill (`k4OAjKpz-wJ4p_KfNSQ03`) is mapped as a known skill for direct execution. Tasks containing keywords like "package", "npm", "library", "sdk", or "module" trigger it automatically, bypassing marketplace search.

### Dashboard visibility
The activity feed shows the full Unbrowse flow in real time:
- "Searched Unbrowse skill marketplace" — marketplace query completed
- "Found N cached Unbrowse skills" — local skills discovered
- "Executed npm search via Unbrowse skill" — skill executed successfully
- "No matching Unbrowse skill found, using LLM knowledge" — graceful fallback

### Why not resolve?
Unbrowse's `resolve` endpoint (`/v1/intent/resolve`) uses browser capture to extract data from arbitrary web pages. This requires a headed browser environment, which isn't available in WSL2 or serverless deployments. The skill marketplace + execution approach is more reliable, faster, and produces structured data — making it a better fit for autonomous agents.

### Key files
- `frontend/src/lib/integrations/unbrowse.ts` — HTTP client for all Unbrowse endpoints (search, execute, skills, resolve, health)
- `frontend/src/lib/agents/researcher.ts` — full Unbrowse integration with marketplace search, skill matching, execution, and LLM fallback

---

## Human.tech — Made by Human ($1,200)

### What we built
Human sovereignty is a core design principle. Only verified humans can post tasks — enforced by Human Passport (formerly Gitcoin Passport), which checks each wallet's Unique Humanity Score against a configurable threshold. Agents are transparent — every decision is visible on the real-time dashboard.

### Integration
- **API:** `GET https://api.passport.xyz/v2/stamps/{scorer_id}/score/{address}` — retrieves a wallet's humanity score and stamp data
- **Auth:** `X-API-KEY` header with Human Passport API key
- **Flow:** When `HUMAN_PASSPORT_ENABLED=true`, the `/api/tasks` endpoint calls `verifyHuman(walletAddress)` before allowing task creation
- **Threshold:** Configurable via `HUMAN_PASSPORT_THRESHOLD` (default: 20, recommended by Human Passport)
- **Rejection:** Returns HTTP 403 with score details and a link to `https://passport.human.tech` so users can build their score
- **Fallback:** When not enabled, tasks go through without verification (for local dev)

### How it works
1. User submits a task with their wallet address
2. `verifyHuman()` calls the Human Passport Stamps API
3. API returns the wallet's Unique Humanity Score (based on verified credentials: Discord, Google, NFT holdings, Coinbase, BrightID, etc.)
4. If `passing_score` is true, the task proceeds to the Orchestrator
5. If the score is below threshold or no passport exists, the task is rejected with details

### Covenant alignment
- Only verified humans can post tasks — enforced by Human Passport score
- Humans set budgets and approval thresholds
- High-value transactions require human sign-off
- Every agent action is transparent on the real-time dashboard
- Agents explain their reasoning at every step

### Environment variables
```
HUMAN_PASSPORT_ENABLED=true
HUMAN_PASSPORT_API_KEY=your_api_key
HUMAN_PASSPORT_SCORER_ID=your_scorer_id
HUMAN_PASSPORT_THRESHOLD=20
```

### Verification (live API test)

Scorer ID `11965`, created 2026-03-14. Tested against a zero-stamp address:

```bash
curl -s "https://api.passport.xyz/v2/stamps/11965/score/0x0000000000000000000000000000000000000001" \
  -H "X-API-KEY: $HUMAN_PASSPORT_API_KEY"
```

```json
{
  "address": "0x0000000000000000000000000000000000000001",
  "score": "0.00000",
  "passing_score": false,
  "last_score_timestamp": "2026-03-15T06:25:15.031623+00:00",
  "expiration_timestamp": null,
  "threshold": "20.00000",
  "error": null,
  "stamps": {}
}
```

Result: `passing_score: false` — unverified wallet correctly rejected. A wallet with verified credentials (Discord, Google, Coinbase, etc.) scoring 20+ would return `passing_score: true` and be allowed to submit tasks.

### Key files
- `frontend/src/lib/integrations/human-passport.ts` — Human Passport API client (verifyHuman, getPassportScore, humanPassportStatus)
- `frontend/src/app/api/tasks/route.ts` — human verification gate before task creation
- `frontend/src/lib/config.ts` — passport configuration (API key, scorer ID, threshold)

---

## Frontier Tower — Building Agent ($500)

### What we built
Frontier Tower exists as a first-class agent in the AgentCommerce economy. It represents the 16-floor SF innovation hub (700+ members) and offers building services that other agents or humans can discover and pay for via x402.

The standout feature is **autonomous price negotiation**: when booking a room, the Orchestrator (acting as buyer) and Frontier Tower (as seller) engage in a multi-round LLM-powered negotiation — referencing competing venues, making counter-offers, and settling on a discount.

### Negotiation flow (room bookings)

| Round | Speaker | Action |
|-------|---------|--------|
| 1 | Frontier Tower | Quotes list price (0.001 SOL), pitches premium amenities |
| 2 | Orchestrator (Buyer) | Counter-offers citing a competing venue (WeWork Mission, Galvanize SF, TechShop, or Hacker Dojo) at a lower price |
| 3 | Frontier Tower | Acknowledges competition, counters at a middle price (never below 60% of list), offers a perk |
| 4 | Orchestrator (Buyer) | Accepts the negotiated deal |

Each round emits a distinct event visible in the live activity feed, showing the full back-and-forth in real time. The final agreed price includes the discount percentage and which competing venue was referenced.

### Services

| Service | List Price (SOL) | Description | Negotiable? |
|---------|-----------------|-------------|-------------|
| Room booking | 0.001 | Book a room on any floor | Yes — multi-round negotiation |
| Day pass | 0.005 | Purchase a day pass | No |
| Bounty posting | 0.0002 | Post a bounty to a specific floor | No |
| Resource matching | 0.0001 | Find someone with specific skills | No |
| Event scheduling | 0.0003 | Schedule an event | No |

### How it works
1. Task mentions Frontier Tower, rooms, events, experts, etc.
2. Orchestrator routes to Frontier Tower agent
3. Agent detects service type from description keywords
4. For room bookings: 4-round negotiation with competing venue references and counter-offers
5. For other services: LLM generates a contextual response with specific floor/room/member details
6. Agent gets paid the negotiated (or list) price via x402

### Floor directory (built into agent knowledge)
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

### On-chain identity
- Metaplex asset: `32zzwZDjqkAoibPVsYCMYBgrhJrtvzhadKRXWEGL7Nup`
- Wallet: `HN2khMz8ijKXif6kbPSJyhotqJh4mJ437QugYAgGDtsu`
- x402 endpoint: `/api/x402/service/frontier_tower`

### Key files
- `frontend/src/lib/agents/frontier-tower.ts` — service detection, negotiation engine, LLM response generation
- `frontend/src/app/api/x402/service/[agentId]/route.ts` — x402-protected endpoint

---

## Arkhai — Agentic Commerce ($1,000)

### What we built
After agents negotiate a room booking price, the agreed terms are recorded as an on-chain attestation on Base Sepolia via Alkahest's `StringObligation`. This creates a verifiable, cross-chain record of the agent-to-agent agreement — linking the Solana payment to an EAS attestation on Base.

### Integration
- **SDK:** `alkahest-ts` v0.7.3 + `viem`
- **Chain:** Base Sepolia (pre-deployed Alkahest contracts)
- **Method:** `client.stringObligation.doObligationJson(agreement)` — records the negotiation agreement as a JSON attestation
- Only triggers for room bookings after negotiation completes — all other flows are unaffected
- Skips gracefully if `ALKAHEST_PRIVATE_KEY` is not set

### What gets attested
```json
{
  "service": "room_booking",
  "buyer": "orchestrator",
  "seller": "frontier_tower",
  "list_price_sol": 0.001,
  "negotiated_price_sol": 0.0007,
  "discount_pct": 30,
  "competing_venue": "Hacker Dojo",
  "rounds": 4,
  "timestamp": "2026-03-15T...",
  "solana_network": "devnet"
}
```

### Verification
Test attestation on Base Sepolia:
- TX: `0x7d5ea78e4d4ee8541e723b7156c79e2c450d8cfd4b6e486307c569b559498bca`
- Attestation: `https://base-sepolia.easscan.org/attestation/view/0x3fe1ab1177119a3b2ebc9e0f666cdcb4716425f44fd132a6e9a7c1d8fee3db3a`

### Key files
- `frontend/src/lib/integrations/alkahest.ts` — Alkahest client, `recordNegotiationAgreement()`
- `frontend/src/lib/agents/frontier-tower.ts` — calls Alkahest after negotiation agreement

---

## ElevenLabs — Voice Challenge (credits)

### What we built
Voice interface for the Orchestrator agent. Users can toggle voice mode in the chat panel to hear the orchestrator speak its responses. Text chat always works as fallback.

### Integration
- **TTS:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` — converts orchestrator responses to audio
- **STT:** `POST https://api.elevenlabs.io/v1/speech-to-text` — transcribes voice input
- Voice toggle in chat UI with recording button (hold to speak)
- Audio response plays automatically in browser
- `X-Text-Response` header provides text alongside audio

### Fallback
- When `ELEVENLABS_API_KEY` is not set: text-only chat, identical UX minus audio
- `GET /api/voice/status` reports availability

### Key files
- `frontend/src/lib/integrations/elevenlabs.ts` — TTS/STT HTTP clients
- `frontend/src/app/api/chat/voice/route.ts` — voice chat endpoint
- `frontend/src/app/components/ChatPanel.tsx` — voice UI toggle, recording, audio playback
