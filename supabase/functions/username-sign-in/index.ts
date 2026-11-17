// Supabase Edge Function "username-sign-in": Sign In by username without showing anyone the email.
// Deploy (before applying supabase/migrations/20261117000000_private_username_lookup.sql):
//   supabase functions deploy username-sign-in --no-verify-jwt
// --no-verify-jwt: callers are signed out by definition, and a publishable key is not a JWT.
// Secrets: none to set. Supabase gives every function SUPABASE_URL and its keys.
// Rate limits: Auth limits sign-ins per IP. To count each caller's IP rather than the function's,
// turn on IP Address Forwarding (Authentication > Rate Limits); it needs a secret key (sb_secret_…),
// which this uses when the project has one. Contract: handler.ts.
import { createClient } from '@supabase/supabase-js';

import { createHandler, httpPasswordGrant } from './handler.ts';

// The Deno globals this file uses, so the app's `tsc` can check it too (no Deno types in the repo).
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};

const env = (name: string) => Deno.env.get(name);

/** The project's default secret key (sb_secret_…), else the legacy service_role key. */
function serverKey(): string {
  try {
    const secret = (JSON.parse(env('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>).default;
    if (secret) return secret;
  } catch {
    // Not set or not JSON: use the legacy key.
  }
  return env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const url = env('SUPABASE_URL') ?? '';
const key = serverKey();
if (!url || !key) console.error('username-sign-in: SUPABASE_URL or a server key is missing; sign-ins will fail');

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

async function emailForUsername(username: string): Promise<string | null> {
  const { data, error } = await admin.rpc('email_for_username', { p_username: username });
  if (error) throw new Error(error.message);
  return typeof data === 'string' && data ? data : null;
}

Deno.serve(createHandler({ emailForUsername, passwordGrant: httpPasswordGrant(url, key) }));
