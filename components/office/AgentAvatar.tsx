import { AgentStatus } from "@/types";
import { motion } from "framer-motion";

export function AgentAvatar({
  name,
  color,
  status,
  size = 44,
}: {
  name: string;
  color: string;
  status: AgentStatus;
  size?: number;
}) {
  const active = status === "working" || status === "thinking" || status === "receiving_task";
  const gradId = `robot-head-${name.toLowerCase()}-${size}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={name}>
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.35 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <svg viewBox="0 0 64 64" width={size} height={size} className="relative block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="100%" stopColor="#c7d1e0" />
          </linearGradient>
        </defs>

        {/* antenna */}
        <line x1="32" y1="6" x2="32" y2="15" stroke="#aeb9cc" strokeWidth="2" strokeLinecap="round" />
        <motion.circle
          cx="32"
          cy="5"
          r="3"
          fill={color}
          animate={active ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* head */}
        <rect
          x="9"
          y="14"
          width="46"
          height="38"
          rx="17"
          fill={`url(#${gradId})`}
          stroke={status === "error" ? "var(--status-error)" : color}
          strokeWidth="2"
        />
        {/* ears */}
        <rect x="4" y="27" width="5" height="12" rx="2.5" fill="#c7d1e0" />
        <rect x="55" y="27" width="5" height="12" rx="2.5" fill="#c7d1e0" />

        {/* visor */}
        <rect x="16" y="26" width="32" height="16" rx="8" fill="#10141c" />
        <motion.circle
          cx="25"
          cy="34"
          r="4"
          fill={color}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          animate={active ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="39"
          cy="34"
          r="4"
          fill={color}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          animate={active ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        />
      </svg>

      {status === "completed" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-bg"
          style={{ backgroundColor: "var(--status-success)" }}
        >
          ✓
        </span>
      )}
      {status === "error" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] text-bg"
          style={{ backgroundColor: "var(--status-error)" }}
        >
          !
        </span>
      )}
    </div>
  );
}
