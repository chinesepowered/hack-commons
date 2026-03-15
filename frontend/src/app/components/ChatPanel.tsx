"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/voice/status")
      .then((r) => r.json())
      .then((data) => setVoiceAvailable(data.voice_available))
      .catch(() => setVoiceAvailable(false));
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (useVoice && voiceAvailable) {
        const res = await fetch("/api/chat/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        const contentType = res.headers.get("content-type") || "";
        let responseText = "";

        if (contentType.includes("audio")) {
          responseText = res.headers.get("X-Text-Response") || "Voice response";
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
        } else {
          const data = await res.json();
          responseText = data.text;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: responseText,
            timestamp: new Date(),
            isVoice: contentType.includes("audio"),
          },
        ]);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.text,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to reach the orchestrator. Is the server running?",
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (voiceAvailable) {
          setInput("[Voice input — type your message instead]");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-300">
            Chat with Orchestrator
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {voiceAvailable && (
            <button
              onClick={() => setUseVoice(!useVoice)}
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                useVoice
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}
            >
              {useVoice ? "\uD83D\uDD0A Voice On" : "\uD83D\uDD07 Voice Off"}
            </button>
          )}
          {!voiceAvailable && (
            <span className="text-[10px] text-zinc-600">Text mode</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-8">
            <p>Ask the orchestrator anything</p>
            <p className="text-xs mt-1 text-zinc-700">
              &quot;What agents are available?&quot; or &quot;How would you handle X?&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600/20 text-blue-100 border border-blue-500/20"
                  : "bg-[#0a0a0f] text-zinc-300 border border-[#1e1e2e]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-zinc-600">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                {msg.isVoice && (
                  <span className="text-[10px] text-blue-500">{"\uD83D\uDD0A"}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2">
              <span className="text-sm text-zinc-500 animate-pulse">
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#1e1e2e]">
        <div className="flex gap-2">
          {voiceAvailable && useVoice && (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isRecording
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {isRecording ? "\uD83D\uDD34" : "\uD83C\uDFA4"}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder={
              useVoice
                ? "Type or hold mic to speak..."
                : "Ask the orchestrator..."
            }
            className="flex-1 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
