// Which app languages have translated screen text, and how to pick one from a stored code.
// e.g. resolveUiLanguage('es') → 'es'; resolveUiLanguage('de') → 'en' (German isn't translated yet);
// resolveUiLanguage('pt-BR') → 'pt'.

import { LANGUAGES, type Language } from '@/features/profile/options';

export const DEFAULT_LANGUAGE = 'en';

/** Codes with string tables under locales/. Keep in sync with locales/index.ts (a test checks). */
export const TRANSLATED = ['en', 'es', 'zh', 'ko', 'tl', 'vi', 'hy', 'fa', 'ja', 'ru', 'ar', 'fr', 'pt'] as const;
export type UiLanguage = (typeof TRANSLATED)[number];

/** The LANGUAGES entries the UI is translated into, in LANGUAGES order. */
export const UI_LANGUAGES: Language[] = LANGUAGES.filter(l => (TRANSLATED as readonly string[]).includes(l.code));

/** LANGUAGES codes with no string tables. Language pills leave them out: picking one would still show English. */
export const UNTRANSLATED: string[] = LANGUAGES.filter(l => !(TRANSLATED as readonly string[]).includes(l.code)).map(l => l.code);

const RTL = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'yi']);

export function isRtl(code: string): boolean {
  return RTL.has(code.split('-')[0].toLowerCase());
}

export function isUiLanguage(code: string | null | undefined): code is UiLanguage {
  return !!code && (TRANSLATED as readonly string[]).includes(code);
}

/** Maps any stored or device code to a translated one; anything untranslated gets English. */
export function resolveUiLanguage(code: string | null | undefined): UiLanguage {
  if (!code) return DEFAULT_LANGUAGE;
  const base = code.split(/[-_]/)[0].toLowerCase();
  if (isUiLanguage(base)) return base;
  if (base === 'fil') return 'tl'; // devices report Filipino as fil
  return DEFAULT_LANGUAGE;
}

/**
 * Which language the app should show, by priority: the signed-in profile's app language, else the
 * language picked on the welcome screen, else the device language, else English.
 * e.g. pickUiLanguage({ profile: null, pending: 'ko', device: 'es-MX' }) → 'ko'
 */
export function pickUiLanguage(sources: { profile?: string | null; pending?: string | null; device?: string | null }): UiLanguage {
  return resolveUiLanguage(sources.profile || sources.pending || sources.device);
}

/** What keeps the welcome pill and a signed-in account on the same language (see accountLanguageStep). */
export type AccountLanguageStep = { save: UiLanguage } | { forgetPick: true } | { remember: UiLanguage } | null;

/** This device's language as pending-language.ts keeps it. */
export interface DeviceLanguage {
  language?: string;
  /** Picked on a pill and not saved to an account yet. */
  picked: boolean;
  /** The account a venue-pill pick was made for; undefined for a welcome pick made while signed out. */
  pickedBy?: string;
}

/**
 * The pick that applies to `userId`: a welcome pick (made signed out), or that user's own unsaved
 * venue-pill pick. Another account's unsaved pick never carries over, e.g.
 * pickFor({ language: 'es', picked: true, pickedBy: 'rosa' }, 'daniel') → null.
 */
export function pickFor(device: DeviceLanguage, userId: string | null): string | null {
  if (!device.picked || !device.language) return null;
  return device.pickedBy === undefined || device.pickedBy === userId ? device.language : null;
}

/**
 * Run once an account's profile is loaded. A pick that applies to this account (pickFor) is saved
 * to it; another account's unsaved pick is dropped; otherwise this device remembers the language
 * the account is shown in, so the welcome page keeps it after sign-out.
 * e.g. welcome pick 'es', account 'en'          → { save: 'es' }
 *      picked 'en', account 'en'                → { forgetPick: true }
 *      Rosa's unsaved venue pick, Daniel signs in → { forgetPick: true }
 *      no pick, device has 'es', account 'ko'   → { remember: 'ko' }
 *      no pick, account 'hi' (shown in English) → { remember: 'en' }
 */
export function accountLanguageStep(account: { id: string; language: string }, device: DeviceLanguage): AccountLanguageStep {
  const accountLanguage = account.language;
  if (device.picked) {
    const code = pickFor(device, account.id);
    return isUiLanguage(code) && code !== accountLanguage ? { save: code } : { forgetPick: true };
  }
  const shown = resolveUiLanguage(accountLanguage);
  return device.language !== shown ? { remember: shown } : null;
}

/**
 * The app language a new profile starts with. The primary language is only a starting point for
 * the app when nothing was picked on the welcome pill and it has translated screens; otherwise the
 * app stays in the language on screen.
 * e.g. picked 'ar', primary 'hi'      → 'ar'
 *      no pick, primary 'ko', shown 'es' → 'ko'
 *      no pick, primary 'hi', shown 'es' → 'es'
 */
export function setupAppLanguage(mainLanguage: string, picked: string | null | undefined, onScreen: UiLanguage): UiLanguage {
  if (isUiLanguage(picked)) return picked;
  return isUiLanguage(mainLanguage) ? mainLanguage : onScreen;
}

/**
 * The primary language profile setup starts with: the welcome pick, else the language on screen.
 * Never the last account's remembered language as such: that belongs to someone else.
 * e.g. welcome pick 'ar' → 'ar'; no pick, screen in 'es' → 'es'
 */
export function setupPrimaryLanguage(pick: string | null, onScreen: UiLanguage): string {
  return isUiLanguage(pick) ? pick : onScreen;
}

/**
 * Setup's spoken languages after the corner pill switches from `before` to `now`, or null to leave
 * them. Primary follows the pill while it's still the untouched start (just the old pill language);
 * once the user changed their languages by hand, the pill never overwrites them.
 * e.g. ['en'] main 'en', pill en → ja → ['ja'] main 'ja'
 *      the user picked 'en' as primary by hand, pill en → ja → null
 */
export function languagesFollowingPill(
  current: { languages: string[]; mainLanguage: string },
  before: string,
  now: string,
  changedByHand: boolean,
): { languages: string[]; mainLanguage: string } | null {
  if (changedByHand || before === now) return null;
  const untouched = current.mainLanguage === before && current.languages.length === 1 && current.languages[0] === before;
  return untouched ? { languages: [now], mainLanguage: now } : null;
}
