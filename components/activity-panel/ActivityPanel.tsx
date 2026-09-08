"use client";

import { useOfficeStore } from "@/lib/store";
import { AGENT_ROSTER } from "@/lib/agents/roster";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

function levelColor(level: string) {
  if (level === "success") return "var(--status-success)";
  if (level === "warning") return "var(--status-warning)";
  if (level === "error") return "var(--status-error)";
  return "var(--text-secondary)";
}

export function ActivityPanel() {
  const log = useOfficeStore((s) => s.activityLog);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface backdrop-blur-xl">
      <div className="border-b border-border px-4 py-3">
        <div className="font-display text-sm font-semibold text-text-primary">Activity</div>
        <div className="text-[11.5px] text-text-muted">Live feed from every department</div>
      </div>
      <div className="thin-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {log.length === 0 && (
          <div className="pt-6 text-center text-[12px] text-text-muted">
            Nothing yet — start a task to see the office come alive.
          </div>
        )}
        {log.map((entry) => {
          const agent = AGENT_ROSTER.find((a) => a.id === entry.agentId);
          return (
            <div key={entry.id} className="flex gap-2.5 text-[12.5px] leading-snug">
              <span className="shrink-0 font-mono text-[10.5px] text-text-muted">
                {formatTime(entry.timestamp)}
              </span>
              <div>
                <span
                  className="mr-1.5 font-medium"
                  style={{ color: agent ? agent.color : "var(--text-secondary)" }}
                >
                  {agent ? agent.name : entry.agentId === "user" ? "You" : "System"}
                </span>
                <span style={{ color: levelColor(entry.level) }}>{entry.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
