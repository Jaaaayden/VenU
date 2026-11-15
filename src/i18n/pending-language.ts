// This device's language while signed out, shared live with <LanguageSync />.
// Stored in pending setup (features/auth/pending-setup.ts); this adds a subscribable copy so a pick
// can switch the UI at once. e.g. choosePendingLanguage('ko') → the app re-renders in Korean.
// Two ways it changes: the welcome pill (a pick the next account takes on), or <LanguageSync />
// remembering a signed-in account's language so the welcome page keeps it after sign-out.

import { useSyncExternalStore } from 'react';

import { readPendingSetup, writePendingSetup } from '@/features/auth/pending-setup';

interface Snapshot {
  /** undefined: nothing picked on this device. */
  language: string | undefined;
  /** Picked on the welcome pill and not yet saved to an account. */
  picked: boolean;
  /** false until storage has been read once, so the device language isn't applied too early. */
  loaded: boolean;
}

let snapshot: Snapshot = { language: undefined, picked: false, loaded: false };
const listeners = new Set<() => void>();

function set(language: string | undefined, picked: boolean) {
  if (snapshot.loaded && snapshot.language === language && snapshot.picked === picked) return;
  snapshot = { language, picked, loaded: true };
  listeners.forEach(l => l());
}

/** Re-reads storage: screens that call writePendingSetup directly are picked up on the next read. */
export async function refreshPendingLanguage(): Promise<void> {
  const p = await readPendingSetup();
  set(p.language, p.languagePicked === true);
}

/** The welcome pill: switches the UI now; the next account to sign in on this device takes it on. */
export async function choosePendingLanguage(code: string): Promise<void> {
  set(code, true);
  await writePendingSetup({ language: code, languagePicked: true });
}

/** A signed-in account's language, kept so the welcome page shows it after sign-out. Not a pick. */
export async function rememberAccountLanguage(code: string): Promise<void> {
  set(code, false);
  await writePendingSetup({ language: code, languagePicked: undefined });
}

/** The pick has been used (saved to an account, or taken as profile setup's primary language). */
export async function forgetLanguagePick(): Promise<void> {
  if (!snapshot.picked) return;
  set(snapshot.language, false);
  await writePendingSetup({ languagePicked: undefined });
}

export function usePendingLanguage(): Snapshot {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}
