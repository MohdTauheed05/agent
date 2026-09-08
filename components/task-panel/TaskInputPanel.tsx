"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { AgentId, Priority } from "@/types";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { useOfficeStore, selectActiveProject } from "@/lib/store";
import { runProject } from "@/lib/orchestrator/orchestrator";

const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
const SPECIALISTS = AGENT_ROSTER.filter((a) => a.id !== "orion");

export function TaskInputPanel() {
  const [brief, setBrief] = useState(
    "Create a complete children's story video about a brave little rabbit who is afraid of the dark."
  );
  const [priority, setPriority] = useState<Priority>("normal");
  const [agentMode, setAgentMode] = useState<"automatic" | "manual">("automatic");
  const [manualAgents, setManualAgents] = useState<AgentId[]>(SPECIALISTS.map((a) => a.id));
  const [isRunning, setIsRunning] = useState(false);

  const createProject = useOfficeStore((s) => s.createProject);
  const activeProject = useOfficeStore(selectActiveProject);
  const busy = Boolean(
    isRunning || (activeProject && !["completed", "failed", "cancelled"].includes(activeProject.status))
  );

  async function handleStart() {
    if (!brief.trim() || busy) return;
    setIsRunning(true);
    const id = createProject(brief.trim(), priority, agentMode, agentMode === "manual" ? manualAgents : undefined);
    try {
      await runProject(id, brief.trim(), priority);
    } finally {
      setIsRunning(false);
    }
  }

  function toggleManualAgent(id: AgentId) {
    setManualAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-display font-semibold text-text-primary">
        <Sparkles size={16} style={{ color: "var(--status-active)" }} />
        Give the office a task
      </div>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        placeholder="Describe what you want the AI team to produce…"
        className="mt-3 w-full resize-none rounded-lg border border-border bg-surface-raised px-3 py-2 backdrop-blur-xl text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
        disabled={busy}
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-secondary">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            disabled={busy}
            className="rounded-md border border-border bg-surface-raised px-2 py-1 text-[12px] text-text-primary focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-secondary">Agents</span>
          <div className="flex overflow-hidden rounded-md border border-border text-[12px]">
            {(["automatic", "manual"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAgentMode(mode)}
                disabled={busy}
                className="px-2.5 py-1 transition-colors"
                style={{
                  backgroundColor: agentMode === mode ? "var(--surface-hover)" : "transparent",
                  color: agentMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {mode === "automatic" ? "Automatic" : "Choose"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={busy || !brief.trim()}
          className="ml-auto flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--status-active)", color: "#0a0d12" }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? "Team is working…" : "Start AI team"}
        </button>
      </div>

      {agentMode === "manual" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SPECIALISTS.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleManualAgent(a.id)}
              disabled={busy}
              className="rounded-full border px-2.5 py-1 text-[11.5px] transition-colors"
              style={{
                borderColor: manualAgents.includes(a.id) ? a.color + "80" : "var(--border)",
                backgroundColor: manualAgents.includes(a.id) ? a.color + "1a" : "transparent",
                color: manualAgents.includes(a.id) ? a.color : "var(--text-muted)",
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
