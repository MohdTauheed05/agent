"use client";

import { motion } from "framer-motion";
import { AgentStatus } from "@/types";

// A full-body version of the office robot, used on the isometric floor where
// agents need to visibly walk between their desk and Orion's meeting table.
// AgentAvatar (the head-only badge) is still used everywhere else — panels,
// lists, the activity feed — where a walking figure doesn't make sense.
//
// Poses, driven entirely by `status` + `walking`:
//   walking          legs/arms swing in a real gait cycle, feet leave little
//                     dust puffs, whole body bobs on every step
//   idle / waiting    standing still, gentle breathing bob
//   thinking          standing at the desk, a small "…" bubble ticks above
//                     the head
//   working           seated at the desk — knees bent, forearms resting on a
//                     glowing monitor, hands tapping
//   receiving_task /
//   reviewing         (once arrived, i.e. not walking) standing at the
//                     meeting table, one arm raised, a speech bubble above
//                     the head — "being briefed"
//   completed/error   idle stance + status badge, like AgentAvatar

interface AgentFigureProps {
  name: string;
  color: string;
  status: AgentStatus;
  walking?: boolean;
  facingLeft?: boolean;
  size?: number; // total rendered height in px; width follows the figure's aspect ratio
}

const VIEW_W = 44;
const VIEW_H = 88;


export function AgentFigure({
  name,
  color,
  status,
  walking = false,
  facingLeft = false,
  size = 64,
}: AgentFigureProps) {
  const width = size * (VIEW_W / VIEW_H);
  const error = status === "error";
  const completed = status === "completed";
  const active =
    status === "working" || status === "thinking" || status === "receiving_task" || status === "reviewing";
  const seated = !walking && status === "working";
  const thinking = !walking && status === "thinking";
  const briefing = !walking && (status === "receiving_task" || status === "reviewing");
  const eyeColor = error ? "#ff6b81" : color;
  const gradId = `figure-${name.toLowerCase()}-${size}`;

  return (
    <div className="relative" style={{ width, height: size }} title={name}>
      <div style={{ transform: facingLeft ? "scaleX(-1)" : undefined, width, height: size }}>
        <svg viewBox={`0 -6 ${VIEW_W} ${VIEW_H + 6}`} width={width} height={size} className="block overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f4f7fb" />
              <stop offset="100%" stopColor="#c7d1e0" />
            </linearGradient>
          </defs>

          {/* active halo, behind everything */}
          {active && (
            <motion.ellipse
              cx={22}
              cy={49}
              rx={19}
              ry={22}
              fill={color}
              opacity={0.16}
              animate={{ scale: [1, 1.12, 1], opacity: [0.16, 0.02, 0.16] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "22px 49px" }}
            />
          )}

          {/* ground shadow */}
          <ellipse cx={22} cy={walking ? 85.5 : 85} rx={walking ? 12 : 14} ry={3.2} fill="rgba(0,0,0,0.4)" />

          {/* footstep dust, only while walking */}
          {walking && (
            <>
              <motion.circle
                cx={15}
                cy={84}
                r={1.6}
                fill="rgba(255,255,255,0.35)"
                animate={{ opacity: [0, 0.5, 0], scale: [0.4, 1.4, 1.8], cy: [84, 84, 84] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.circle
                cx={29}
                cy={84}
                r={1.6}
                fill="rgba(255,255,255,0.35)"
                animate={{ opacity: [0, 0.5, 0], scale: [0.4, 1.4, 1.8] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut", delay: 0.35 }}
              />
            </>
          )}

          {/* whole body: bobs while walking, breathes gently while idle */}
          <motion.g
            animate={
              walking
                ? { y: [0, -2.2, 0, -2.2, 0] }
                : seated || thinking
                  ? { y: [0, 0.6, 0] }
                  : { y: [0, -1, 0] }
            }
            transition={
              walking
                ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
                : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {/* legs — drawn first so torso/arms overlap them at the hip */}
            {seated ? (
              <>
                <rect x={9} y={61} width={11} height={9} rx={4} fill={`url(#${gradId})`} />
                <rect x={24} y={61} width={11} height={9} rx={4} fill={`url(#${gradId})`} />
                <rect x={10} y={69} width={8} height={11} rx={3} fill="#aeb9cc" />
                <rect x={26} y={69} width={8} height={11} rx={3} fill="#aeb9cc" />
              </>
            ) : (
              <>
                <motion.rect
                  x={12}
                  y={61}
                  width={8}
                  height={23}
                  rx={4}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={walking ? { rotate: [18, -18, 18] } : { rotate: 0 }}
                  transition={walking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                />
                <motion.rect
                  x={24}
                  y={61}
                  width={8}
                  height={23}
                  rx={4}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={walking ? { rotate: [-18, 18, -18] } : { rotate: 0 }}
                  transition={walking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                />
              </>
            )}

            {/* arms */}
            {seated ? (
              <>
                <motion.rect
                  x={1}
                  y={42}
                  width={6}
                  height={15}
                  rx={3}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={status === "working" ? { rotate: [22, 30, 22] } : { rotate: 22 }}
                  transition={{ duration: 0.5, repeat: status === "working" ? Infinity : 0, ease: "easeInOut" }}
                />
                <motion.rect
                  x={37}
                  y={42}
                  width={6}
                  height={15}
                  rx={3}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={status === "working" ? { rotate: [-22, -30, -22] } : { rotate: -22 }}
                  transition={{ duration: 0.5, repeat: status === "working" ? Infinity : 0, ease: "easeInOut", delay: 0.25 }}
                />
              </>
            ) : briefing ? (
              <>
                <rect x={1} y={39} width={7} height={22} rx={3.5} fill={`url(#${gradId})`} />
                <motion.rect
                  x={36}
                  y={39}
                  width={7}
                  height={22}
                  rx={3.5}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={{ rotate: [-165, -150, -165] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            ) : (
              <>
                <motion.rect
                  x={1}
                  y={39}
                  width={7}
                  height={22}
                  rx={3.5}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={walking ? { rotate: [-22, 22, -22] } : { rotate: 0 }}
                  transition={walking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                />
                <motion.rect
                  x={36}
                  y={39}
                  width={7}
                  height={22}
                  rx={3.5}
                  fill={`url(#${gradId})`}
                  style={{ originX: 0.5, originY: 0 }}
                  animate={walking ? { rotate: [22, -22, 22] } : { rotate: 0 }}
                  transition={walking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                />
              </>
            )}

            {/* torso */}
            <rect
              x={7}
              y={36}
              width={30}
              height={26}
              rx={8}
              fill={`url(#${gradId})`}
              stroke={error ? "var(--status-error)" : color}
              strokeWidth={1.4}
            />
            <motion.circle
              cx={22}
              cy={49}
              r={4.2}
              fill={color}
              style={{ filter: `drop-shadow(0 0 3px ${color})` }}
              animate={active ? { opacity: [1, 0.4, 1] } : { opacity: 0.85 }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* neck */}
            <rect x={19} y={33} width={6} height={4} fill="#c7d1e0" />

            {/* head */}
            <rect x={4} y={19} width={5} height={10} rx={2.5} fill="#c7d1e0" />
            <rect x={35} y={19} width={5} height={10} rx={2.5} fill="#c7d1e0" />
            <rect
              x={9}
              y={13}
              width={26}
              height={20}
              rx={9}
              fill={`url(#${gradId})`}
              stroke={error ? "var(--status-error)" : color}
              strokeWidth={1.4}
            />
            <rect x={13} y={20} width={18} height={9} rx={4.5} fill="#10141c" />
            <motion.circle
              cx={17.5}
              cy={24.5}
              r={2.2}
              fill={eyeColor}
              style={{ filter: `drop-shadow(0 0 2px ${eyeColor})` }}
              animate={active || error ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx={26.5}
              cy={24.5}
              r={2.2}
              fill={eyeColor}
              style={{ filter: `drop-shadow(0 0 2px ${eyeColor})` }}
              animate={active || error ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            />

            {/* antenna */}
            <line x1={22} y1={6} x2={22} y2={13} stroke="#aeb9cc" strokeWidth={2} strokeLinecap="round" />
            <motion.circle
              cx={22}
              cy={4}
              r={2.4}
              fill={color}
              animate={active ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* seated: glowing monitor the figure is working at */}
            {seated && (
              <>
                <rect x={31} y={40} width={11} height={9} rx={2} fill="#10141c" stroke={color} strokeWidth={1} />
                <motion.rect
                  x={32.5}
                  y={41.5}
                  width={8}
                  height={6}
                  rx={1}
                  fill={color}
                  animate={{ opacity: [0.25, 0.6, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            )}

            {/* thinking: a little ticking "…" bubble */}
            {thinking && (
              <g>
                <rect x={26} y={2} width={16} height={9} rx={4.5} fill="rgba(6,9,15,0.85)" stroke={color} strokeWidth={1} />
                {[0, 1, 2].map((i) => (
                  <motion.circle
                    key={i}
                    cx={30 + i * 4}
                    cy={6.5}
                    r={1.1}
                    fill={color}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
                  />
                ))}
              </g>
            )}

            {/* briefing: a speech bubble, being talked to at the meeting table */}
            {briefing && (
              <motion.g
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "34px 5px" }}
              >
                <path d="M25 1 h18 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-8 l-4 4 v-4 h-6 a3 3 0 0 1 -3 -3 v-4 a3 3 0 0 1 3 -3 z" fill="rgba(6,9,15,0.85)" stroke={color} strokeWidth={1} />
                {[0, 1, 2].map((i) => (
                  <motion.circle
                    key={i}
                    cx={30 + i * 4}
                    cy={5.5}
                    r={1}
                    fill={color}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  />
                ))}
              </motion.g>
            )}
          </motion.g>
        </svg>
      </div>

      {completed && (
        <span
          className="absolute right-0 top-[14%] flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-bg"
          style={{ backgroundColor: "var(--status-success)", transform: facingLeft ? "scaleX(-1)" : undefined }}
        >
          ✓
        </span>
      )}
      {error && (
        <span
          className="absolute right-0 top-[14%] flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-bg"
          style={{ backgroundColor: "var(--status-error)", transform: facingLeft ? "scaleX(-1)" : undefined }}
        >
          !
        </span>
      )}
    </div>
  );
}
