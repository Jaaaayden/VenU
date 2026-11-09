# VenU

One tap. Right help. Your language. Accessible venue help for LA28 visitors, matched with volunteers who speak their language. An Expo / React Native app for iOS, Android and web.

## Setup

Needs Node 22 (see `.nvmrc`). No global installs: every tool runs from `node_modules`.

```bash
npm ci          # install exactly what package-lock.json says
npm start       # dev server; press i / a / w for iOS, Android, web
```

## Supabase

Without keys the app runs in **local mode**: sign-in is skipped and profiles stay on the device. To use the real backend:

```bash
cp .env.example .env.local   # fill in URL + anon key from Supabase → Project Settings → API
```

The schema lives in `supabase/migrations/` (apply with `supabase db push` or the SQL editor).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
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
assets/             app icon, splash, favicon
.kiro/figma/        Figma export the first screens were built from
```
