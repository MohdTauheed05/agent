import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

interface VideoRequestBody {
  provider: "runway";
  prompt: string;
  referenceImageUrl?: string;
  durationSeconds?: number;
}

const RUNWAY_BASE_URL = "https://api.dev.runwayml.com";
const RUNWAY_VERSION = "2024-11-06";

export async function POST(req: Request) {
  let body: VideoRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.provider !== "runway") {
    return NextResponse.json({ error: `Unknown video provider "${body.provider}"` }, { status: 400 });
  }
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RUNWAYML_API_SECRET is not set on the server. Add it to the Vercel environment variables." },
      { status: 503 }
    );
  }

  const duration = Math.min(10, Math.max(5, Math.round(body.durationSeconds ?? 5)));
  const payload: Record<string, unknown> = {
    model: process.env.RUNWAY_VIDEO_MODEL || "gen4.5",
    promptText: body.prompt,
    ratio: process.env.RUNWAY_VIDEO_RATIO || "1280:720",
    duration,
  };

  // Runway's image_to_video endpoint also supports text-only generation when
  // promptImage is omitted, so one endpoint handles both modes.
  if (body.referenceImageUrl) payload.promptImage = body.referenceImageUrl;

  try {
    const createRes = await fetch(`${RUNWAY_BASE_URL}/v1/image_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`Runway video creation failed (${createRes.status}): ${text.slice(0, 500)}`);
    }

    const created = await createRes.json();
    const taskId = created?.id;
    if (!taskId) throw new Error("Runway did not return a task id.");

    // Poll server-side so the specialist receives a finished video URL rather
    // than an unusable generation task id.
    const deadline = Date.now() + 105_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const taskRes = await fetch(`${RUNWAY_BASE_URL}/v1/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Runway-Version": RUNWAY_VERSION,
        },
        cache: "no-store",
      });

      if (!taskRes.ok) {
        const text = await taskRes.text();
        throw new Error(`Runway task lookup failed (${taskRes.status}): ${text.slice(0, 500)}`);
      }

      const task = await taskRes.json();
      if (task?.status === "SUCCEEDED") {
        const url = task?.output?.[0];
        if (!url) throw new Error("Runway task succeeded but returned no video URL.");
        return NextResponse.json({ url, taskId });
      }
      if (task?.status === "FAILED" || task?.status === "CANCELLED") {
        const detail = task?.failure || task?.failureCode || task?.status;
        throw new Error(`Runway video task ${String(task.status).toLowerCase()}: ${String(detail)}`);
      }
    }

    throw new Error("Runway video generation is still processing after 105 seconds. Retry the video task.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Runway";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
