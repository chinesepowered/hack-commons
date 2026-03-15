import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";
import { recordNegotiationAgreement, isAlkahestConfigured } from "../integrations/alkahest";

const SERVICES: Record<string, { price: number; description: string }> = {
  room_booking: { price: 0.001, description: "Book a room on any floor" },
  day_pass: { price: 0.005, description: "Purchase a day pass" },
  bounty_post: { price: 0.0002, description: "Post a bounty to a specific floor" },
  resource_match: { price: 0.0001, description: "Find someone with specific skills" },
  event_schedule: { price: 0.0003, description: "Schedule an event" },
};

// Competing venues the negotiator agent can reference
const COMPETING_VENUES = [
  { name: "WeWork Mission", price: 0.0006, detail: "shared conference room, no lab access" },
  { name: "Galvanize SF", price: 0.0007, detail: "basic meeting room, no specialized equipment" },
  { name: "TechShop Residency", price: 0.0005, detail: "maker space only, no private rooms" },
  { name: "Hacker Dojo", price: 0.0004, detail: "open floor plan, noisy environment" },
];

function detectService(description: string): string {
  const lower = description.toLowerCase();
  if (["book", "room", "space", "meeting"].some((w) => lower.includes(w))) return "room_booking";
  if (["pass", "visit", "access", "day"].some((w) => lower.includes(w))) return "day_pass";
  if (["bounty", "task", "job", "work"].some((w) => lower.includes(w))) return "bounty_post";
  if (["find", "match", "skill", "expert", "someone"].some((w) => lower.includes(w))) return "resource_match";
  if (["event", "schedule", "meetup", "workshop"].some((w) => lower.includes(w))) return "event_schedule";
  return "resource_match";
}

interface NegotiationRound {
  round: number;
  speaker: "buyer" | "seller";
  message: string;
  offered_price: number;
}

export class FrontierTowerAgent extends BaseAgent {
  constructor() {
    super({
      agentId: "frontier_tower",
      name: "Frontier Tower",
      role: "service_provider",
      description: "Frontier Tower innovation hub services: room booking, bounty posting, resource matching, day passes, event coordination.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";

    this.emit("frontier_tower.processing", {
      message: `Processing Frontier Tower request: ${description.slice(0, 100)}...`,
    });

    const service = detectService(description);
    const svc = SERVICES[service];

    this.emit("frontier_tower.service_matched", {
      message: `Matched service: ${svc.description}`,
      service,
      price: svc.price,
    });

    // Run negotiation for room bookings — the interesting demo case
    if (service === "room_booking") {
      return this.executeWithNegotiation(task, description, service, svc);
    }

    // Non-booking services go straight through
    return this.executeDirectly(description, service, svc);
  }

  private async executeWithNegotiation(
    task: TaskInput,
    description: string,
    service: string,
    svc: { price: number; description: string }
  ): Promise<TaskResult> {
    const listPrice = svc.price;
    const floorPrice = listPrice * 0.6; // Won't go below 60% of list
    const negotiationLog: NegotiationRound[] = [];

    // Pick a random competing venue for the buyer to reference
    const competitor = COMPETING_VENUES[Math.floor(Math.random() * COMPETING_VENUES.length)];

    // === ROUND 1: Frontier Tower opens with list price ===
    this.emit("frontier_tower.negotiation.quote", {
      message: `📋 Frontier Tower quotes ${listPrice} SOL for room booking`,
      price: listPrice,
      service,
    });

    const sellerOpen = await llmCompletion("negotiation_seller_open", [
      { role: "system", content: `You are the Frontier Tower AI concierge. A client wants to book a room. Quote the list price of ${listPrice} SOL. Mention what makes your space special (labs, specialized equipment, community of 700+ innovators). Keep it to 2-3 sentences. Be confident but friendly.` },
      { role: "user", content: description },
    ]);

    negotiationLog.push({ round: 1, speaker: "seller", message: sellerOpen, offered_price: listPrice });

    this.emit("frontier_tower.negotiation.seller", {
      message: sellerOpen.slice(0, 200),
      round: 1,
      price: listPrice,
      speaker: "Frontier Tower",
    });

    // === ROUND 2: Buyer counters with competing offer ===
    const buyerCounter = await llmCompletion("negotiation_buyer_counter", [
      { role: "system", content: `You are an autonomous purchasing agent negotiating on behalf of your client. You're trying to get the best deal on a room booking.

The seller (Frontier Tower) just quoted ${listPrice} SOL. You know that ${competitor.name} is offering a similar space for ${competitor.price} SOL (${competitor.detail}).

Make a counter-offer at ${competitor.price} SOL. Reference the competing venue by name. Be polite but firm. Mention you have budget constraints. Keep it to 2-3 sentences.` },
      { role: "user", content: `Seller's pitch: ${sellerOpen}` },
    ]);

    negotiationLog.push({ round: 2, speaker: "buyer", message: buyerCounter, offered_price: competitor.price });

    this.emit("frontier_tower.negotiation.buyer", {
      message: buyerCounter.slice(0, 200),
      round: 2,
      price: competitor.price,
      speaker: "Orchestrator (Buyer)",
      competing_venue: competitor.name,
    });

    // === ROUND 3: Frontier Tower counter-offers ===
    // Split the difference, but stay above floor
    const counterPrice = Math.max(floorPrice, Math.round(((listPrice + competitor.price) / 2) * 10000) / 10000);

    const sellerCounter = await llmCompletion("negotiation_seller_counter", [
      { role: "system", content: `You are the Frontier Tower AI concierge negotiating a room booking. The buyer counter-offered ${competitor.price} SOL, citing ${competitor.name} as a cheaper alternative (${competitor.detail}).

You know your space is premium — specialized labs, 700+ member community, and equipment that ${competitor.name} can't match. Counter at ${counterPrice} SOL. Acknowledge their budget concern, but explain why Frontier Tower's value justifies the price difference. Offer a small perk (e.g., complimentary coffee, access to the maker space, intro to a relevant member). Keep it to 2-3 sentences.` },
      { role: "user", content: `Buyer said: ${buyerCounter}` },
    ]);

    negotiationLog.push({ round: 3, speaker: "seller", message: sellerCounter, offered_price: counterPrice });

    this.emit("frontier_tower.negotiation.seller", {
      message: sellerCounter.slice(0, 200),
      round: 3,
      price: counterPrice,
      speaker: "Frontier Tower",
    });

    // === ROUND 4: Buyer accepts or makes final push ===
    const discount = Math.round((1 - counterPrice / listPrice) * 100);
    const finalPrice = counterPrice;

    const buyerAccept = await llmCompletion("negotiation_buyer_accept", [
      { role: "system", content: `You are an autonomous purchasing agent. Frontier Tower countered at ${counterPrice} SOL (${discount}% off their list price of ${listPrice} SOL) and offered perks.

This is a fair deal — accept it. Mention you appreciate the discount and the added perks. Confirm you'd like to proceed with the booking. Keep it to 1-2 sentences.` },
      { role: "user", content: `Seller said: ${sellerCounter}` },
    ]);

    negotiationLog.push({ round: 4, speaker: "buyer", message: buyerAccept, offered_price: finalPrice });

    this.emit("frontier_tower.negotiation.buyer", {
      message: buyerAccept.slice(0, 200),
      round: 4,
      price: finalPrice,
      speaker: "Orchestrator (Buyer)",
    });

    // === DEAL AGREED — emit summary ===
    this.emit("frontier_tower.negotiation.agreed", {
      message: `🤝 Deal agreed at ${finalPrice} SOL (${discount}% off list price of ${listPrice} SOL)`,
      list_price: listPrice,
      final_price: finalPrice,
      discount_pct: discount,
      rounds: negotiationLog.length,
      competing_venue: competitor.name,
    });

    // === Record agreement on-chain via Alkahest (Base Sepolia) ===
    let alkahestAttestation: { uid: string; txHash: string; explorerUrl: string } | null = null;
    if (isAlkahestConfigured()) {
      try {
        this.emit("frontier_tower.alkahest.creating", {
          message: "Recording negotiation agreement on Base Sepolia via Alkahest...",
        });

        alkahestAttestation = await recordNegotiationAgreement({
          service: "room_booking",
          buyer: "orchestrator",
          seller: "frontier_tower",
          list_price_sol: listPrice,
          negotiated_price_sol: finalPrice,
          discount_pct: discount,
          competing_venue: competitor.name,
          rounds: negotiationLog.length,
          timestamp: new Date().toISOString(),
          solana_network: "devnet",
        });

        if (alkahestAttestation) {
          this.emit("frontier_tower.alkahest.recorded", {
            message: `Negotiation agreement attested on Base Sepolia`,
            attestation_uid: alkahestAttestation.uid,
            tx_hash: alkahestAttestation.txHash,
            explorer_url: alkahestAttestation.explorerUrl,
          });
        }
      } catch (err) {
        this.emit("frontier_tower.alkahest.skipped", {
          message: `Alkahest attestation failed: ${err instanceof Error ? err.message : "unknown"}`,
        });
      }
    }

    // === Generate final booking confirmation ===
    const systemPrompt = `You are the Frontier Tower AI concierge — managing a 16-floor innovation hub in San Francisco with 700+ members across AI, robotics, neurotech, biotech, and arts.

Floor directory:
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

The client just negotiated the room booking down from ${listPrice} SOL to ${finalPrice} SOL (${discount}% discount). Confirm the booking with specific details (floor, room number, time). Mention the negotiated price and any perks included. Keep it concise and friendly.`;

    const confirmation = await llmCompletion("frontier_tower_service", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("frontier_tower.confirmed", {
      message: `Service confirmed: ${service} (negotiated)`,
      service,
      list_price: listPrice,
      final_price: finalPrice,
      discount_pct: discount,
      confirmation: confirmation.slice(0, 200),
    });

    return {
      success: true,
      data: {
        service,
        confirmation,
        list_price: listPrice,
        negotiated_price: finalPrice,
        discount_pct: discount,
        negotiation_rounds: negotiationLog.length,
        negotiation_log: negotiationLog,
        competing_venue_referenced: competitor.name,
        alkahest_attestation: alkahestAttestation,
      },
      cost: finalPrice,
    };
  }

  private async executeDirectly(
    description: string,
    service: string,
    svc: { price: number; description: string }
  ): Promise<TaskResult> {
    const systemPrompt = `You are the Frontier Tower AI concierge — managing a 16-floor innovation hub in San Francisco with 700+ members across AI, robotics, neurotech, biotech, and arts.

Floor directory:
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

Service being fulfilled: ${service} — ${svc.description}

Respond as if you're confirming the service. Include specific details (floor number, room number, member names, times). Keep it concise, friendly, and feel real — not generic.`;

    const responseText = await llmCompletion("frontier_tower_service", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("frontier_tower.confirmed", {
      message: `Service confirmed: ${service}`,
      service,
      price: svc.price,
      confirmation: responseText.slice(0, 200),
    });

    return {
      success: true,
      data: { service, confirmation: responseText, price: svc.price },
      cost: svc.price,
    };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return task.type === "frontier_tower" ? 0.0001 : null;
  }
}
