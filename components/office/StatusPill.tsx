import { AgentStatus, TaskStatus } from "@/types";
import { STATUS_HEX } from "@/lib/theme";

const AGENT_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  receiving_task: "Receiving task",
  thinking: "Thinking",
  working: "Working",
  waiting: "Waiting",
  reviewing: "Reviewing",
  completed: "Completed",
  error: "Error",
};

const TASK_LABELS: Record<TaskStatus, string> = {
  queued: "Queued",
  analyzing: "Analyzing",
  planning: "Planning",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting: "Waiting",
  reviewing: "Reviewing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function toneFor(status: AgentStatus | TaskStatus): string {
  if (status === "completed") return STATUS_HEX.success;
  if (status === "error" || status === "failed") return STATUS_HEX.error;
  if (status === "idle" || status === "queued" || status === "cancelled") return STATUS_HEX.idle;
  if (status === "waiting") return STATUS_HEX.warning;
  return STATUS_HEX.active;
}

export function StatusPill({
  status,
  kind = "agent",
  pulse = false,
}: {
  status: AgentStatus | TaskStatus;
  kind?: "agent" | "task";
  pulse?: boolean;
}) {
  const label =
    kind === "agent" ? AGENT_LABELS[status as AgentStatus] : TASK_LABELS[status as TaskStatus];
  const color = toneFor(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-normal"
      style={{ borderColor: color + "55", color, backgroundColor: color + "14" }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
