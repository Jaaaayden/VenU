// Which locale speech recognition listens in, and what to try when the device can't do it.
// e.g. pickSpeechLanguage({ profile: 'tl', ui: 'en' }) → { code: 'tl', locale: 'fil-PH' }
//      startPlans('ko-KR', { locales: ['en-US'], installed: [] }) → [{ lang: 'en-US', onDevice: false, fellBack: true }]

/** Our language codes (features/profile/options.ts) → BCP-47 locales the recognizers know. */
const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  es: 'es-US',
  zh: 'zh-CN',
  ko: 'ko-KR',
  tl: 'fil-PH',
  vi: 'vi-VN',
  hy: 'hy-AM',
  fa: 'fa-IR',
  ja: 'ja-JP',
  ru: 'ru-RU',
  ar: 'ar-SA',
  fr: 'fr-FR',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
  hi: 'hi-IN',
  pa: 'pa-IN',
  th: 'th-TH',
  km: 'km-KH',
  he: 'he-IL',
};

export const FALLBACK_LOCALE = 'en-US';

/** The locale for one of our codes, or null when there's nothing to listen for (e.g. 'ase', sign language). */
export function speechLocale(code: string | null | undefined): string | null {
  if (!code) return null;
  return SPEECH_LOCALES[code.split(/[-_]/)[0].toLowerCase()] ?? null;
}

/**
 * The language to listen in: the profile's main language if it can be spoken, else the UI language,
 * else US English. `code` is ours (for naming it to the user), `locale` is for the recogniser.
 * e.g. pickSpeechLanguage({ profile: 'ase', ui: 'ko' }) → { code: 'ko', locale: 'ko-KR' }
 */
export function pickSpeechLanguage(sources: { profile?: string | null; ui?: string | null }): { code: string; locale: string } {
  for (const code of [sources.profile, sources.ui]) {
    const locale = speechLocale(code);
    if (code && locale) return { code: code.split(/[-_]/)[0].toLowerCase(), locale };
  }
  return { code: 'en', locale: FALLBACK_LOCALE };
}

/** 'zh-CN' and 'zh_Hans_CN' name the same language; compare loosely. */
function same(a: string, b: string) {
  return a.replace(/_/g, '-').toLowerCase() === b.replace(/_/g, '-').toLowerCase();
}

/** Finds `locale` in a device list: exact, else same language (es-US asked, es-MX offered). */
export function matchLocale(locale: string, list: readonly string[]): string | null {
  const exact = list.find(l => same(l, locale));
  if (exact) return exact;
  const base = locale.split('-')[0].toLowerCase();
  return list.find(l => l.replace(/_/g, '-').split('-')[0].toLowerCase() === base) ?? null;
}

/** What the device reported; empty lists mean "didn't say" (web, Android 12 and older). */
export interface LocaleSupport {
  locales: readonly string[];
  /** Locales with an on-device model installed. */
  installed: readonly string[];
}

export interface StartPlan {
  lang: string;
  /** Keep audio on the phone. Only set where the device has that language's model. */
  onDevice: boolean;
  /** True when this plan listens in English because the wanted language isn't supported. */
  fellBack: boolean;
}

/**
 * The ways to start, best first. A later plan is tried when an earlier one fails with
 * "language not supported": on-device first, then the platform default, then US English.
 */
export function startPlans(locale: string, support: LocaleSupport): StartPlan[] {
  const plans: StartPlan[] = [];
  const add = (lang: string, fellBack: boolean) => {
    const installed = matchLocale(lang, support.installed);
    if (installed) plans.push({ lang: installed, onDevice: true, fellBack });
    plans.push({ lang: installed ?? lang, onDevice: false, fellBack });
  };
  const known = support.locales.length ? matchLocale(locale, support.locales) ?? matchLocale(locale, support.installed) : locale;
  if (known) add(known, false);
  if (!same(locale, FALLBACK_LOCALE)) add(FALLBACK_LOCALE, true);
  else if (!known) add(FALLBACK_LOCALE, false); // the list may just be incomplete; let the platform decide
  return plans;
}
