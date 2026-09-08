"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";
import { AgentDefinition, ChatMessage } from "@/types";
import { useOfficeStore } from "@/lib/store";
import { resolveProvider } from "@/lib/ai/provider";
import {
  listenOnce,
  speak,
  stopSpeaking,
  speechRecognitionSupported,
  speechSynthesisSupported,
  primeVoices,
  type ListenHandle,
} from "@/lib/voice";

// Builds the persona system prompt from the agent's own roster entry, so a
// chat reply always sounds like *this* agent (same role/specialty shown
// everywhere else in the office) without a second, hand-maintained copy of
// each personality.
function personaPrompt(agent: AgentDefinition): string {
  const skills = agent.capabilities.map((c) => c.label).join(", ");
  return (
    `You are ${agent.name}, the ${agent.role} at a small animated-content studio staffed by an AI team. ` +
    `Your desk: ${agent.deskLabel}. You specialize in: ${skills}. ` +
    `You're chatting directly with the studio's human lead, who just walked up to your desk. ` +
    `Stay in character as ${agent.name}, be warm and concise (usually 1-4 sentences unless asked for more), ` +
    `and talk like a real teammate, not a generic assistant.`
  );
}

function buildPrompt(history: ChatMessage[], agentName: string, latestUserText: string): string {
  const recent = history.slice(-8);
  const transcript = recent.map((m) => `${m.role === "user" ? "User" : agentName}: ${m.text}`).join("\n");
  return transcript ? `${transcript}\nUser: ${latestUserText}\n${agentName}:` : `User: ${latestUserText}\n${agentName}:`;
}

export function AgentChatPanel({ agent }: { agent: AgentDefinition }) {
  const messages = useOfficeStore((s) => s.chatMessages[agent.id] ?? []);
  const busy = useOfficeStore((s) => s.chatBusy[agent.id] ?? false);
  const demoMode = useOfficeStore((s) => s.demoMode);
  const addChatMessage = useOfficeStore((s) => s.addChatMessage);
  const setChatBusy = useOfficeStore((s) => s.setChatBusy);
  const clearChat = useOfficeStore((s) => s.clearChat);

  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const listenHandle = useRef<ListenHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    primeVoices();
    return () => {
      listenHandle.current?.stop();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setVoiceError(null);
    setDraft("");
    addChatMessage(agent.id, { id: uuid(), role: "user", text: trimmed, timestamp: Date.now() });
    setChatBusy(agent.id, true);
    try {
      const provider = resolveProvider(demoMode);
      const reply = await provider.generateText({
        system: personaPrompt(agent),
        prompt: buildPrompt(messages, agent.name, trimmed),
        maxTokens: 300,
      });
      const replyText = reply.trim() || "…";
      addChatMessage(agent.id, { id: uuid(), role: "agent", text: replyText, timestamp: Date.now() });
      if (voiceReplies) speak(replyText, agent.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong reaching this agent.";
      addChatMessage(agent.id, { id: uuid(), role: "agent", text: `⚠️ ${message}`, timestamp: Date.now() });
    } finally {
      setChatBusy(agent.id, false);
    }
  }

  function toggleMic() {
    if (listening) {
      listenHandle.current?.stop();
      setListening(false);
      return;
    }
    setVoiceError(null);
    const handle = listenOnce(
      (transcript) => {
        setDraft(transcript);
        sendMessage(transcript);
      },
      () => setListening(false),
      (message) => setVoiceError(message)
    );
    if (handle) {
      listenHandle.current = handle;
      setListening(true);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-[11px] font-medium text-text-muted">Talk to {agent.name}</div>
        <div className="flex items-center gap-1">
          {speechSynthesisSupported() && (
            <button
              onClick={() => {
                if (voiceReplies) stopSpeaking();
                setVoiceReplies((v) => !v);
              }}
              title={voiceReplies ? "Voice replies on" : "Voice replies off"}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              {voiceReplies ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => clearChat(agent.id)}
              title="Clear conversation"
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="thin-scroll max-h-64 min-h-[88px] space-y-2 overflow-y-auto px-3 py-2.5">
        {messages.length === 0 && !busy && (
          <div className="text-[12px] text-text-muted">
            Say hi to {agent.name} — type, or tap the mic and talk.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[12.5px] leading-snug"
              style={
                m.role === "user"
                  ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                  : { backgroundColor: agent.color + "1a", color: "var(--text-primary)", border: `1px solid ${agent.color}33` }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
            <Loader2 size={12} className="animate-spin" />
            {agent.name} is typing…
          </div>
        )}
      </div>

      {voiceError && (
        <div className="px-3 pb-1 text-[11px]" style={{ color: "var(--status-error)" }}>
          {voiceError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(draft);
        }}
        className="flex items-center gap-1.5 border-t border-border p-2"
      >
        {speechRecognitionSupported() && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            title={listening ? "Stop listening" : "Talk"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50"
            style={{
              backgroundColor: listening ? "var(--status-error)" : "var(--surface-hover)",
              color: listening ? "#0a0d12" : "var(--text-secondary)",
            }}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={listening ? "Listening…" : `Message ${agent.name}…`}
          disabled={busy}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "var(--status-active)", color: "#0a0d12" }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
