// Server-side image generation, kept separate from /api/ai/text since image
// APIs have a different request/response shape and their own key. Only
// OpenAI is wired up for real — add more `case`s here as you connect other
// image providers (Stability, Gemini/Imagen, etc.), following the same
// "never expose the key to the client" rule as the text route.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ImageRequestBody {
  provider: "openai";
  prompt: string;
}

export async function POST(req: Request) {
  let body: ImageRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt) {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  try {
    switch (body.provider) {
      case "openai":
        return NextResponse.json({ url: await callOpenAIImage(body.prompt) });
      default:
        return NextResponse.json({ error: `Unknown image provider "${body.provider}"` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the image provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function callOpenAIImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the server. Add it to .env.local and restart the dev server.");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image generation failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const url: string | undefined = data?.data?.[0]?.url;
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (url) return url;
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error("OpenAI response did not contain an image.");
}
