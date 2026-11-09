import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export const LOCAL_USER_ID = 'local-guest';
const LOCAL_SESSION_KEY = 'venu.local.session';

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

export const isLocalMode = supabase === null;

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL_SESSION_KEY, '1');
    return { ok: true };
  }
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: friendlyError(error) } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL_SESSION_KEY, '1');
    return { ok: true };
  }
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: friendlyError(error) };
  // With email confirmation on, Supabase returns a user but no session yet.
  return { ok: true, needsConfirmation: !data.session };
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
