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
