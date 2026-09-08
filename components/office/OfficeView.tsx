"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { IsoOffice } from "./IsoOffice";

// react-three-fiber's <Canvas> touches the DOM/WebGL at module-eval time in
// a few code paths, which breaks Next's server render. ssr:false keeps it
// out of the server bundle entirely; the loading fallback only shows for
// the brief moment before hydration picks it up client-side.
const Office3D = dynamic(() => import("./Office3D").then((m) => m.Office3D), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[520px] items-center justify-center rounded-2xl border text-[13px] text-text-muted"
      style={{ borderColor: "var(--border)" }}
    >
      Loading 3D office…
    </div>
  ),
});

// Kept as a real toggle (not a one-time migration) on purpose: WebGL isn't
// guaranteed everywhere (old hardware, some sandboxed browsers, remote
// desktops), and the 3D scene has real GPU/CPU cost the 2D floor plan
// doesn't. If the 3D view looks broken or runs poorly on a given machine,
// "Floor plan" is a real fallback, not a stripped-down view.
export function OfficeView() {
  const [mode, setMode] = useState<"3d" | "flat">("3d");

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="inline-flex rounded-full border p-0.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setMode("3d")}
            className="rounded-full px-2.5 py-1 transition-colors"
            style={{
              backgroundColor: mode === "3d" ? "var(--surface-raised)" : "transparent",
              color: mode === "3d" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            3D office
          </button>
          <button
            onClick={() => setMode("flat")}
            className="rounded-full px-2.5 py-1 transition-colors"
            style={{
              backgroundColor: mode === "flat" ? "var(--surface-raised)" : "transparent",
              color: mode === "flat" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            Floor plan
          </button>
        </div>
      </div>
      {mode === "3d" ? <Office3D /> : <IsoOffice />}
    </div>
  );
}
