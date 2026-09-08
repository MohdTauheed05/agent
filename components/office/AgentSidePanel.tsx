"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, FileText, Image as ImageIcon, Video, Music, Tag } from "lucide-react";
import { useOfficeStore, selectActiveProject } from "@/lib/store";
import { getAgent } from "@/lib/agents/roster";
import { AgentAvatar } from "./AgentAvatar";
import { StatusPill } from "./StatusPill";

const OUTPUT_ICON: Record<string, typeof FileText> = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  metadata: Tag,
};

export function AgentSidePanel() {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const runtime = useOfficeStore((s) => (selectedAgentId ? s.agentRuntime[selectedAgentId] : null));
  const project = useOfficeStore(selectActiveProject);
  const log = useOfficeStore((s) => s.activityLog);

  const agent = selectedAgentId ? getAgent(selectedAgentId) : undefined;
  if (!agent || !runtime) return null;

  const currentTask = project?.subtasks.find((t) => t.id === runtime.currentSubtaskId);
  const historyTasks = runtime.taskHistory
    .map((id) => project?.subtasks.find((t) => t.id === id))
    .filter(Boolean);
  const outputs = project?.outputs.filter((o) => o.agentId === agent.id) ?? [];
  const agentLog = log.filter((l) => l.agentId === agent.id).slice(0, 25);

  return (
    <AnimatePresence>
      {selectedAgentId && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => selectAgent(null)}
          />
          <motion.aside
            className="thin-scroll fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-5 backdrop-blur-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
          >
            <button
              onClick={() => selectAgent(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <AgentAvatar name={agent.name} color={agent.color} status={runtime.status} size={52} />
              <div>
                <div className="font-display text-lg font-semibold text-text-primary">{agent.name}</div>
                <div className="text-[12.5px] text-text-secondary">{agent.role}</div>
              </div>
            </div>

            <div className="mt-3">
              <StatusPill status={runtime.status} pulse={runtime.status === "working"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {agent.capabilities.map((c) => (
                <span
                  key={c.key}
                  className="rounded-full border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: agent.color + "40", color: agent.color, backgroundColor: agent.color + "12" }}
                >
                  {c.label}
                </span>
              ))}
            </div>

            <Section title="Current task">
              {currentTask ? (
                <div>
                  <div className="text-[13px] text-text-primary">{currentTask.title}</div>
                  <div className="mt-1 text-[12px] text-text-secondary">{currentTask.description}</div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${currentTask.progress}%`, backgroundColor: agent.color }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[12.5px] text-text-muted">No active task — {agent.deskLabel.toLowerCase()}.</div>
              )}
            </Section>

            <Section title="Task history">
              {historyTasks.length ? (
                <ul className="space-y-1.5">
                  {historyTasks.map((t) => (
                    <li key={t!.id} className="flex items-center justify-between text-[12.5px]">
                      <span className="truncate text-text-secondary">{t!.title}</span>
                      <StatusPill status={t!.status} kind="task" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12.5px] text-text-muted">No completed tasks yet.</div>
              )}
            </Section>

            <Section title="Outputs">
              {outputs.length ? (
                <ul className="space-y-1.5">
                  {outputs.map((o) => {
                    const Icon = OUTPUT_ICON[o.kind] ?? FileText;
                    return (
                      <li key={o.id} className="flex items-center gap-2 text-[12.5px] text-text-secondary">
                        <Icon size={14} style={{ color: agent.color }} />
                        {o.title}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-[12.5px] text-text-muted">Nothing produced yet.</div>
              )}
            </Section>

            <Section title="Activity log">
              {agentLog.length ? (
                <ul className="space-y-2">
                  {agentLog.map((l) => (
                    <li key={l.id} className="text-[12px] text-text-secondary">
                      <span className="mr-2 font-mono text-[10.5px] text-text-muted">
                        {new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                      {l.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12.5px] text-text-muted">No activity recorded yet.</div>
              )}
            </Section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-2 text-[11px] font-medium text-text-muted">{title}</div>
      {children}
    </div>
  );
}
