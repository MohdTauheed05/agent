"use client";

import { Bot } from "lucide-react";
import { useOfficeStore } from "@/lib/store";
import { STATUS_HEX } from "@/lib/theme";

export function TopNav() {
  const demoMode = useOfficeStore((s) => s.demoMode);
  const setDemoMode = useOfficeStore((s) => s.setDemoMode);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b px-6 py-3.5 backdrop-blur-xl"
      style={{ borderColor: "var(--border)", backgroundColor: "rgba(6,9,16,0.6)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            borderColor: STATUS_HEX.active + "55",
            backgroundColor: STATUS_HEX.active + "18",
            boxShadow: `0 0 14px ${STATUS_HEX.active}44`,
          }}
        >
          <Bot size={17} style={{ color: "var(--status-active)" }} />
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight text-text-primary">
          AI Office HQ
        </span>
      </div>

      <button
        onClick={() => setDemoMode(!demoMode)}
        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] text-text-secondary backdrop-blur-xl transition-colors hover:border-border-strong"
        style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.03)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: demoMode ? STATUS_HEX.warning : STATUS_HEX.success }}
        />
        Demo mode
        <span
          className="ml-1 flex h-4 w-7 items-center rounded-full p-0.5 transition-colors"
          style={{ backgroundColor: demoMode ? STATUS_HEX.warning + "55" : "var(--border)" }}
        >
          <span
            className="h-3 w-3 rounded-full bg-white transition-transform"
            style={{ transform: demoMode ? "translateX(12px)" : "translateX(0)" }}
          />
        </span>
      </button>
    </header>
  );
}
