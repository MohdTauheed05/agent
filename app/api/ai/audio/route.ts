// Server-side audio (text-to-speech) generation. Same rules as
// app/api/ai/text and app/api/ai/image: the real API key stays server-only,
// the browser only ever calls this route.
//
// OpenAI's TTS endpoint returns raw audio bytes (mp3), not a JSON URL like
// the chat/image endpoints — so this route reads the response as a buffer
// and hands it back to the browser as a base64 data URI. That keeps
// AgentOutput.content (a plain string) working unchanged: it's already used
// as a data URI for OpenAI images that come back as b64_json (see
// app/api/ai/image/route.ts), so audio just follows the same convention.
// For real production traffic at scale you'd instead upload the bytes to
// Storage/S3/Firebase Storage and return a short-lived URL — swap that in
// here without touching any agent or UI code.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface AudioRequestBody {
  provider: "openai";
  text: string;
  voice?: string;
}

export async function POST(req: Request) {
  let body: AudioRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.text) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
  }

  try {
    switch (body.provider) {
      case "openai":
        return NextResponse.json({ url: await callOpenAITTS(body.text, body.voice) });
      default:
        return NextResponse.json({ error: `Unknown audio provider "${body.provider}"` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the audio provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function callOpenAITTS(text: string, voice?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the server. Add it to .env.local and restart the dev server.");

  // OpenAI TTS caps input length; a narration script for a whole video can
  // exceed it, so this truncates rather than failing the whole subtask.
  // Split into multiple TTS calls + stitch the audio if you need the full
  // script narrated end-to-end.
  const MAX_CHARS = 4000;
  const input = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: voice || process.env.OPENAI_TTS_VOICE || "alloy",
      input,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI audio generation failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}
