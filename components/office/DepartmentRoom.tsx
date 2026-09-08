"use client";

import { AgentDefinition, Project } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { StatusPill } from "./StatusPill";
import { useOfficeStore } from "@/lib/store";

export function DepartmentRoom({
  agent,
  project,
  size = "normal",
}: {
  agent: AgentDefinition;
  project: Project | null;
  size?: "normal" | "large";
}) {
  const runtime = useOfficeStore((s) => s.agentRuntime[agent.id]);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const currentTask = project?.subtasks.find((t) => t.id === runtime.currentSubtaskId);
  const isActive = runtime.status !== "idle";

  return (
    <button
      onClick={() => selectAgent(agent.id)}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border p-3.5 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5"
      style={{
        borderColor: isActive ? agent.color + "55" : "var(--border)",
        backgroundColor: "var(--surface)",
        boxShadow: isActive
          ? `0 0 0 1px ${agent.color}22, 0 14px 34px -16px ${agent.color}66`
          : "0 14px 34px -22px rgba(0,0,0,0.7)",
      }}
      data-room={agent.id}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          backgroundColor: agent.color,
          opacity: runtime.status === "idle" ? 0.2 : 1,
          boxShadow: runtime.status === "idle" ? "none" : `0 0 8px ${agent.color}`,
        }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <AgentAvatar name={agent.name} color={agent.color} status={runtime.status} size={size === "large" ? 52 : 42} />
          <div>
            <div className="font-display text-sm font-semibold leading-tight text-text-primary">
              {agent.name}
            </div>
            <div className="text-[11.5px] leading-tight text-text-secondary">{agent.role}</div>
          </div>
        </div>
        <StatusPill status={runtime.status} pulse={runtime.status === "working"} />
      </div>

      <div
        className="mt-3 min-h-[38px] rounded-lg border px-2.5 py-1.5"
        style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.28)" }}
      >
        {currentTask ? (
          <div>
            <div className="truncate text-[12px] text-text-primary">{currentTask.title}</div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${currentTask.progress}%`, backgroundColor: agent.color, boxShadow: `0 0 6px ${agent.color}` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-text-muted">{agent.deskLabel}</div>
        )}
      </div>
    </button>
  );
}
