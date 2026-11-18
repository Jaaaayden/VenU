# Night batch 2026-11-18: decisions

Answers from Jayden before the run, and calls made during it. Each line: decision, then why.

## From Jayden
- Matching uses the `profiles` table, not `users` / `profiles_attendees` / `profiles_volunteers`.
- Matching: GPS radius, the app assigns the closest volunteer using the visitor's preferences. Krisha designs and implements the algorithm; this batch only stores what it needs (availability, verified).
- Translation: Anthropic (Claude Haiku). Key is in `.env.local`; the live Edge Function secret must be added by Jayden in the dashboard (agents never paste API keys).
- Save facility reports, ratings and problem reports to the database.
- Store volunteer settings (Free/Busy/Off, notification settings) on the server.
- Verified: an admin flips `profiles.verified` in the dashboard. Unverified volunteers finish setup and see requests, but can't accept (a "Waiting for verification" note). Demo volunteer starts verified.
- Password reset, and deleting an account also deletes the sign-in (auth user).
- Social sign-in: add it (Figma shows Facebook, Google, Apple). Providers need client IDs set in the Supabase dashboard by Jayden.
- Event data after the Games: keep it. Later idea: sort history by recency / filter by event.
- Calling, read aloud, stickers: stay "coming soon".
- Onboarding: follow Figma (step-by-step Onboarding 2.0; Figma's newest frames build on it).
- Live DB: agents may apply tested migrations and create 2 demo accounts tonight.

## Made during the run
- 2026-11-18: `20261118000000_db_hardening` applied to live through the dashboard (pasted text hash-checked against the file); all 12 checks in 4-hardening-check.sql true.
- Figma refresh (2 REST calls): newest frames are visitor-side (Find a Volunteer v3, role choice, preferences), not volunteer-side helper screens; those are built tonight. Step-by-step onboarding stays (Figma's newest frames build on it).
- Live demo accounts and end-to-end tests: created and run by script (supabase-js), never by typing passwords into a page. Browser tests with two agents (visitor + volunteer in sync) run against the mock backend on localhost.
- Merged so far: translate-e2e, figma-nov18, volunteer-settings, reports-db (gate after each: lint 0, typecheck 0, jest 577/577). Two tests needed the volunteer verified first now that volunteers start unverified (mock feedback test; reports PGlite harness).
- Applied to live (hash-checked paste, then read back): `20261118010000_reports_feedback`, `20261118020000_volunteer_settings_verified`. Live check: 3 new tables with RLS, profiles has availability / availability_updated_at / notification_prefs, `profiles_guard` trigger, anon has no privileges on profiles, accept_help_request authenticated-only.
- Deployed Edge Function `translate` to live from the deploy folder (6 files, lengths checked), Verify JWT off (it checks tokens itself). It answers 503 until Jayden adds TRANSLATE_PROVIDER and ANTHROPIC_API_KEY under Edge Functions → Secrets.
- Live demo accounts: blocked. Live auth requires email confirmation, rejects the `.demo` domain ("email_address_invalid"), and the built-in email sender hit its rate limit (429 over_email_send_rate_limit), so no accounts were created. Real visitors signing up would hit the same limit: Jayden should set up custom SMTP (Authentication → Emails → SMTP) or decide to turn off "Confirm email". Retrying later with example.com addresses, then confirming them with SQL.
- Figma choices made by the Figma worker (no migration tonight): kept 6 help types (Figma shows 5 incl. "Find a facility", which needs a new help_types value), kept age bands any / under 40 / 40+ (Figma shows 20-30 / 30-40), "Speech impairment" not added (needs an access_needs value). Help type is single-choice now, stored as a one-item list.
- Merged account-auth (conflicts in README, mock server, profile context resolved keeping both sides). Fixed the mock's delete-account to drop the deleted user's facility reports and help feedback like the database's cascades (test fails without the fix). Reports and help feedback cascade on account deletion (reports worker's choice); app feedback keeps the note with no author.
- Applied `20261118030000_account_deletion` to live (hash-checked). Deployed Edge Functions `delete-account` and `password-reset` (Verify JWT off: both check tokens themselves / serve signed-out callers). The dashboard editor only takes flat files, so the deployed `password-reset` carries a copy of `username-sign-in/handler.ts` as `username-sign-in-handler.ts` with its one import line pointed at it; the repo is unchanged. Smoke test: translate and delete-account answer 401 without a session, password-reset answers 200 {"sent":true} for an unknown username.
- Live demo accounts: still not created. Retry an hour later: Supabase rejects example.com addresses ("email_address_invalid") and the email limit was still exhausted. Needs Jayden: custom SMTP or turning off "Confirm email", then run `scripts/e2e.mjs` against live.
- Two Chrome testers (visitor + volunteer) ran the full flow on mock. Findings: scratchpad night/sync/findings-*.md. Top bug: the visitor's 2-minute search timeout could cancel a request a volunteer had just accepted. Fix workers: fix-help-flow (lifecycle), fix-chat-polish (chat/translation), fix-profile-i18n (profile, fonts, wording).
