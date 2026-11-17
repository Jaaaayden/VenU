import type { Resources } from '@/i18n/locales';

import { ACCESS_NEEDS, englishLanguageName, isKnownLanguage, labelFor, TRAININGS, type ProfileT } from './options';
import type { ProfileDraft } from './types';

type NamedLanguage = keyof Resources['profile']['languageNames'];

/** A language's name in `t`'s language, e.g. 'es' → "Spanish" (en), "español" (es); unknown codes as stored. */
export function uiLanguageName(code: string, t: ProfileT): string {
  if (!isKnownLanguage(code)) return code;
  return t(`languageNames.${code as NamedLanguage}`, { defaultValue: englishLanguageName(code) });
}

/**
 * The tags the other side of a help request sees, in `t`'s language, e.g.
 * visitor → ["Speaks Spanish, English", "Wheelchair user"]
 * volunteer → ["Speaks English, Spanish", "Wheelchair trained"]
 * Main language first. Kept in one place so the privacy policy and the preview card stay true.
 */
export function helperSummary(
  d: Pick<ProfileDraft, 'role' | 'languages' | 'mainLanguage' | 'accessNeeds' | 'communication' | 'trainings'>,
  t: ProfileT,
): string[] {
  const langs = [d.mainLanguage, ...d.languages.filter(l => l !== d.mainLanguage)]
    .filter(l => d.languages.includes(l))
    .map(l => uiLanguageName(l, t));
  const tags = langs.length ? [t('summary.speaks', { languages: langs.join(t('summary.listSeparator')) })] : [];

  if (d.role === 'visitor') {
    tags.push(...d.accessNeeds.filter(n => n !== 'other').map(n => labelFor(ACCESS_NEEDS, n, t)));
    if (d.accessNeeds.includes('other')) tags.push(t('summary.otherNeeds'));
    tags.push(...d.communication.filter(c => c !== 'speaking').map(c => t(`summary.prefers.${c}`)));
  } else {
    tags.push(...d.trainings.map(skill => labelFor(TRAININGS, skill, t)));
  }
  return tags;
}

export function initials(firstName: string): string {
  const parts = firstName.trim().split(/\s+/).filter(Boolean);
  // Array.from splits by code point, so "😀 Rosa" gives "😀R", not half an emoji.
  return parts.slice(0, 2).map(p => Array.from(p)[0]!.toUpperCase()).join('') || '?';
}
