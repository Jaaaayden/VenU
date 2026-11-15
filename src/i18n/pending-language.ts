// This device's language while signed out, shared live with <LanguageSync />.
// Stored in pending setup (features/auth/pending-setup.ts); this adds a subscribable copy so a pick
// can switch the UI at once. e.g. choosePendingLanguage('ko') → the app re-renders in Korean.
// Two ways it changes: a language pill (a pick the account takes on: the next one to sign in, or the
// signed-in one), or <LanguageSync /> remembering a signed-in account's language so the welcome page
// keeps it after sign-out.

import { useSyncExternalStore } from 'react';

import { readPendingSetupAfterWrites, writePendingSetup } from '@/features/auth/pending-setup';

interface Snapshot {
  /** undefined: nothing picked on this device. */
  language: string | undefined;
  /** Picked on a language pill and not yet saved to an account. */
  picked: boolean;
  /** The account a pick was made for (venue pill); undefined for a welcome pick made signed out. */
  pickedBy: string | undefined;
  /** Why saving the pick to the account last failed (null: it didn't). The pick stays on screen. */
  saveError: unknown;
  /** false until storage has been read once, so the device language isn't applied too early. */
  loaded: boolean;
}

let snapshot: Snapshot = { language: undefined, picked: false, pickedBy: undefined, saveError: null, loaded: false };
const listeners = new Set<() => void>();
// Bumped by every change made here, so a storage read that started before one is dropped, not applied.
let changes = 0;

function set(language: string | undefined, picked: boolean, pickedBy: string | undefined = undefined, saveError: unknown = null) {
  const s = snapshot;
  if (s.loaded && s.language === language && s.picked === picked && s.pickedBy === pickedBy && s.saveError === saveError) return;
  snapshot = { language, picked, pickedBy: picked ? pickedBy : undefined, saveError, loaded: true };
  listeners.forEach(l => l());
}

function change(language: string | undefined, picked: boolean, pickedBy?: string) {
  changes += 1;
  set(language, picked, pickedBy);
}

/** Re-reads storage: screens that call writePendingSetup directly are picked up on the next read. */
export async function refreshPendingLanguage(): Promise<void> {
  const before = changes;
  const p = await readPendingSetupAfterWrites(); // after any write already on its way
  if (changes !== before) return; // changed here meanwhile: that is newer than what was read
  const picked = p.languagePicked === true;
  // The same pick read back keeps its save error (a retry clears it on purpose, see retryLanguageSave).
  const same = p.language === snapshot.language && picked === snapshot.picked && p.languagePickedBy === snapshot.pickedBy;
  set(p.language, picked, p.languagePickedBy, same ? snapshot.saveError : null);
}

/**
 * A language pill: switches the UI now. Signed out (welcome pill, no `account`), the next account
 * to sign in takes it on; signed in (venue pill, `account` = that user), <LanguageSync /> saves it
 * to that account only, retrying if that fails, and drops it if someone else signs in first.
 */
export async function choosePendingLanguage(code: string, account?: string): Promise<void> {
  change(code, true, account);
  await writePendingSetup({ language: code, languagePicked: true, languagePickedBy: account });
}

/** A signed-in account's language, kept so the welcome page shows it after sign-out. Not a pick. */
export async function rememberAccountLanguage(code: string): Promise<void> {
  change(code, false);
  await writePendingSetup({ language: code, languagePicked: undefined, languagePickedBy: undefined });
}

/** Saving the pick to the account failed; it stays on screen until a retry. */
export function languageSaveFailed(code: string, error: unknown): void {
  if (snapshot.picked && snapshot.language === code) set(code, true, snapshot.pickedBy, error ?? new Error('save failed'));
}

/** Clears a failed save, so <LanguageSync /> saves the pick again (e.g. on the next screen). */
export function retryLanguageSave(): void {
  if (snapshot.saveError) set(snapshot.language, snapshot.picked, snapshot.pickedBy);
}

/** The pick has been used (saved to an account, or taken as profile setup's app language), or dropped. */
export async function forgetLanguagePick(code?: string): Promise<void> {
  // `code`: only if that is still the pick (a newer one waits for its own save).
  if (!snapshot.picked || (code !== undefined && snapshot.language !== code)) return;
  change(snapshot.language, false);
  await writePendingSetup({ languagePicked: undefined, languagePickedBy: undefined });
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
