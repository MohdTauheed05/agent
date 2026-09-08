"use client";

import { Bot } from "lucide-react";
import { STATUS_HEX } from "@/lib/theme";

export function TopNav() {
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
    </header>
  );
}
