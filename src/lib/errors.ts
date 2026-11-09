// Turns errors from fetch / Supabase into one plain sentence for the screen.
// e.g. TypeError("Failed to fetch") → "Can't reach VenU. Check your connection and try again."

import { PHOTO_TOO_BIG, PHOTO_WRONG_TYPE } from '@/constants/photo';

export const OFFLINE = "Can't reach VenU. Check your connection and try again.";

const KNOWN: [RegExp, string][] = [
  [/failed to fetch|network request failed|networkerror|load failed|fetch failed/i, OFFLINE],
  [/invalid login credentials/i, 'Wrong email or password.'],
  [/email not confirmed/i, 'Confirm your email first. Check your inbox for the link.'],
  [/user already registered/i, 'That email already has an account. Try signing in.'],
  [/rate limit|too many requests/i, 'Too many tries. Wait a minute and try again.'],
  // Shown on screens with and without a sign-out button (e.g. sign-in), so no "sign out" step.
  [/jwt expired|invalid jwt|refresh token/i, 'Your session expired. Please sign in again.'],
  // Not a session problem: the database or storage policy refused this change.
  [/row-level security|permission denied/i, "VenU couldn't save that change. If it keeps happening, sign out and back in."],
  [/exceeded the maximum allowed size|payload too large/i, PHOTO_TOO_BIG],
  [/mime type/i, PHOTO_WRONG_TYPE],
];

/** PostgREST errors have `details` and `hint`; Storage errors are named Storage*Error. */
function isDatabaseOrStorageError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const name = (e as { name?: unknown }).name;
  return ('details' in e && 'hint' in e) || (typeof name === 'string' && name.startsWith('Storage'));
}

export function friendlyError(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : (e as { message?: unknown })?.message;
  // Supabase marks network failures as AuthRetryableFetchError with status 0.
  if ((e as { name?: string })?.name === 'AuthRetryableFetchError') return OFFLINE;
  if (typeof message !== 'string' || !message.trim()) return fallback;
  for (const [pattern, friendly] of KNOWN) if (pattern.test(message)) return friendly;
  // Unrecognised database/storage errors carry internals (constraint and table names): don't show them.
  if (isDatabaseOrStorageError(e)) return fallback;
  // Our own errors (and Supabase auth's) are written for people, so show them as they are.
  return message;
}
