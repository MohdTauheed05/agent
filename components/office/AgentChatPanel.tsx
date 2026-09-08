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
      const provider = resolveProvider();
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
              onClick={() => setVoiceReplies((v) => !v)}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover"
              title={voiceReplies ? "Mute voice replies" : "Enable voice replies"}
              aria-label={voiceReplies ? "Mute voice replies" : "Enable voice replies"}
            >
              {voiceReplies ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
          <button
            onClick={() => clearChat(agent.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-72 min-h-24 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="py-6 text-center text-[11px] text-text-muted">Ask {agent.name} anything.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-2.5 py-2 text-xs ${m.role === "user" ? "bg-accent text-white" : "bg-surface text-text"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs text-text-muted">
              <Loader2 size={13} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      {voiceError && <div className="px-3 pb-2 text-[10px] text-danger">{voiceError}</div>}

      <div className="flex items-center gap-1 border-t border-border p-2">
        {speechRecognitionSupported() && (
          <button
            onClick={toggleMic}
            className={`rounded-md p-2 ${listening ? "bg-danger text-white" : "text-text-muted hover:bg-surface-hover"}`}
            title={listening ? "Stop listening" : "Use microphone"}
            aria-label={listening ? "Stop listening" : "Use microphone"}
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(draft);
          }}
          placeholder={`Message ${agent.name}...`}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-accent"
          disabled={busy}
        />
        <button
          onClick={() => sendMessage(draft)}
          disabled={busy || !draft.trim()}
          className="rounded-md bg-accent p-2 text-white disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
