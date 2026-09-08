"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AgentId, AgentStatus } from "@/types";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { useOfficeStore, selectActiveProject } from "@/lib/store";
import { STATUS_HEX } from "@/lib/theme";
import { AgentFigure } from "./AgentFigure";

// ---- Isometric projection helpers -----------------------------------------
// Classic 2:1 isometric grid: a (col, row) tile maps to a screen point.
// Everything below (desks, figures, floor lines) is placed with this same
// function so the whole scene stays perspective-consistent.
const TILE_W = 108;
const TILE_H = 56;
const STAGE_COLS = 8;
const STAGE_ROWS = 6;
const OFFSET_X = STAGE_ROWS * (TILE_W / 2);
const PAD_Y = 30;

function isoPos(col: number, row: number) {
  return {
    x: (col - row) * (TILE_W / 2) + OFFSET_X,
    y: (col + row) * (TILE_H / 2) + PAD_Y,
  };
}

const STAGE_W = (STAGE_COLS + STAGE_ROWS) * (TILE_W / 2);
const STAGE_H = (STAGE_COLS + STAGE_ROWS) * (TILE_H / 2) + PAD_Y * 2;

// Home desk for every agent, in grid units.
const DESK: Record<AgentId, { col: number; row: number }> = {
  orion: { col: 4, row: 0.4 },
  luna: { col: 1, row: 1.4 },
  pixel: { col: 6.6, row: 1.4 },
  motion: { col: 0.4, row: 3.4 },
  echo: { col: 3.6, row: 3.6 },
  frame: { col: 6.8, row: 3.4 },
  nova: { col: 3.6, row: 5.2 },
};

const SPECIALISTS = AGENT_ROSTER.filter((a) => a.id !== "orion");

// The little huddle spot in front of Orion's desk where a specialist walks
// to when they're being briefed or reviewed.
function meetingSpot(index: number) {
  const spread = (index - (SPECIALISTS.length - 1) / 2) * 0.85;
  return { col: DESK.orion.col + spread, row: DESK.orion.row + 1.55 };
}

function isBriefing(status: AgentStatus) {
  return status === "receiving_task" || status === "reviewing";
}

function dotColorFor(status: AgentStatus, color: string) {
  if (status === "idle") return STATUS_HEX.idle;
  if (status === "error") return STATUS_HEX.error;
  if (status === "completed") return STATUS_HEX.success;
  return color;
}

export function IsoOffice() {
  const project = useOfficeStore(selectActiveProject);
  const agentRuntime = useOfficeStore((s) => s.agentRuntime);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  const idleCount = AGENT_ROSTER.filter((a) => agentRuntime[a.id].status === "idle").length;
  const activeCount = AGENT_ROSTER.filter((a) =>
    ["thinking", "working", "receiving_task", "reviewing"].includes(agentRuntime[a.id].status)
  ).length;
  const errorCount = AGENT_ROSTER.filter((a) => agentRuntime[a.id].status === "error").length;

  // Floor grid lines, drawn with the same projection so they line up with
  // every desk and figure exactly.
  const colLines = Array.from({ length: STAGE_COLS + 1 }, (_, c) => ({
    a: isoPos(c, 0),
    b: isoPos(c, STAGE_ROWS),
  }));
  const rowLines = Array.from({ length: STAGE_ROWS + 1 }, (_, r) => ({
    a: isoPos(0, r),
    b: isoPos(STAGE_COLS, r),
  }));
  const floorPolygon = [isoPos(0, 0), isoPos(STAGE_COLS, 0), isoPos(STAGE_COLS, STAGE_ROWS), isoPos(0, STAGE_ROWS)]
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const tableCenter = isoPos(DESK.orion.col, DESK.orion.row + 1.55);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border backdrop-blur-xl"
      style={{ borderColor: "var(--border)", backgroundColor: "rgba(6,9,15,0.55)" }}
    >
      {/* header bar, styled like a floor-plan title strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="font-display text-[12px] font-semibold tracking-[0.18em] text-text-secondary">
          AI OFFICE · FLOOR PLAN
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {AGENT_ROSTER.map((a) => {
            const st = agentRuntime[a.id].status;
            const dotColor = dotColorFor(st, a.color);
            return (
              <button
                key={a.id}
                onClick={() => selectAgent(a.id)}
                className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] text-text-secondary transition-colors hover:border-border-strong"
                style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${st !== "idle" && st !== "completed" ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: dotColor }}
                />
                {a.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* the floor itself */}
      <div className="thin-scroll overflow-x-auto px-2 py-4">
        <div className="relative mx-auto" style={{ width: STAGE_W, height: STAGE_H, minWidth: STAGE_W }}>
          <svg className="absolute inset-0" width={STAGE_W} height={STAGE_H}>
            <polygon points={floorPolygon} fill="rgba(79,216,255,0.035)" stroke="var(--border)" strokeWidth={1} />
            {colLines.map((l, i) => (
              <line key={`c${i}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
            {rowLines.map((l, i) => (
              <line key={`r${i}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
            {/* meeting table, drawn under Orion's desk */}
            <ellipse
              cx={tableCenter.x}
              cy={tableCenter.y}
              rx={TILE_W * 1.55}
              ry={TILE_H * 0.85}
              fill="rgba(139,127,214,0.10)"
              stroke="rgba(139,127,214,0.35)"
              strokeWidth={1.5}
            />
          </svg>

          {/* static desks (floor decals) */}
          {AGENT_ROSTER.map((a) => {
            const p = isoPos(DESK[a.id].col, DESK[a.id].row);
            return (
              <div
                key={`desk-${a.id}`}
                className="absolute rounded-md border"
                style={{
                  left: p.x - 26,
                  top: p.y - 6,
                  width: 52,
                  height: 26,
                  borderColor: a.color + "40",
                  backgroundColor: a.color + "14",
                  boxShadow: `0 8px 16px -8px ${a.color}55`,
                  zIndex: 1,
                }}
              />
            );
          })}

          {/* Orion — stays put at the manager desk, but still gets the same
              full-body figure (seated while planning, briefing pose while
              reviewing) for visual consistency with the specialists. */}
          <OfficeCharacter
            agentId="orion"
            name="Orion"
            color={AGENT_ROSTER[0].color}
            status={agentRuntime.orion.status}
            target={DESK.orion}
            onClick={() => selectAgent("orion")}
          />

          {/* specialists — walk to Orion's table when briefed/reviewed, home desk otherwise */}
          {SPECIALISTS.map((agent, i) => {
            const runtime = agentRuntime[agent.id];
            const engaged = isBriefing(runtime.status);
            const target = engaged ? meetingSpot(i) : DESK[agent.id];
            return (
              <OfficeCharacter
                key={agent.id}
                agentId={agent.id}
                name={agent.name}
                color={agent.color}
                status={runtime.status}
                target={target}
                onClick={() => selectAgent(agent.id)}
              />
            );
          })}
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-2 text-[10.5px] text-text-muted"
        style={{ borderColor: "var(--border)" }}
      >
        <span>{project ? project.title : "No active brief"}</span>
        <span className="flex items-center gap-3">
          <span>{idleCount} idle</span>
          <span style={{ color: "var(--status-active)" }}>{activeCount} active</span>
          <span style={{ color: errorCount ? "var(--status-error)" : undefined }}>{errorCount} error</span>
        </span>
      </div>
    </div>
  );
}

// A walking, sitting, briefing robot pinned to a grid target. This owns the
// only piece of state IsoOffice's figures need: whether the agent is
// currently mid-walk (so AgentFigure should run its gait cycle) and which
// way it's facing, both derived purely from how `target` changes over time.
function OfficeCharacter({
  agentId,
  name,
  color,
  status,
  target,
  onClick,
}: {
  agentId: AgentId;
  name: string;
  color: string;
  status: AgentStatus;
  target: { col: number; row: number };
  onClick: () => void;
}) {
  const p = isoPos(target.col, target.row);
  const prevTarget = useRef(target);
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  useEffect(() => {
    const prev = prevTarget.current;
    if (prev.col !== target.col || prev.row !== target.row) {
      setWalking(true);
      // Screen-space x only depends on (col - row) in this projection;
      // compare that combined value to know which way the figure moved.
      const dx = target.col - target.row - (prev.col - prev.row);
      if (dx !== 0) setFacingLeft(dx < 0);
      prevTarget.current = target;
    }
  }, [target.col, target.row]);

  const zIndex = Math.round((target.col + target.row) * 10) + 10;
  const dotColor = dotColorFor(status, color);

  return (
    <motion.div
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
      initial={false}
      animate={{ left: p.x, top: p.y }}
      transition={{ type: "spring", stiffness: 70, damping: 15, mass: 0.8 }}
      onAnimationComplete={() => setWalking(false)}
      style={{ zIndex }}
    >
      <button onClick={onClick} data-agent-id={agentId} className="group flex flex-col items-center gap-1">
        <AgentFigure name={name} color={color} status={status} walking={walking} facingLeft={facingLeft} size={68} />
        <span
          className="flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[9.5px] font-medium text-text-primary backdrop-blur-sm transition-colors group-hover:border-border-strong"
          style={{ borderColor: "var(--border)", backgroundColor: "rgba(6,9,15,0.75)" }}
        >
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: dotColor }} />
          {name}
        </span>
      </button>
    </motion.div>
  );
}
