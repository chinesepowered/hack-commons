export interface AgentEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const MAX_EVENTS = 500;

class EventBus {
  private buffer: AgentEvent[] = [];

  publish(eventType: string, data: Record<string, unknown>) {
    const event: AgentEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    };
    this.buffer.push(event);
    if (this.buffer.length > MAX_EVENTS) {
      this.buffer = this.buffer.slice(-MAX_EVENTS);
    }
  }

  getRecent(since?: string): AgentEvent[] {
    if (!since) return [...this.buffer];
    return this.buffer.filter((e) => e.timestamp > since);
  }

  clear() {
    this.buffer = [];
  }
}

// Persist across hot reloads in dev
const globalForEvents = globalThis as unknown as { eventBus: EventBus };
export const eventBus = globalForEvents.eventBus ?? new EventBus();
globalForEvents.eventBus = eventBus;

export function solanaExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
