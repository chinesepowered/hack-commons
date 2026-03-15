import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplAgentIdentity } from '@metaplex-foundation/mpl-agent-registry';
import { registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity';
import { registerExecutiveV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools';
import { mplAgentTools } from '@metaplex-foundation/mpl-agent-registry';
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { create, createCollection } from '@metaplex-foundation/mpl-core';
import { Keypair } from '@solana/web3.js';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Load orchestrator wallet from env (same key as the Next.js app uses)
const ORCHESTRATOR_KEY = process.env.ORCHESTRATOR_PRIVATE_KEY;
if (!ORCHESTRATOR_KEY) {
  console.error('❌ Set ORCHESTRATOR_PRIVATE_KEY in environment (base64-encoded secret key)');
  process.exit(1);
}

const orchestratorKeypair = Keypair.fromSecretKey(
  Buffer.from(ORCHESTRATOR_KEY, 'base64')
);

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  role: string;
  endpoint: string;
}

const AGENTS: AgentConfig[] = [
  {
    id: 'orchestrator',
    name: 'AgentCommerce Orchestrator',
    description: 'Receives tasks from verified humans, decomposes them into sub-tasks, discovers and hires specialist agents, manages x402 payments on Solana.',
    role: 'orchestrator',
    endpoint: `${BASE_URL}/api/tasks`,
  },
  {
    id: 'researcher',
    name: 'AgentCommerce Researcher',
    description: 'Gathers web intelligence and market data using Unbrowse. Specializes in DeFi protocol analysis, TVL tracking, and competitive research.',
    role: 'researcher',
    endpoint: `${BASE_URL}/api/x402/service/researcher`,
  },
  {
    id: 'analyst',
    name: 'AgentCommerce Analyst',
    description: 'Processes research data into actionable insights. Risk assessment, yield analysis, portfolio recommendations with confidence scoring.',
    role: 'analyst',
    endpoint: `${BASE_URL}/api/x402/service/analyst`,
  },
  {
    id: 'executor',
    name: 'AgentCommerce Executor',
    description: 'Executes on-chain actions on Solana: swaps via Jupiter, LP positions on Orca/Raydium, staking, token operations. Human approval for high-value transactions.',
    role: 'executor',
    endpoint: `${BASE_URL}/api/x402/service/executor`,
  },
  {
    id: 'frontier_tower',
    name: 'AgentCommerce Frontier Tower',
    description: 'Frontier Tower innovation hub (16-floor SF building, 700+ members) services: room booking, bounty posting, cross-floor resource matching, event coordination.',
    role: 'service_provider',
    endpoint: `${BASE_URL}/api/x402/service/frontier_tower`,
  },
];

function makeRegistrationDoc(agent: AgentConfig, assetPubkey: string) {
  return {
    type: 'agent-registration-v1',
    name: agent.name,
    description: agent.description,
    services: [
      {
        name: 'web',
        endpoint: agent.endpoint,
      },
    ],
    active: true,
    registrations: [
      {
        agentId: assetPubkey,
        agentRegistry: 'solana:devnet:1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p',
      },
    ],
    supportedTrust: ['reputation'],
  };
}

function toDataUri(obj: object): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(obj)).toString('base64')}`;
}

async function main() {
  console.log('🚀 Registering AgentCommerce agents on Solana devnet...\n');

  const umi = createUmi(SOLANA_RPC).use(mplAgentIdentity()).use(mplAgentTools());

  // Use orchestrator wallet as payer
  const secret = Buffer.from(ORCHESTRATOR_KEY!, 'base64');
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secret);
  umi.use(keypairIdentity(umiKeypair));

  console.log(`Payer: ${umiKeypair.publicKey}`);
  console.log(`RPC: ${SOLANA_RPC}\n`);

  // Step 1: Create agent collection
  console.log('📦 Creating agent collection...');
  const collectionMeta = {
    name: 'AgentCommerce',
    description: 'Multi-agent economy on Solana — agents discover, negotiate, and pay each other on-chain via x402.',
    image: '',
  };
  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: 'AgentCommerce Agents',
    uri: toDataUri(collectionMeta),
  }).sendAndConfirm(umi);
  console.log(`   Collection: ${collection.publicKey}\n`);

  // Step 2: Register each agent
  const registeredAgents: Array<{ id: string; name: string; asset: string }> = [];

  for (const agentConfig of AGENTS) {
    console.log(`🤖 Registering ${agentConfig.name}...`);

    const asset = generateSigner(umi);

    const agentMeta = {
      name: agentConfig.name,
      description: agentConfig.description,
      attributes: [
        { trait_type: 'role', value: agentConfig.role },
        { trait_type: 'protocol', value: 'x402' },
        { trait_type: 'network', value: 'solana-devnet' },
      ],
    };

    await create(umi, {
      asset,
      name: agentConfig.name,
      uri: toDataUri(agentMeta),
      collection,
    }).sendAndConfirm(umi);

    const registrationDoc = makeRegistrationDoc(agentConfig, asset.publicKey.toString());

    await registerIdentityV1(umi, {
      asset: asset.publicKey,
      collection: collection.publicKey,
      agentRegistrationUri: toDataUri(registrationDoc),
    }).sendAndConfirm(umi);

    console.log(`   Asset: ${asset.publicKey}`);
    console.log(`   Role: ${agentConfig.role}`);
    console.log(`   Endpoint: ${agentConfig.endpoint}`);
    console.log(`   ✅ Registered!\n`);

    registeredAgents.push({
      id: agentConfig.id,
      name: agentConfig.name,
      asset: asset.publicKey.toString(),
    });
  }

  // Step 3: Register executive profile
  console.log('🔑 Registering executive profile...');
  await registerExecutiveV1(umi, {
    payer: umi.payer,
  }).sendAndConfirm(umi);
  console.log('   ✅ Executive profile created!\n');

  console.log('═══════════════════════════════════════');
  console.log('🎉 All agents registered successfully!');
  console.log('═══════════════════════════════════════\n');
  console.log('Collection:', collection.publicKey.toString());
  console.log('\nAgents:');
  for (const a of registeredAgents) {
    console.log(`  ${a.id.padEnd(16)} ${a.asset}`);
  }
  console.log('\n💡 Save these asset IDs — add them to your .env.local as METAPLEX_ASSET_IDs if needed.');
}

main().catch((e) => {
  console.error('❌ Registration failed:', e);
  process.exit(1);
});
