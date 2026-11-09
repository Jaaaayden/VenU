import type {
  AccessNeed,
  AgeBand,
  CommunicationMethod,
  Gender,
  HelperAgePref,
  HelperGenderPref,
  Training,
} from './types';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export interface Language {
  code: string;
  /** Name in the language itself, so people who don't read English can find theirs. */
  native: string;
  english: string;
}

// LA County's most-spoken languages first, then other common LA28 visitor languages.
export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'zh', native: '中文', english: 'Chinese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'tl', native: 'Tagalog', english: 'Tagalog' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'hy', native: 'Հայերեն', english: 'Armenian' },
  { code: 'fa', native: 'فارسی', english: 'Persian' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'th', native: 'ไทย', english: 'Thai' },
  { code: 'km', native: 'ខ្មែរ', english: 'Khmer' },
  { code: 'he', native: 'עברית', english: 'Hebrew' },
  { code: 'ase', native: 'ASL', english: 'American Sign Language' },
];

const BY_CODE = new Map(LANGUAGES.map(l => [l.code, l]));

export function languageName(code: string): string {
  return BY_CODE.get(code)?.native ?? code;
}

export function englishLanguageName(code: string): string {
  return BY_CODE.get(code)?.english ?? code;
}

/** Case- and accent-insensitive match on native name, English name or code. */
export function searchLanguages(query: string): Language[] {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return LANGUAGES;
  return LANGUAGES.filter(l => [l.native, l.english, l.code].some(s => fold(s).includes(q)));
}

export const ACCESS_NEEDS: Option<AccessNeed>[] = [
  { value: 'wheelchair', label: 'Wheelchair user' },
  { value: 'hard_of_hearing', label: 'Hard of hearing' },
  { value: 'low_vision', label: 'Low vision' },
  { value: 'walking_aid', label: 'Walking aid' },
  { value: 'other', label: 'Other' },
];

export const COMMUNICATION: Option<CommunicationMethod>[] = [
  { value: 'speaking', label: 'Speaking' },
  { value: 'text', label: 'Text / writing' },
  { value: 'sign_language', label: 'Sign language' },
];

export const HELPER_GENDER: Option<HelperGenderPref>[] = [
  { value: 'none', label: 'No preference' },
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
];

export const HELPER_AGE: Option<HelperAgePref>[] = [
  { value: 'any', label: 'Any age' },
  { value: 'under_40', label: 'Under 40' },
  { value: '40_plus', label: '40+' },
];

export const TRAININGS: Option<Training>[] = [
  { value: 'wheelchair', label: 'Wheelchair trained' },
  { value: 'asl', label: 'ASL' },
  { value: 'first_aid', label: 'First aid' },
  { value: 'sighted_guide', label: 'Sighted guide' },
  { value: 'mental_health', label: 'Mental health first aid' },
];

export const GENDERS: Option<Gender>[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export const AGE_BANDS: Option<AgeBand>[] = [
  { value: 'under_40', label: 'Under 40' },
  { value: '40_plus', label: '40+' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export function labelFor<T extends string>(options: Option<T>[], value: T): string {
  return options.find(o => o.value === value)?.label ?? value;
}
