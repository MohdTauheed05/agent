// Generic AI provider abstraction. All specialist agents use this interface.
// API keys remain server-side in app/api/ai/*/route.ts.

export interface TextGenParams {
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export interface ImageGenParams {
  prompt: string;
  referenceImageUrls?: string[];
}

export interface AudioGenParams {
  text: string;
  voice?: string;
}

export interface VideoGenParams {
  prompt: string;
  referenceImageUrl?: string;
  durationSeconds?: number;
}

export interface AIProvider {
  name: string;
  generateText(params: TextGenParams): Promise<string>;
  generateImage(params: ImageGenParams): Promise<{ url: string }>;
  generateAudio(params: AudioGenParams): Promise<{ url: string }>;
  generateVideo(params: VideoGenParams): Promise<{ url: string }>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${url} failed (${res.status})`);
  }
  return data as T;
}

class OpenAIProvider implements AIProvider {
  name = "openai";
  async generateText({ system, prompt, maxTokens }: TextGenParams): Promise<string> {
    const { text } = await postJSON<{ text: string }>("/api/ai/text", { provider: "openai", system, prompt, maxTokens });
    return text;
  }
  async generateImage({ prompt }: ImageGenParams): Promise<{ url: string }> {
    return postJSON<{ url: string }>("/api/ai/image", { provider: "openai", prompt });
  }
  async generateAudio({ text, voice }: AudioGenParams): Promise<{ url: string }> {
    return postJSON<{ url: string }>("/api/ai/audio", { provider: "openai", text, voice });
  }
  async generateVideo(): Promise<{ url: string }> {
    throw new Error("Video generation is not configured yet. Add a video provider behind /api/ai/video.");
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  async generateText({ system, prompt, maxTokens }: TextGenParams): Promise<string> {
    const { text } = await postJSON<{ text: string }>("/api/ai/text", { provider: "anthropic", system, prompt, maxTokens });
    return text;
  }
  async generateImage(): Promise<{ url: string }> {
    throw new Error("Anthropic image generation is not configured in this project.");
  }
  async generateAudio(): Promise<{ url: string }> {
    throw new Error("Anthropic audio generation is not configured in this project.");
  }
  async generateVideo(): Promise<{ url: string }> {
    throw new Error("Anthropic video generation is not configured in this project.");
  }
}

class GeminiProvider implements AIProvider {
  name = "gemini";
  async generateText({ system, prompt, maxTokens }: TextGenParams): Promise<string> {
    const { text } = await postJSON<{ text: string }>("/api/ai/text", { provider: "gemini", system, prompt, maxTokens });
    return text;
  }
  async generateImage(): Promise<{ url: string }> {
    throw new Error("Gemini image generation is not configured in this project.");
  }
  async generateAudio(): Promise<{ url: string }> {
    throw new Error("Gemini audio generation is not configured in this project.");
  }
  async generateVideo(): Promise<{ url: string }> {
    throw new Error("Gemini/Veo video generation is not configured in this project.");
  }
}

const providers: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
};

// Demo mode has been removed. A real provider is always used.
export function resolveProvider(): AIProvider {
  const providerName = process.env.NEXT_PUBLIC_AI_PROVIDER || "openai";
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unsupported AI provider "${providerName}". Set NEXT_PUBLIC_AI_PROVIDER to openai, anthropic, or gemini.`);
  }
  return provider;
}
