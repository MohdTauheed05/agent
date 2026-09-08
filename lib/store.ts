import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  AgentId,
  AgentOutput,
  AgentRuntimeState,
  AgentStatus,
  ActivityLogEntry,
  ChatMessage,
  Priority,
  Project,
  SubTask,
} from "@/types";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { saveProjectAsync } from "@/lib/firebase/sync";

interface OfficeState {
  projects: Project[];
  activeProjectId: string | null;
  agentRuntime: Record<AgentId, AgentRuntimeState>;
  activityLog: ActivityLogEntry[];
  selectedAgentId: AgentId | null;
  demoMode: boolean;
  // Direct chat with a single agent (separate from the task pipeline
  // above) — one thread per agent, plus whether that agent is currently
  // "on the phone" (typing/replying), which Office3D uses to give the
  // robot a talking gesture while it's chatting with the user.
  chatMessages: Record<AgentId, ChatMessage[]>;
  chatBusy: Record<AgentId, boolean>;

  setDemoMode: (on: boolean) => void;
  createProject: (brief: string, priority: Priority, agentMode: "automatic" | "manual", selectedAgents?: AgentId[]) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  patchSubtask: (projectId: string, subtaskId: string, patch: Partial<SubTask>) => void;
  addOutputs: (projectId: string, outputs: AgentOutput[]) => void;
  setAgentStatus: (id: AgentId, status: AgentStatus, subtaskId?: string | null) => void;
  log: (agentId: AgentId | "system" | "user", message: string, level: ActivityLogEntry["level"]) => void;
  selectAgent: (id: AgentId | null) => void;
  addChatMessage: (agentId: AgentId, message: ChatMessage) => void;
  setChatBusy: (agentId: AgentId, busy: boolean) => void;
  clearChat: (agentId: AgentId) => void;
  // One-time merge of projects fetched from Firestore on load. Only applies
  // if the local store is still empty, so it never clobbers a project
  // that's already running in this tab (see lib/firebase/sync.ts).
  hydrateProjects: (projects: Project[]) => void;
}

const initialAgentRuntime = (): Record<AgentId, AgentRuntimeState> =>
  Object.fromEntries(
    AGENT_ROSTER.map((a) => [
      a.id,
      { id: a.id, status: "idle" as AgentStatus, currentSubtaskId: null, taskHistory: [] },
    ])
  ) as unknown as Record<AgentId, AgentRuntimeState>;

const initialChatMessages = (): Record<AgentId, ChatMessage[]> =>
  Object.fromEntries(AGENT_ROSTER.map((a) => [a.id, []])) as unknown as Record<AgentId, ChatMessage[]>;

const initialChatBusy = (): Record<AgentId, boolean> =>
  Object.fromEntries(AGENT_ROSTER.map((a) => [a.id, false])) as unknown as Record<AgentId, boolean>;

export const useOfficeStore = create<OfficeState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  agentRuntime: initialAgentRuntime(),
  activityLog: [],
  selectedAgentId: null,
  // Starts real/demo based on your env var so a fresh deploy actually
  // respects NEXT_PUBLIC_DEMO_MODE instead of always booting into demo
  // until someone manually flips the TopNav toggle. Mirrors
  // resolveProvider()'s own rule exactly: only the literal string
  // "false" turns demo mode off; unset (or anything else) defaults to
  // demo, same as the rest of the app.
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  chatMessages: initialChatMessages(),
  chatBusy: initialChatBusy(),

  setDemoMode: (on) => set({ demoMode: on }),

  createProject: (brief, priority, agentMode, selectedAgents) => {
    const id = uuid();
    const project: Project = {
      id,
      title: brief.length > 60 ? brief.slice(0, 57) + "…" : brief,
      brief,
      priority,
      agentMode,
      selectedAgents,
      status: "queued",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: [],
      outputs: [],
    };
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: id,
    }));
    saveProjectAsync(project);
    return id;
  },

  updateProject: (id, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === id);
    if (updated) saveProjectAsync(updated);
  },

  patchSubtask: (projectId, subtaskId, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              subtasks: p.subtasks.map((s) => (s.id === subtaskId ? { ...s, ...patch } : s)),
              updatedAt: Date.now(),
            }
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) saveProjectAsync(updated);
  },

  addOutputs: (projectId, outputs) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, outputs: [...p.outputs, ...outputs] } : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) saveProjectAsync(updated);
  },

  setAgentStatus: (id, status, subtaskId) =>
    set((state) => {
      const prev = state.agentRuntime[id];
      const history =
        status === "completed" && prev.currentSubtaskId
          ? [prev.currentSubtaskId, ...prev.taskHistory].slice(0, 10)
          : prev.taskHistory;
      return {
        agentRuntime: {
          ...state.agentRuntime,
          [id]: {
            ...prev,
            status,
            currentSubtaskId: subtaskId === undefined ? prev.currentSubtaskId : subtaskId,
            taskHistory: history,
          },
        },
      };
    }),

  log: (agentId, message, level) =>
    set((state) => ({
      activityLog: [
        { id: uuid(), timestamp: Date.now(), agentId, message, level },
        ...state.activityLog,
      ].slice(0, 200),
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),

  addChatMessage: (agentId, message) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [agentId]: [...(state.chatMessages[agentId] ?? []), message].slice(-100),
      },
    })),

  setChatBusy: (agentId, busy) =>
    set((state) => ({ chatBusy: { ...state.chatBusy, [agentId]: busy } })),

  clearChat: (agentId) =>
    set((state) => ({ chatMessages: { ...state.chatMessages, [agentId]: [] } })),

  hydrateProjects: (projects) =>
    set((state) =>
      state.projects.length === 0 && projects.length > 0
        ? { projects, activeProjectId: projects[0].id }
        : {}
    ),
}));

export const selectActiveProject = (state: OfficeState) =>
  state.projects.find((p) => p.id === state.activeProjectId) ?? null;
