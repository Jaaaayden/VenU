import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { isEmailLike, normalizeUsername } from '@/features/auth/username';
import { codedError, friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export const LOCAL_USER_ID = 'local-guest';
const LOCAL_SESSION_KEY = 'venu.local.session';

/** `email`: the account's email once signed in (a username sign-in looks it up). `field`: where to show the error. */
export type AuthResult =
  | { ok: true; needsConfirmation?: boolean; email?: string }
  | { ok: false; error: string; field?: 'username' };

export const isLocalMode = supabase === null;

/** No such username: worded exactly like a wrong password, so sign-in doesn't reveal which usernames exist. */
const wrongLogin = () => friendlyError({ code: 'invalid_credentials' });

/**
 * Sign in with a username or an email. A username is looked up with the `email_for_username`
 * function (supabase/migrations/20261116000000_usernames.sql) and then signs in by that email.
 * e.g. signIn('rosa_m', pw) → email_for_username('rosa_m') = 'rosa@example.com' → password sign-in
 */
export async function signIn(identifier: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL_SESSION_KEY, '1');
    return { ok: true };
  }
  let email = identifier.trim();
  if (!isEmailLike(email)) {
    const { data, error } = await supabase.rpc('email_for_username', { p_username: normalizeUsername(email) });
    if (error) return { ok: false, error: friendlyError(error) };
    if (typeof data !== 'string' || !data) return { ok: false, error: wrongLogin() };
    email = data;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: friendlyError(error) } : { ok: true, email };
}

/**
 * Create an account. The username goes in the user's metadata, where a database trigger claims
 * it in public.usernames; a quick `username_available` check first gives a clear "taken" message.
 */
export async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL_SESSION_KEY, '1');
    return { ok: true };
  }
  const name = normalizeUsername(username);
  const taken = { ok: false as const, error: friendlyError(codedError('usernameTaken')), field: 'username' as const };
  const check = await supabase.rpc('username_available', { p_username: name });
  if (check.error) return { ok: false, error: friendlyError(check.error) };
  if (check.data === false) return taken;
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: name } } });
  if (error) {
    // Someone took the name between the check and the sign-up: the trigger's unique index fails
    // the insert, which Supabase reports as a generic database error.
    if (/database error saving new user/i.test(error.message)) {
      const again = await supabase.rpc('username_available', { p_username: name });
      if (again.data === false) return taken;
    }
    return { ok: false, error: friendlyError(error) };
  }
  // With email confirmation on, Supabase returns a user but no session yet.
  return { ok: true, needsConfirmation: !data.session, email: email.trim() };
}

export async function signOut(): Promise<void> {
  if (!supabase) {
    await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }
  // Revoke on the server first (global), so a copied token stops working. That call returns
  // early on a network failure and leaves the session stored, so fall back to clearing this
  // device's session (local), which needs no network: offline sign-out still signs out.
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) {
    return (await AsyncStorage.getItem(LOCAL_SESSION_KEY)) ? LOCAL_USER_ID : null;
  }
  const { data, error } = await supabase.auth.getSession();
  // An expired token that can't refresh because we're offline is a load error, not "signed out":
  // throwing lets the app show "Can't reach VenU" and keep the saved session. Any other error
  // (revoked refresh token, deleted user) has already cleared the session, so it is signed out.
  if (error && !data.session && isAuthRetryableFetchError(error)) throw error;
  return data.session?.user.id ?? null;
}
