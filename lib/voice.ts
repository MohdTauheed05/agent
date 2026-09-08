// Browser-native voice I/O for the agent chat panel — the same mechanism
// ChatGPT's web voice mode leans on for input (Web Speech API
// SpeechRecognition) and, by default, for output (SpeechSynthesis). Both
// run entirely client-side: no API key, no server round-trip, works the
// moment the browser supports it. If a richer voice is wanted, the chat
// panel can instead pipe replies through the existing OpenAI TTS route at
// app/api/ai/audio — see `speakViaOpenAI` in AgentChatPanel.tsx.

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface ListenHandle {
  stop: () => void;
}

// Starts one voice-input turn. Calls onResult once with the final
// transcript, then onEnd regardless of whether it succeeded, matched
// nothing, or errored (mirrors a push-to-talk button's lifecycle).
export function listenOnce(
  onResult: (transcript: string) => void,
  onEnd: () => void,
  onError?: (message: string) => void
): ListenHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError?.("Voice input isn't supported in this browser — try Chrome or Edge.");
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let done = false;
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onResult(transcript);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error !== "aborted") onError?.(`Voice input error: ${event.error}`);
  };
  recognition.onend = () => {
    if (!done) {
      done = true;
      onEnd();
    }
  };

  try {
    recognition.start();
  } catch {
    onError?.("Couldn't start the microphone — check the browser's mic permission for this site.");
    return null;
  }

  return {
    stop: () => {
      if (!done) recognition.stop();
    },
  };
}

let voiceCache: SpeechSynthesisVoice[] | null = null;
function pickVoiceFor(seed: string): SpeechSynthesisVoice | undefined {
  if (!speechSynthesisSupported()) return undefined;
  if (!voiceCache || voiceCache.length === 0) voiceCache = window.speechSynthesis.getVoices();
  const voices = voiceCache;
  if (!voices || voices.length === 0) return undefined;
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length ? english : voices;
  // Deterministic per-agent pick (by name) so the same agent always sounds
  // the same voice across a session, without needing a config table that
  // would break the moment the browser's installed voice list differs.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

// Speaks text aloud with the browser's built-in TTS. `voiceSeed` (pass the
// agent's name) keeps each agent's voice consistent without hardcoding
// voice names, which vary by OS/browser.
export function speak(text: string, voiceSeed: string, onEnd?: () => void): void {
  if (!speechSynthesisSupported()) return;
  window.speechSynthesis.cancel(); // don't let replies overlap/queue up
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoiceFor(voiceSeed);
  if (voice) utterance.voice = voice;
  utterance.rate = 1.02;
  utterance.pitch = 1.0;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
}

// Some browsers (notably Chrome) load the voice list asynchronously —
// call this once (e.g. in a top-level effect) so the first `speak()` call
// after page load doesn't fall back to the default voice.
export function primeVoices(): void {
  if (!speechSynthesisSupported()) return;
  voiceCache = window.speechSynthesis.getVoices();
  if (voiceCache.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      voiceCache = window.speechSynthesis.getVoices();
    };
  }
}
