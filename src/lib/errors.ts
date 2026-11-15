// Turns errors from fetch / Supabase / our own code into one plain sentence, in the UI language.
// e.g. TypeError("Failed to fetch") → "Can't reach VenU. Check your connection and try again."
//      (Spanish UI → "No se puede conectar con VenU. Revisa tu conexión e inténtalo de nuevo.")
// Strings: common:errors.* in src/i18n/locales.
//
// Keep the error itself, not the sentence, when it stays on screen (a load error, a banner), and
// translate it at render with the screen's own t, so a language switch re-renders it:
//   const tc = useT('common'); <Text>{errorText(loadError, tc)}</Text>

import type { TFunction } from 'i18next';

import { PHOTO_MAX_BYTES } from '@/constants/photo';
import i18n from '@/i18n';
import type { Resources } from '@/i18n/locales';

type ErrorKey = keyof Resources['common']['errors'];
/** t with a key built at runtime (always a common:errors key, see ErrorKey). */
type Translate = (key: string, params?: Record<string, string | number>) => string;
export type CommonT = TFunction<'common'>;

/** What to say about an error: a common:errors key and its values. */
export interface ErrorMessage {
  key: ErrorKey;
  params?: Record<string, string | number>;
}

/** Codes on errors this app throws itself, so the message is chosen here, in the UI language. */
export const ERROR_CODES = {
  /** The profile row already exists with the other role (a lost insert response). `role` says which. */
  roleMismatch: 'VENU_ROLE_MISMATCH',
  /** Local dev mode: the photo doesn't fit in this browser's storage. */
  photoTooBigLocal: 'VENU_PHOTO_TOO_BIG_LOCAL',
  /** The picked photo can't be read any more (e.g. a web blob: URL after a reload). */
  photoUnreadable: 'VENU_PHOTO_UNREADABLE',
} as const;

/** An Error with one of ERROR_CODES (and anything else the message needs), e.g. codedError('photoUnreadable'). */
export function codedError(code: keyof typeof ERROR_CODES, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(code), { code: ERROR_CODES[code], ...extra });
}

const photoSize = { size: PHOTO_MAX_BYTES / 1024 / 1024 };

const BY_CODE: Record<string, (e: { role?: unknown }) => ErrorMessage> = {
  [ERROR_CODES.roleMismatch]: e => ({ key: e.role === 'volunteer' ? 'roleMismatchVolunteer' : 'roleMismatchVisitor' }),
  [ERROR_CODES.photoTooBigLocal]: () => ({ key: 'photoTooBigLocal' }),
  [ERROR_CODES.photoUnreadable]: () => ({ key: 'photoUnreadable' }),
  // Supabase Auth error codes (AuthApiError.code).
  invalid_credentials: () => ({ key: 'wrongLogin' }),
  email_not_confirmed: () => ({ key: 'confirmEmail' }),
  user_already_exists: () => ({ key: 'alreadyRegistered' }),
  email_exists: () => ({ key: 'alreadyRegistered' }),
  weak_password: () => ({ key: 'weakPassword' }),
  email_address_invalid: () => ({ key: 'invalidEmail' }),
  over_request_rate_limit: () => ({ key: 'rateLimit' }),
  over_email_send_rate_limit: () => ({ key: 'rateLimit' }),
  over_sms_send_rate_limit: () => ({ key: 'rateLimit' }),
  session_expired: () => ({ key: 'sessionExpired' }),
  refresh_token_not_found: () => ({ key: 'sessionExpired' }),
};

const KNOWN: [RegExp, ErrorMessage][] = [
  [/failed to fetch|network request failed|networkerror|load failed|fetch failed/i, { key: 'offline' }],
  [/invalid login credentials/i, { key: 'wrongLogin' }],
  [/email not confirmed/i, { key: 'confirmEmail' }],
  [/user already registered/i, { key: 'alreadyRegistered' }],
  [/password should (be at least|contain)|password is (too )?weak|pwned|known to be weak/i, { key: 'weakPassword' }],
  [/unable to validate email|invalid email|email address .* is invalid/i, { key: 'invalidEmail' }],
  [/rate limit|too many requests|you can only request this after/i, { key: 'rateLimit' }],
  // Shown on screens with and without a sign-out button (e.g. sign-in), so no "sign out" step.
  [/jwt expired|invalid jwt|refresh token/i, { key: 'sessionExpired' }],
  // Not a session problem: the database or storage policy refused this change.
  [/row-level security|permission denied/i, { key: 'cantSave' }],
  [/exceeded the maximum allowed size|payload too large/i, { key: 'photoTooBig', params: photoSize }],
  [/mime type/i, { key: 'photoWrongType' }],
];

function isNetworkError(e: unknown): boolean {
  // Supabase marks network failures as AuthRetryableFetchError with status 0.
  return (e as { name?: string } | null)?.name === 'AuthRetryableFetchError';
}

/**
 * Which message fits `e`. Anything unrecognised gets `fallback` (errors.generic): raw messages
 * from Supabase or the database are English and may carry internals, so they're never shown.
 * e.g. errorMessage(new TypeError('Failed to fetch')) → { key: 'offline' }
 */
export function errorMessage(e: unknown, fallback: ErrorKey = 'generic'): ErrorMessage {
  if (isNetworkError(e)) return { key: 'offline' };
  const { code, message } = (e ?? {}) as { code?: unknown; message?: unknown };
  if (typeof code === 'string' && BY_CODE[code]) return BY_CODE[code](e as { role?: unknown });
  const text = typeof e === 'string' ? e : message;
  if (typeof text === 'string') for (const [pattern, m] of KNOWN) if (pattern.test(text)) return m;
  return { key: fallback };
}

/** True when `e` means VenU couldn't be reached (the startup gate shows its offline screen). */
export function isOfflineError(e: unknown): boolean {
  return errorMessage(e).key === 'offline';
}

/** The sentence for `e` in `t`'s language; pass the screen's t from useT('common'). */
export function errorText(e: unknown, t: CommonT): string {
  const { key, params } = errorMessage(e);
  return (t as unknown as Translate)(`errors.${key}`, params);
}

/**
 * The sentence for `e` in the current language, for a message shown right away (a failed tap).
 * `fallback` replaces errors.generic for unrecognised errors.
 */
export function friendlyError(e: unknown, fallback?: string): string {
  const m = errorMessage(e);
  if (m.key === 'generic' && fallback !== undefined) return fallback;
  return (i18n.t as unknown as Translate)(`common:errors.${m.key}`, m.params);
}
