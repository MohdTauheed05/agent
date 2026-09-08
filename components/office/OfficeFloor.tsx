"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { useOfficeStore } from "@/lib/store";
import { selectActiveProject } from "@/lib/store";
import { DepartmentRoom } from "./DepartmentRoom";

interface Line {
  agentId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const SPECIALISTS = AGENT_ROSTER.filter((a) => a.id !== "orion");
const manager = AGENT_ROSTER.find((a) => a.id === "orion")!;

export function OfficeFloor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const project = useOfficeStore(selectActiveProject);
  const agentRuntime = useOfficeStore((s) => s.agentRuntime);

  const activeAgentId = SPECIALISTS.map((a) => a.id).find((id) => {
    const st = agentRuntime[id].status;
    return st === "working" || st === "thinking" || st === "receiving_task";
  });

  useEffect(() => {
    function recompute() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const managerEl = container.querySelector<HTMLElement>('[data-room="orion"]');
      if (!managerEl) return;
      const mRect = managerEl.getBoundingClientRect();
      const mx = mRect.left + mRect.width / 2 - cRect.left;
      const my = mRect.bottom - cRect.top;

      const nextLines: Line[] = SPECIALISTS.map((agent) => {
        const el = container.querySelector<HTMLElement>(`[data-room="${agent.id}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          agentId: agent.id,
          x1: mx,
          y1: my,
          x2: r.left + r.width / 2 - cRect.left,
          y2: r.top - cRect.top,
          color: agent.color,
        };
      }).filter(Boolean) as Line[];

      setLines(nextLines);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    // Rooms grow slightly when a progress bar appears, which shifts
    // downstream room positions — a light interval keeps the connector
    // lines glued to the cards without wiring a resize callback through
    // every room.
    const interval = window.setInterval(recompute, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.clearInterval(interval);
    };
  }, [project?.subtasks.length]);

  const activeLine = lines.find((l) => l.agentId === activeAgentId);

  return (
    <div ref={containerRef} className="relative">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {lines.map((l) => (
          <line
            key={l.agentId}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="var(--border-strong)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        ))}
        <AnimatePresence>
          {activeLine && (
            <motion.line
              key={activeLine.agentId + "-active"}
              x1={activeLine.x1}
              y1={activeLine.y1}
              x2={activeLine.x2}
              y2={activeLine.y2}
              stroke={activeLine.color}
              strokeWidth={1.5}
              filter="url(#line-glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
            />
          )}
          {activeLine && (
            <motion.circle
              key={activeLine.agentId + "-token"}
              r={4}
              fill={activeLine.color}
              filter="url(#line-glow)"
              initial={{ cx: activeLine.x1, cy: activeLine.y1, opacity: 0 }}
              animate={{
                cx: [activeLine.x1, activeLine.x2],
                cy: [activeLine.y1, activeLine.y2],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </svg>

      <div className="relative z-10 mx-auto max-w-2xl">
        <DepartmentRoom agent={manager} project={project} size="large" />
      </div>

      <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        {SPECIALISTS.map((agent) => (
          <DepartmentRoom key={agent.id} agent={agent} project={project} />
        ))}
      </div>
    </div>
  );
}
