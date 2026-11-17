-- Sign In by username no longer looks the email up in the app: the username-sign-in Edge Function
-- (supabase/functions/username-sign-in) does it server-side and returns only the session. Until
-- now anyone could call email_for_username signed out and turn a list of usernames into emails.
--
-- Order matters. Deploy the function first, then apply this:
--   supabase functions deploy username-sign-in --no-verify-jwt
--   supabase db push   (or paste into the SQL editor)
-- Applied before the function is live, username sign-in fails (the app falls back to this RPC
-- only while the function is missing). Email sign-in is unaffected either way.
--
-- username_available stays callable signed out: Create Account needs it.

revoke execute on function public.email_for_username(text) from anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;
