// Which language a person reads and writes chat in. One rule for visitors, volunteers and the mock.
import { baseLanguage, isSignLanguage } from '../../../supabase/functions/translate/core';

export { baseLanguage, isSignLanguage };

/**
 * The written language for a list of languages, main first: the first spoken (non-sign) one, without
 * its region. Sign-language-only users read English text.
 * e.g. ['en', 'es'] → 'en'; ['ase', 'es'] → 'es'; ['pt-BR'] → 'pt'; ['ase'] → 'en'
 */
export function chatLanguage(languages: readonly string[]): string {
  const spoken = languages.find(l => !isSignLanguage(l));
  return spoken ? baseLanguage(spoken) : 'en';
}

/** A profile's chat language: its main language first, then the others. */
export function profileChatLanguage(p: { mainLanguage: string; languages: readonly string[] }): string {
  return chatLanguage([p.mainLanguage, ...p.languages]);
}
