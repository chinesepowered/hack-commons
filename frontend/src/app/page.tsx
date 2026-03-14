"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ChatPanel from "./components/ChatPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  description: string;
  status: string;
  balance: number;
  wallet_address: string | null;
}

interface AgentEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface Transaction {
  from: string;
  to: string;
  amount_sol: number;
  signature: string;
  explorer_url: string;
  timestamp: string;
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#3b82f6",
  researcher: "#10b981",
  analyst: "#8b5cf6",
  executor: "#f59e0b",
  frontier_tower: "#ec4899",
};

const EVENT_ICONS: Record<string, string> = {
  thinking: "\u{1F9E0}",
  plan: "\u{1F4CB}",
  bidding: "\u{1F4B0}",
  bid_received: "\u{1F3F7}\uFE0F",
  assigned: "\u2705",
  complete: "\u{1F389}",
  no_bids: "\u26A0\uFE0F",
  searching: "\u{1F50D}",
  unbrowse: "\u{1F310}",
  fallback: "\u{1F504}",
  research: "\u{1F4CA}",
  processing: "\u2699\uFE0F",
  insight: "\u{1F4A1}",
  planning: "\u{1F4DD}",
  executing: "\u26A1",
  tx_submitted: "\u{1F517}",
  service_matched: "\u{1F3E2}",
  confirmed: "\u2705",
  received: "\u{1F4E5}",
  completed: "\u2705",
  failed: "\u274C",
  airdrop: "\u{1F4A7}",
  transfer: "\u{1F4B8}",
  payment: "\u{1F4B0}",
  payment_required: "\u{1F510}",
  payment_verified: "\u2705",
  payment_completed: "\u{1F4B8}",
  service_executing: "\u2699\uFE0F",
  demo: "\u{1F3AC}",
};

function getEventIcon(type: string): string {
  const parts = type.split(".");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (EVENT_ICONS[parts[i]]) return EVENT_ICONS[parts[i]];
  }
  return "\u{1F4E1}";
}

function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId] || "#6b7280";
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatEventData(data: Record<string, unknown>): React.ReactNode {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(
      ([k]) => !["agent_id", "agent_name"].includes(k)
    )
  );

  // Priority display fields
  if (filtered.message) {
    const msg = String(filtered.message);
    const explorerUrl = filtered.explorer_url as string | undefined;
    if (explorerUrl) {
      return (
        <span>
          {msg}{" "}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            [View on Explorer]
          </a>
        </span>
      );
    }
    return msg;
  }

  // Show explorer URL if present
  if (filtered.explorer_url) {
    return (
      <a href={String(filtered.explorer_url)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
        View transaction on Solana Explorer
      </a>
    );
  }

  if (filtered.summary) return String(filtered.summary);
  if (filtered.confirmation) return String(filtered.confirmation);

  // Show payment info prominently
  if (filtered.amount_sol !== undefined) {
    return (
      <span>
        <span className="text-emerald-400 font-mono font-medium">{Number(filtered.amount_sol).toFixed(4)} SOL</span>
        {!!filtered.signature && (
          <span className="text-zinc-600 ml-2">sig: {String(filtered.signature).slice(0, 8)}...</span>
        )}
      </span>
    );
  }

  const meaningful = Object.entries(filtered)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => `${k}: ${v}`)
    .slice(0, 3)
    .join(" \u00B7 ");

  return meaningful || JSON.stringify(filtered).slice(0, 150);
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [initializingWallets, setInitializingWallets] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const fetchAgents = useCallback(() => {
    fetch(`${API_URL}/api/agents`)
      .then((res) => res.json())
      .then(setAgents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  useEffect(() => {
    fetch(`${API_URL}/api/wallets`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0 && data[0].wallet_address) {
          setWalletsInitialized(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/api/events`);
    eventSource.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      setEvents((prev) => [...prev.slice(-200), event]);
      fetchAgents();

      // Track transactions
      if (
        event.type === "solana.transfer" ||
        event.type === "solana.airdrop" ||
        event.type.includes("payment.completed") ||
        event.type === "x402.payment_verified"
      ) {
        setTransactions((prev) => [
          ...prev,
          {
            from: String(event.data.from || event.data.payer || event.data.agent_name || ""),
            to: String(event.data.to || event.data.recipient || ""),
            amount_sol: Number(event.data.amount_sol || event.data.bid_price || 0),
            signature: String(event.data.signature || event.data.payment_signature || ""),
            explorer_url: String(event.data.explorer_url || (event.data.signature ? `https://explorer.solana.com/tx/${event.data.signature}?cluster=devnet` : "")),
            timestamp: event.timestamp,
          },
        ]);
      }

      // Track stats
      if (event.type === "orchestrator.complete") {
        setTaskCount((c) => c + 1);
        setTotalSpent((s) => s + Number(event.data.total_cost || 0));
      }
    };
    return () => eventSource.close();
  }, [fetchAgents]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const initWallets = async () => {
    setInitializingWallets(true);
    try {
      const res = await fetch(`${API_URL}/api/wallets/init`, { method: "POST" });
      const data = await res.json();
      if (data.wallets || data.success !== false) {
        setWalletsInitialized(true);
        fetchAgents();
      }
    } catch (err) {
      console.error("Failed to init wallets:", err);
    }
    setInitializingWallets(false);
  };

  const submitTask = async () => {
    if (!taskInput.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: taskInput }),
      });
      setTaskInput("");
    } catch (err) {
      console.error("Failed:", err);
    }
    setIsSubmitting(false);
  };

  const quickTask = async (description: string) => {
    setTaskInput(description);
    setIsSubmitting(true);
    try {
      await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
    } catch (err) {
      console.error("Failed:", err);
    }
    setIsSubmitting(false);
    setTaskInput("");
  };

  const statusStyles = (status: string) => {
    switch (status) {
      case "working":
        return { dot: "bg-amber-400 animate-pulse", text: "text-amber-400" };
      case "error":
        return { dot: "bg-red-400", text: "text-red-400" };
      default:
        return { dot: "bg-emerald-400", text: "text-emerald-400" };
    }
  };

  const activeAgents = agents.filter((a) => a.status === "working").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              AC
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight gradient-text">
                AgentCommerce
              </h1>
              <p className="text-[11px] text-zinc-500 -mt-0.5">
                Multi-Agent Economy on Solana
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-zinc-500 text-[11px]">Tasks</p>
              <p className="font-mono font-semibold">{taskCount}</p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500 text-[11px]">Spent</p>
              <p className="font-mono font-semibold">{totalSpent.toFixed(4)} SOL</p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500 text-[11px]">Txns</p>
              <p className="font-mono font-semibold">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500 text-[11px]">Active</p>
              <p className="font-mono font-semibold">{activeAgents}/{agents.length}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-medium">Devnet</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {/* Wallet Setup Banner */}
        {!walletsInitialized && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-300">Initialize Agent Wallets</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Create Solana devnet wallets for all agents and airdrop test SOL
              </p>
            </div>
            <button
              onClick={initWallets}
              disabled={initializingWallets}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {initializingWallets ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Wallets"
              )}
            </button>
          </div>
        )}

        {/* Task Input */}
        <div className="mb-6 bg-[#12121a] rounded-xl border border-[#1e1e2e] p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTask()}
              placeholder="Describe a task for the agent economy... (e.g., Research top Solana DeFi protocols, Book a room at Frontier Tower)"
              className="flex-1 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            <button
              onClick={submitTask}
              disabled={isSubmitting || !taskInput.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-all text-sm"
            >
              {isSubmitting ? "Running..." : "Submit Task"}
            </button>
          </div>
        </div>

        {/* Quick Demo Tasks */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-[11px] text-zinc-500 self-center mr-1">Quick tasks:</span>
          {[
            { label: "\u{1F50D} Research Solana DeFi", task: "Research the top 3 Solana DeFi protocols by TVL, analyze their yield opportunities, and recommend the best LP position for a $1000 investment" },
            { label: "\u{1F3E2} Book Frontier Tower Room", task: "Book a meeting room on Floor 5 at Frontier Tower for a robotics workshop next Tuesday, need space for 20 people with a projector" },
            { label: "\u{1F4CA} Analyze & Trade", task: "Research SOL/USDC price action, analyze whether it's a good entry point, and execute a limit order if conditions are favorable" },
            { label: "\u{1F91D} Find Expert", task: "Find someone at Frontier Tower with robotics and computer vision expertise who could help with a VLA pipeline project" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => quickTask(item.task)}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-[11px] bg-[#12121a] border border-[#1e1e2e] rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-[#2a2a3a] transition-colors disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agents Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Agents
            </h2>
            {agents.map((agent) => {
              const styles = statusStyles(agent.status);
              const color = getAgentColor(agent.agent_id);
              return (
                <div
                  key={agent.agent_id}
                  className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-4 hover:border-[#2a2a3a] transition-colors"
                  style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                      <span className={`text-[11px] capitalize ${styles.text}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 font-mono">
                      {agent.wallet_address
                        ? truncateAddress(agent.wallet_address)
                        : "No wallet"}
                    </span>
                    <span className="text-zinc-400 font-mono font-medium">
                      {agent.balance.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Activity Feed */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Live Activity
              </h2>
              <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] h-[500px] overflow-y-auto p-3 space-y-1.5">
                {events.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <span className="text-4xl mb-3">{"\u{1F916}"}</span>
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs mt-1">Submit a task to see agents in action</p>
                  </div>
                )}
                {events.map((event, i) => {
                  const agentId = String(event.data.agent_id || "");
                  const color = getAgentColor(agentId);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0a0a0f]/50 border border-[#1e1e2e]/50 animate-fade-in"
                      style={{ borderLeftColor: color, borderLeftWidth: "2px" }}
                    >
                      <span className="text-base mt-0.5 shrink-0">
                        {getEventIcon(event.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color }}
                          >
                            {String(event.data.agent_name || "System")}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {event.type.split(".").slice(1).join(".")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                          {formatEventData(event.data)}
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-700 whitespace-nowrap font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
                <div ref={eventsEndRef} />
              </div>
            </div>

            {/* Chat Panel */}
            <ChatPanel />

            {/* Transactions */}
            {transactions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Solana Transactions
                </h2>
                <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1e1e2e] text-zinc-500">
                        <th className="text-left px-4 py-2 font-medium">From</th>
                        <th className="text-left px-4 py-2 font-medium">To</th>
                        <th className="text-right px-4 py-2 font-medium">Amount</th>
                        <th className="text-right px-4 py-2 font-medium">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, i) => (
                        <tr key={i} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/30">
                          <td className="px-4 py-2 font-mono text-zinc-400">
                            {truncateAddress(tx.from)}
                          </td>
                          <td className="px-4 py-2 font-mono text-zinc-400">
                            {truncateAddress(tx.to)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-400">
                            {tx.amount_sol.toFixed(4)} SOL
                          </td>
                          <td className="px-4 py-2 text-right">
                            {tx.explorer_url ? (
                              <a
                                href={tx.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-zinc-600">{"\u2014"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
