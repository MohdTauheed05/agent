// The Web Speech API's SpeechRecognition interface is still non-standard
// (webkit-prefixed in most browsers) and isn't part of TypeScript's
// lib.dom.d.ts, so it needs a minimal hand-rolled declaration. Only the
// members lib/voice.ts actually touches are declared.

interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
