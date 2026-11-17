// Shared by the Sign In and Create Account screens: validation, the in-flight guard, the auth
// call and where a signed-in user goes next.

import type { Href } from 'expo-router';
import { useRef, useState } from 'react';

import { useProfile } from '@/features/profile/profile-context';
import { homeFor } from '@/features/profile/types';
import * as auth from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

import { clearPendingName, forgetPendingNameUnlessFor, rememberPendingName } from './pending-setup';
import { validateAuth, type AuthError, type AuthField, type AuthMode, type AuthValues } from './validate';

export type { AuthError, AuthField, AuthMode, AuthValues };

/** Where a signed-in user belongs: their home tab, or setup if they have no profile yet. Null while signed out. */
export function useSignedInHref(): Href | null {
  const { status, profile } = useProfile();
  if (status !== 'ready') return null;
  return profile ? homeFor(profile) : '/onboarding/role';
}

/**
 * submit() resolves to:
 * - 'done': signed in; the screen's useSignedInHref() redirect moves on once the profile loads;
 * - 'confirm': account made, but Supabase wants the email confirmed before signing in;
 * - 'failed': `error` says why.
 */
export function useAuthForm(mode: AuthMode) {
  const { refresh } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  // Enter (onSubmitEditing) plus a tap can both fire before `busy` renders; a ref blocks the second.
  const inFlight = useRef(false);

  async function submit(values: AuthValues): Promise<'done' | 'confirm' | 'failed'> {
    if (inFlight.current) return 'failed';
    const invalid = validateAuth(mode, values, auth.isLocalMode);
    setError(invalid);
    if (invalid) return 'failed';

    inFlight.current = true;
    setBusy(true);
    try {
      const result = mode === 'signin'
        ? await auth.signIn(values.email, values.password)
        : await auth.signUp(values.email, values.password, values.username ?? '');
      if (!result.ok) {
        setError({ field: result.field ?? null, message: result.error });
        return 'failed';
      }
      // Profile setup starts with the name typed on Create Account, tied to that email: a sign-in
      // to any other account on this device drops it, but signing in after confirming keeps it.
      // (A username sign-in reports the account's email; local mode has none, so it uses what was typed.)
      const email = result.email ?? values.email;
      if (mode === 'signup') await rememberPendingName(email, values.name);
      else await forgetPendingNameUnlessFor(email);
      if (result.needsConfirmation) return 'confirm';
      // No navigation here: once the provider is 'ready' (from this load or the auth listener's,
      // whichever lands last), the screen's redirect sends the user on.
      const profile = await refresh();
      // Already set up: the account keeps its own role, so the first screen's visitor/volunteer
      // choice (and any Create Account name) is spent. Left stored, it came back ticked on the
      // first screen after signing out, e.g. picked "volunteer", signed in to a visitor account.
      if (profile) await clearPendingName();
      return 'done';
    } catch (e) {
      setError({ field: null, message: friendlyError(e) });
      return 'failed';
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  /** Errors for one field, for `<TextField error={…}>`. */
  function errorFor(field: AuthField): string | null {
    return error?.field === field ? error.message : null;
  }

  return { busy, error, setError, errorFor, submit };
}
