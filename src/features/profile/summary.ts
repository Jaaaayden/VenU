import { ACCESS_NEEDS, COMMUNICATION, englishLanguageName, labelFor, TRAININGS } from './options';
import type { ProfileDraft } from './types';

/**
 * The tags the other side of a help request sees, e.g.
 * visitor → ["Speaks Spanish, English", "Wheelchair user"]
 * volunteer → ["Speaks English, Spanish", "Wheelchair trained"]
 * Main language first. Kept in one place so the privacy policy and the preview card stay true.
 */
export function helperSummary(d: Pick<ProfileDraft, 'role' | 'languages' | 'mainLanguage' | 'accessNeeds' | 'communication' | 'trainings'>): string[] {
  const langs = [d.mainLanguage, ...d.languages.filter(l => l !== d.mainLanguage)]
    .filter(l => d.languages.includes(l))
    .map(englishLanguageName);
  const tags = langs.length ? [`Speaks ${langs.join(', ')}`] : [];

  if (d.role === 'visitor') {
    tags.push(...d.accessNeeds.filter(n => n !== 'other').map(n => labelFor(ACCESS_NEEDS, n)));
    if (d.accessNeeds.includes('other')) tags.push('Other needs (see note)');
    tags.push(...d.communication.filter(c => c !== 'speaking').map(c => `Prefers ${labelFor(COMMUNICATION, c).toLowerCase()}`));
  } else {
    tags.push(...d.trainings.map(t => labelFor(TRAININGS, t)));
  }
  return tags;
}

export function initials(firstName: string): string {
  const parts = firstName.trim().split(/\s+/).filter(Boolean);
  // Array.from splits by code point, so "😀 Rosa" gives "😀R", not half an emoji.
  return parts.slice(0, 2).map(p => Array.from(p)[0]!.toUpperCase()).join('') || '?';
}
