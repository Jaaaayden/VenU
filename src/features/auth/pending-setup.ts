// What someone picks before they have a profile, kept on this device until profile setup uses it:
// the app language from the landing page's language pill, and the name typed on Create Account.
// e.g. { language: 'es', firstName: 'Rosa', email: 'rosa@example.com' } → setup opens with Español
// as primary and "Rosa" filled in, but only for rosa@example.com.
// Stored (not a route param) so it survives an email-confirmation round trip or a web reload.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isKnownLanguage } from '@/features/profile/options';

const KEY = 'venu.setup.pending';

export interface PendingSetup {
  /** This device's app language while signed out: the welcome pill's pick, or the last account's. */
  language?: string;
  /** True when `language` was picked on a language pill and no account has taken it yet. */
  languagePicked?: boolean;
  /**
   * The account a pick was made for (the venue pill, signed in). Unset for a welcome pick made while
   * signed out, the only kind the next account to sign in takes on.
   */
  languagePickedBy?: string;
  firstName?: string;
  /** The account `firstName` was typed for (trimmed, lower case). */
  email?: string;
}

export async function readPendingSetup(): Promise<PendingSetup> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as PendingSetup) : {};
    return {
      language: isKnownLanguage(v.language) ? v.language : undefined,
      languagePicked: v.languagePicked === true ? true : undefined,
      languagePickedBy: v.languagePicked === true && typeof v.languagePickedBy === 'string' ? v.languagePickedBy : undefined,
      firstName: typeof v.firstName === 'string' ? v.firstName : undefined,
      email: typeof v.email === 'string' ? v.email : undefined,
    };
  } catch {
    return {}; // a broken entry only loses a convenience
  }
}

// Writes run one at a time: each reads what's stored and merges into it, so two at once (e.g.
// forgetting a pick while remembering the account's language) would otherwise drop one.
let writes: Promise<void> = Promise.resolve();
function queued(write: () => Promise<void>): Promise<void> {
  const run = writes.then(write).catch(() => {
    // Storage full or blocked (private browsing): setup just starts blank.
  });
  writes = run;
  return run;
}

/** Reads after every write already queued, so it never sees storage from before one of them. */
export function readPendingSetupAfterWrites(): Promise<PendingSetup> {
  const read = writes.then(readPendingSetup); // readPendingSetup never rejects
  writes = read.then(() => {});
  return read;
}

/** Merges into what's stored: keys left out are kept, a key set to `undefined` is cleared. */
export function writePendingSetup(patch: PendingSetup): Promise<void> {
  return queued(async () => {
    const next = { ...(await readPendingSetup()), ...patch };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  });
}

const normalEmail = (email: string) => email.trim().toLowerCase();

/** Create Account: remember the name for this account (or forget an earlier one when it's blank). */
export async function rememberPendingName(email: string, name: string | undefined): Promise<void> {
  const firstName = name?.trim() || undefined;
  await writePendingSetup({ firstName, email: firstName ? normalEmail(email) : undefined });
}

/**
 * Sign In: keep the remembered name only if it was typed for this account, so someone else's
 * name from Create Account on this device never pre-fills a different account's setup.
 */
export async function forgetPendingNameUnlessFor(email: string): Promise<void> {
  const pending = await readPendingSetup();
  if (pending.firstName === undefined && pending.email === undefined) return;
  if (pending.email !== normalEmail(email)) await writePendingSetup({ firstName: undefined, email: undefined });
}

/** After setup saves: the name now lives in the profile. The language stays as this device's choice. */
export function clearPendingName(): Promise<void> {
  return queued(async () => {
    const { language, languagePicked, languagePickedBy } = await readPendingSetup();
    await AsyncStorage.setItem(KEY, JSON.stringify({ language, languagePicked, languagePickedBy }));
  });
}
