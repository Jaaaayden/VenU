// This device's language while signed out, shared live with <LanguageSync />.
// Stored in pending setup (features/auth/pending-setup.ts); this adds a subscribable copy so a pick
// can switch the UI at once. e.g. choosePendingLanguage('ko') → the app re-renders in Korean.
// Two ways it changes: a language pill (a pick the account takes on: the next one to sign in, or the
// signed-in one), or <LanguageSync /> remembering a signed-in account's language so the welcome page
// keeps it after sign-out.

import { useSyncExternalStore } from 'react';

import { readPendingSetup, writePendingSetup } from '@/features/auth/pending-setup';

interface Snapshot {
  /** undefined: nothing picked on this device. */
  language: string | undefined;
  /** Picked on a language pill and not yet saved to an account. */
  picked: boolean;
  /** Why saving the pick to the account last failed (null: it didn't). The pick stays on screen. */
  saveError: unknown;
  /** false until storage has been read once, so the device language isn't applied too early. */
  loaded: boolean;
}

let snapshot: Snapshot = { language: undefined, picked: false, saveError: null, loaded: false };
const listeners = new Set<() => void>();

function set(language: string | undefined, picked: boolean, saveError: unknown = null) {
  if (snapshot.loaded && snapshot.language === language && snapshot.picked === picked && snapshot.saveError === saveError) return;
  snapshot = { language, picked, saveError, loaded: true };
  listeners.forEach(l => l());
}

/** Re-reads storage: screens that call writePendingSetup directly are picked up on the next read. */
export async function refreshPendingLanguage(): Promise<void> {
  const p = await readPendingSetup();
  const picked = p.languagePicked === true;
  // The same pick read back keeps its save error (a retry clears it on purpose, see retryLanguageSave).
  const same = p.language === snapshot.language && picked === snapshot.picked;
  set(p.language, picked, same ? snapshot.saveError : null);
}

/**
 * A language pill: switches the UI now. Signed out, the next account to sign in takes it on;
 * signed in, <LanguageSync /> saves it to the account (and tries again if that fails).
 */
export async function choosePendingLanguage(code: string): Promise<void> {
  set(code, true);
  await writePendingSetup({ language: code, languagePicked: true });
}

/** A signed-in account's language, kept so the welcome page shows it after sign-out. Not a pick. */
export async function rememberAccountLanguage(code: string): Promise<void> {
  set(code, false);
  await writePendingSetup({ language: code, languagePicked: undefined });
}

/** Saving the pick to the account failed; it stays on screen until a retry. */
export function languageSaveFailed(code: string, error: unknown): void {
  if (snapshot.picked && snapshot.language === code) set(code, true, error ?? new Error('save failed'));
}

/** Clears a failed save, so <LanguageSync /> saves the pick again (e.g. on the next screen). */
export function retryLanguageSave(): void {
  if (snapshot.saveError) set(snapshot.language, snapshot.picked);
}

/** The pick has been used (saved to an account, or taken as profile setup's app language). */
export async function forgetLanguagePick(code?: string): Promise<void> {
  // `code`: only if that is still the pick (a newer one waits for its own save).
  if (!snapshot.picked || (code !== undefined && snapshot.language !== code)) return;
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
