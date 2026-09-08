"use client";

import { Activity, CheckCircle2, Clock, Radio } from "lucide-react";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { useOfficeStore, selectActiveProject } from "@/lib/store";
import { STATUS_HEX } from "@/lib/theme";
import { AgentAvatar } from "@/components/office/AgentAvatar";

function GaugeRing({ percent, color, size = 96 }: { percent: number; color: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease", filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] text-text-muted">
        <Icon size={12} style={{ color }} />
        {label}
      </div>
      <div className="mt-1 truncate font-display text-[15px] font-semibold capitalize text-text-primary">{value}</div>
    </div>
  );
}

export function HoloScreen() {
  const project = useOfficeStore(selectActiveProject);
  const agentRuntime = useOfficeStore((s) => s.agentRuntime);

  const subtasks = project?.subtasks ?? [];
  const total = subtasks.length;
  const completed = subtasks.filter((t) => t.status === "completed").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const activeAgents = AGENT_ROSTER.filter((a) => {
    const st = agentRuntime[a.id].status;
    return st !== "idle" && st !== "completed";
  }).length;

  const elapsedMs = project ? Date.now() - project.createdAt : 0;
  const elapsedLabel = project
    ? `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`
    : "—";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
      style={{ borderColor: "var(--border)", backgroundColor: "rgba(8,12,20,0.55)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,216,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(79,216,255,0.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={16} style={{ color: "var(--status-active)" }} />
          <span className="font-display text-[13px] font-semibold tracking-wide text-text-primary">
            KI-AgentS · Live Ops
          </span>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
          style={{
            borderColor: STATUS_HEX.active + "55",
            color: "var(--status-active)",
            backgroundColor: STATUS_HEX.active + "14",
          }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: "var(--status-active)" }} />
          {project ? "Running" : "Standby"}
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <GaugeRing percent={percent} color="var(--status-active)" />
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-xl font-semibold text-text-primary">{percent}%</span>
              <span className="text-[10px] text-text-muted">Goal Progress</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile icon={Activity} label="Active Agents" value={String(activeAgents)} color="var(--status-active)" />
          <MetricTile icon={CheckCircle2} label="Tasks Done" value={`${completed}/${total || 0}`} color="var(--status-success)" />
          <MetricTile icon={Clock} label="Elapsed" value={elapsedLabel} color="var(--status-warning)" />
          <MetricTile icon={Radio} label="Priority" value={project ? project.priority : "—"} color="var(--status-idle)" />
        </div>
      </div>

      <div
        className="relative mt-5 flex flex-wrap items-center gap-3 border-t pt-4"
        style={{ borderColor: "var(--border)" }}
      >
        {AGENT_ROSTER.map((a) => (
          <div key={a.id} className="flex items-center gap-1.5">
            <AgentAvatar name={a.name} color={a.color} status={agentRuntime[a.id].status} size={26} />
            <span className="text-[11px] text-text-secondary">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
