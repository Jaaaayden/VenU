// Checks for the Sign In and Create Account forms (pure, so jest can run them without a backend).

export type AuthMode = 'signin' | 'signup';
export type AuthField = 'email' | 'password' | 'terms';

/** `field` puts the message under that input; null shows it above the button (e.g. wrong password). */
export interface AuthError {
  field: AuthField | null;
  message: string;
}

export interface AuthValues {
  email: string;
  password: string;
  /** Create Account only. */
  name?: string;
  termsAccepted?: boolean;
}

export const MIN_PASSWORD = 8;

/**
 * The first problem with the form, or null.
 * `local` (no backend): any email and password continue, but the terms box still has to be ticked.
 */
export function validateAuth(mode: AuthMode, v: AuthValues, local: boolean): AuthError | null {
  if (!local) {
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return { field: 'email', message: 'Enter a valid email.' };
    if (mode === 'signup' && v.password.length < MIN_PASSWORD)
      return { field: 'password', message: `Use at least ${MIN_PASSWORD} characters for your password.` };
    if (!v.password) return { field: 'password', message: 'Enter your password.' };
  }
  if (mode === 'signup' && !v.termsAccepted)
    return { field: 'terms', message: 'Agree to the Terms & Conditions to continue.' };
  return null;
}
