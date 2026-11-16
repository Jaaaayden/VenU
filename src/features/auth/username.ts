// Usernames for Create Account and Sign In (Figma Onboarding 2.0, 482:32140 / 482:32247).
// Sign In takes a username or an email: anything with "@" is an email.
// e.g. normalizeUsername('  Rosa_M ') → 'rosa_m'; isEmailLike('rosa@example.com') → true

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
/** Lower-case letters, digits, "_" and "."; must match the usernames table check in supabase/migrations. */
const USERNAME_RE = /^[a-z0-9_.]+$/;

/** Usernames are stored and compared in lower case, so "Rosa" and "rosa" are the same account. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmailLike(identifier: string): boolean {
  return identifier.includes('@');
}

export type UsernameProblem = 'length' | 'chars';

/** Why a (normalized) username can't be used, or null. e.g. 'ro' → 'length', 'rosa!' → 'chars' */
export function usernameProblem(username: string): UsernameProblem | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return 'length';
  if (!USERNAME_RE.test(username)) return 'chars';
  return null;
}
