// Server-side text generation. Every real text call from the browser
// (lib/ai/provider.ts's OpenAIProvider/AnthropicProvider/GeminiProvider)
// comes through here instead of hitting a vendor API directly — that's what
// keeps OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY server-only.
// Never rename these to NEXT_PUBLIC_*; that would ship them to every visitor.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface TextRequestBody {
  provider: "openai" | "anthropic" | "gemini";
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export async function POST(req: Request) {
  let body: TextRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, system, prompt, maxTokens } = body;
  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  try {
    switch (provider) {
      case "openai":
        return NextResponse.json({ text: await callOpenAI(system, prompt, maxTokens) });
      case "anthropic":
        return NextResponse.json({ text: await callAnthropic(system, prompt, maxTokens) });
      case "gemini":
        return NextResponse.json({ text: await callGemini(system, prompt, maxTokens) });
      default:
        return NextResponse.json({ error: `Unknown provider "${provider}"` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the AI provider";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function callOpenAI(system: string | undefined, prompt: string, maxTokens?: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the server. Add it to .env.local and restart the dev server.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Swap for whichever chat model your account has access to.
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI text generation failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenAI response did not contain any text.");
  return text;
}

async function callAnthropic(system: string | undefined, prompt: string, maxTokens?: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart the dev server.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens ?? 1024,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic text generation failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("\n")
    : "";
  if (!text) throw new Error("Anthropic response did not contain any text.");
  return text;
}

async function callGemini(system: string | undefined, prompt: string, maxTokens?: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server. Add it to .env.local and restart the dev server.");

  // Check Google's current model list before relying on this in production —
  // model ids on this API move faster than most.
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { maxOutputTokens: maxTokens ?? 1024 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini text generation failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini response did not contain any text.");
  return text;
}
