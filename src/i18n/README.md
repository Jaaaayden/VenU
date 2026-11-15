# Translations

Screen text comes from string tables in `locales/<language>/<namespace>.json`, bundled into the app.
English (`en`) is the source; 12 more languages: es, zh, ko, tl, vi, hy, fa, ja, ru, ar, fr, pt.
Any other language in `LANGUAGES` shows English.

| Namespace    | For                                                    |
| ------------ | ------------------------------------------------------ |
| `common`     | shared components, tab bar, generic buttons and errors |
| `onboarding` | welcome, sign-in, sign-up, role, profile setup         |
| `profile`    | Profile tab, edit profile, privacy                     |
| `venue`      | venue list, map, facilities, reports                   |
| `volunteer`  | volunteer tab, requests, chat                          |

## Use it in a screen

```tsx
import { useT } from '@/i18n';
import { formatDate, formatNumber } from '@/i18n/format';

const t = useT('venue');
<Text>{t('report.title')}</Text>                                      // "Report a problem"
<Text>{t('report.submitted', { date: formatDate(r.createdAt) })}</Text> // "Submitted 10/24/2026"
<Text>{t('nearby', { count: n, number: formatNumber(n) })}</Text>    // nearby_one / nearby_other
```

Shared words live in `common`: `useT('common')('actions.save')`. Outside React (helpers, stores):
`import i18n from '@/i18n'; i18n.t('venue:report.title')`. Keys are typed from the English files,
so a typo'd key fails `npm run typecheck` (placeholder values aren't checked: pass them all).

Don't build sentences from pieces (`'Submitted ' + date`): give translators the whole sentence with
a placeholder. Dates, times and numbers go through `format.ts` (`formatDate`, `formatTime`,
`formatNumber`), never hand-built `mm/dd`.

## Add a string

1. Add it to `locales/en/<namespace>.json`, e.g. `"report": { "title": "Report a problem" }`.
2. Add the same key to the other 12 files of that namespace, translated (short UI copy, not literal).
3. Plurals: `"nearby_one": "{{number}} volunteer nearby"`, `"nearby_other": "..."`. `count` picks the form;
   `{{number}}` shows it in the language's digits (Persian ۳, not 3). Each language needs its own forms
   (ru: `_one _few _many _other`; ar: `_zero _one _two _few _many _other`; ja/ko/zh/vi: `_other`).
   Any other number placeholder gets `formatNumber(n)` too, e.g. `{ max: formatNumber(80) }`.
4. `npm test`: `__tests__/locales.test.ts` fails on any missing or extra key or lost placeholder.

## Add a language

1. Copy `locales/en/` to `locales/<code>/` and translate it. The code must be in `LANGUAGES`
   (`src/features/profile/options.ts`).
2. Add `<code>` to `TRANSLATED` in `languages.ts` and a line to `locales/index.ts`.
3. Right-to-left? Add it to `RTL` in `languages.ts`.

## Which language shows

`<LanguageSync />` (mounted in `app/_layout.tsx`) picks: a pill pick not saved yet → signed-in
profile's `appLanguage` → this device's language (`pending-language.ts`) → the device language →
English. Changing any of them re-renders the app without a restart.

Only the language pills set the app language (`choosePendingLanguage(code)`); the profile's
spoken languages never do. They stay in step (`accountLanguageStep` in `languages.ts`):
- Pick Español on welcome, then sign in → Español is saved to the account (only `app_language`, so
  privacy consent isn't re-stamped).
- Switch to 한국어 on the venue page → shown at once, saved to the account; offline, it stays on
  screen and the next screen retries.
- Sign out → welcome stays in the language the account was shown in (Hindi account → English).
- Profile setup: the welcome pick, else a translated primary language, else what's on screen.
- Both pills list only translated languages (`UNTRANSLATED` is left out) and name the language on screen.

Arabic and Persian mirror the layout. Web flips at once (`<html dir="rtl">`). iOS and Android flip
after a restart (the app asks); Expo Go can't flip. Use `marginStart`/`paddingEnd`/`start`/`end`
instead of left/right, and flip directional icons with `useLayoutRtl()`.
