// Core domain types shared across the whole app (UI, orchestrator, agents, and
// the eventual Firestore layer). Keeping these in one place means the office
// UI, the demo-mode simulator, and a future real backend all agree on shape.

export type AgentId =
  | "orion"
  | "luna"
  | "pixel"
  | "motion"
  | "echo"
  | "frame"
  | "nova";

export type AgentStatus =
  | "idle"
  | "receiving_task"
  | "thinking"
  | "working"
  | "waiting"
  | "reviewing"
  | "completed"
  | "error";

export type TaskStatus =
  | "queued"
  | "analyzing"
  | "planning"
  | "assigned"
  | "in_progress"
  | "waiting"
  | "reviewing"
  | "completed"
  | "failed"
  | "cancelled";

export type Priority = "low" | "normal" | "high" | "urgent";

export type Department =
  | "management"
  | "story"
  | "image"
  | "video"
  | "audio"
  | "editing"
  | "publishing";

export interface AgentCapability {
  key: string;
  label: string;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  department: Department;
  color: string; // accent hex used for this department's badge, avatar ring, connector
  capabilities: AgentCapability[];
  deskLabel: string; // short description of the workstation, shown in the room
}

export interface AgentOutput {
  id: string;
  agentId: AgentId;
  taskId: string;
  kind: "document" | "image" | "video" | "audio" | "metadata";
  title: string;
  // Demo mode stores generated text/mock content directly; a real provider
  // would put a storage URL here instead.
  content: string;
  createdAt: number;
}

export interface SubTask {
  id: string;
  projectId: string;
  agentId: AgentId;
  title: string;
  description: string;
  dependsOn: string[]; // subtask ids that must complete first
  status: TaskStatus;
  progress: number; // 0-100
  error?: string;
  retries: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  agentId: AgentId | "system" | "user";
  message: string;
  level: "info" | "success" | "warning" | "error";
}

export interface Project {
  id: string;
  title: string;
  brief: string;
  priority: Priority;
  agentMode: "automatic" | "manual";
  selectedAgents?: AgentId[];
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  subtasks: SubTask[];
  outputs: AgentOutput[];
}

export interface AgentRuntimeState {
  id: AgentId;
  status: AgentStatus;
  currentSubtaskId: string | null;
  taskHistory: string[]; // subtask ids, most recent first
}
