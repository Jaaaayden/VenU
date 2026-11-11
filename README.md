# VenU

One tap. Right help. Your language. Accessible venue help for LA28 visitors, matched with volunteers who speak their language. An Expo / React Native app for iOS, Android and web.

## Setup

Needs Node 22 (see `.nvmrc`). No global installs: every tool runs from `node_modules`.

```bash
npm ci          # install exactly what package-lock.json says
npm start       # dev server; press i / a / w for iOS, Android, web
```

## Backend modes

Pick one when you start the app. Each runs on its own port, so their accounts and data never mix.

| Command | Port | Backend | Sign-up |
| --- | --- | --- | --- |
| `npm run dev:local` | 8082 | none: data stays on the device | any email and password work |
| `npm run dev:mock` | 8083 | fake Supabase on this machine | signs you straight in |
| `npm run dev:mock:verify` | 8083 | fake Supabase on this machine | confirmation link prints in the terminal |
| `npm run dev:supabase` | 8081 | your Supabase project (`.env.local`) | confirm by email if "Confirm email" is on in Supabase |

`npm run stop` ends every VenU dev server, including ones started with `npx expo start` or left behind by a closed terminal. Ctrl+C stops the one in front of you.

- Extra flags go after `--`: `npm run dev:mock -- --reset` wipes the fake data, `-- --port 8090` picks another port, and anything else goes to `expo start` (`-- --web`).
- The fake backend saves to `.expo/mock-supabase.json` and follows the same rules as the migrations. It runs on `localhost`, so use it from the web or a simulator, not a phone.
- For `dev:supabase`: `cp .env.example .env.local`, then fill in the URL and the **publishable** key (Supabase → Project Settings → API Keys). Never the secret key: it bypasses row-level security.
- The schema lives in `supabase/migrations/`. Apply it in order with `supabase db push` or the SQL editor.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server (mode from `.env.local`) |
| `npm run dev:local` / `dev:mock` / `dev:mock:verify` / `dev:supabase` | Start in a backend mode (above) |
| `npm run stop` | End every VenU dev server |
| `npm run lint` | ESLint, fails on any warning |
| `npm run typecheck` | Generate typed routes, then `tsc --noEmit` |
| `npm test` | Jest unit tests (`src/**/__tests__`) |
| `npm run check` | Lint, typecheck, tests and `expo-doctor`; run before opening a PR (CI runs the same) |

## Adding packages

```bash
npx expo install <package>   # picks the version that matches our Expo SDK
```

Use `npm install` only for packages unrelated to Expo / React Native (e.g. a dev tool).

## Layout

```
src/app/            routes (Expo Router): every file is a screen
  index.tsx         entry gate: sign-in → onboarding → tabs
  onboarding/       role.tsx (step 1), profile.tsx (step 2)
  (tabs)/           venue, volunteer, profile + floating nav bar
  edit-profile.tsx, privacy.tsx, sign-in.tsx
src/features/profile/  profile types, options, validation, store (Supabase or local), context, form
src/lib/            supabase client, auth
src/components/     shared UI (chips, buttons, avatar, language picker, nav bar)
src/constants/      design tokens (Colors, Spacing, Radius, Type)
supabase/           SQL migrations
scripts/            dev.mjs (backend modes, stop), mock-supabase.mjs (fake backend)
assets/             app icon, splash, favicon
.kiro/figma/        Figma export the first screens were built from
```
