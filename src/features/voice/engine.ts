// The on-device recogniser (expo-speech-recognition), loaded only when someone taps speak.
// Expo Go doesn't ship the native module, and importing the library there throws, so the import is
// guarded: speechEngine() returns null instead and the UI says "type instead".
// e.g. const engine = speechEngine(); if (!engine || !isEngineAvailable(engine)) show(unavailable);

import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export type SpeechEngine = typeof ExpoSpeechRecognitionModule;

let engine: SpeechEngine | null | undefined;

export function speechEngine(): SpeechEngine | null {
  if (engine === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      engine = (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule ?? null;
    } catch {
      engine = null; // Expo Go, or a build made before the library was added
    }
  }
  return engine;
}

/** Whether recognition can run right now (false in Firefox, or with Siri and Dictation turned off). */
export function isEngineAvailable(e: SpeechEngine): boolean {
  try {
    return e.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** Tests swap the engine; pass undefined to load the real one again. */
export function setSpeechEngineForTests(next: SpeechEngine | null | undefined) {
  engine = next;
}
