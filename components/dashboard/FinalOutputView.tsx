"use client";

import { FileText, Image as ImageIcon, Video, Music, Tag, Download } from "lucide-react";
import { AgentOutput, Project } from "@/types";
import { getAgent } from "@/lib/agents/roster";
import { STATUS_HEX } from "@/lib/theme";

// Demo Mode writes a plain placeholder path/text as `content`; a real
// provider writes an actual URL or base64 data URI (see lib/ai/provider.ts).
// This tells the two apart so the card can render real media inline once a
// provider is connected, while still showing a clean note in Demo Mode.
function isRealMedia(output: AgentOutput): boolean {
  if (output.kind !== "image" && output.kind !== "audio" && output.kind !== "video") return false;
  return output.content.startsWith("http") || output.content.startsWith("data:");
}

function downloadOutput(output: AgentOutput) {
  const isText = output.kind === "document" || output.kind === "metadata" || !isRealMedia(output);
  const href = isText
    ? URL.createObjectURL(new Blob([output.content], { type: "text/plain" }))
    : output.content;
  const ext = output.kind === "image" ? "png" : output.kind === "audio" ? "mp3" : output.kind === "video" ? "mp4" : "txt";
  const a = document.createElement("a");
  a.href = href;
  a.download = `${output.title.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
  a.click();
  if (isText) URL.revokeObjectURL(href);
}

const KIND_META: Record<string, { icon: typeof FileText; label: string }> = {
  document: { icon: FileText, label: "Document" },
  image: { icon: ImageIcon, label: "Image" },
  video: { icon: Video, label: "Video" },
  audio: { icon: Music, label: "Audio" },
  metadata: { icon: Tag, label: "Metadata" },
};

export function FinalOutputView({ project }: { project: Project }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-base font-semibold text-text-primary">{project.title}</div>
          <div className="text-[12.5px] text-text-secondary">Project complete — every department reported back.</div>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
          style={{ borderColor: STATUS_HEX.success + "55", color: STATUS_HEX.success, backgroundColor: STATUS_HEX.success + "14" }}
        >
          Completed
        </span>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {project.outputs.map((o) => {
          const meta = KIND_META[o.kind] ?? KIND_META.document;
          const Icon = meta.icon;
          const agent = getAgent(o.agentId);
          return (
            <div key={o.id} className="rounded-lg border border-border bg-surface-raised p-3 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12.5px] font-medium text-text-primary">
                  <Icon size={14} style={{ color: agent?.color }} />
                  {o.title}
                </div>
                <button
                  onClick={() => downloadOutput(o)}
                  className="text-text-muted hover:text-text-primary"
                  title="Download"
                >
                  <Download size={13} />
                </button>
              </div>
              <div className="mt-1 text-[11px] text-text-muted">
                {meta.label} · {agent?.name}
              </div>
              {o.kind === "document" || o.kind === "metadata" ? (
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[11.5px] text-text-secondary">
                  {o.content}
                </p>
              ) : isRealMedia(o) ? (
                <div className="mt-2">
                  {o.kind === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element -- data: / third-party URLs, no next/image loader config
                    <img src={o.content} alt={o.title} className="max-h-40 w-full rounded-md object-cover" />
                  )}
                  {o.kind === "audio" && (
                    <audio controls src={o.content} className="w-full" style={{ height: 32 }} />
                  )}
                  {o.kind === "video" && <video controls src={o.content} className="w-full rounded-md" />}
                </div>
              ) : (
                <p className="mt-2 text-[11.5px] text-text-muted">
                  Demo Mode placeholder asset — connect a real provider to generate this file.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
