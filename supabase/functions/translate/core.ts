// The translate function's contract and limits, shared by the Edge Function (Deno), the mock backend
// (scripts/mock-supabase.mjs, Node) and the app's client (types only). Plain TypeScript with erasable
// types and no imports, so Deno, Node's type stripping and Metro all load it as is.
//
// POST /functions/v1/translate
//   { "target": "es", "source": "en", "texts": ["Hi Rosa!"] }        source is optional
//   → { "provider": "anthropic", "translations": [{ "text": "¡Hola, Rosa!", "detectedSource": "en" }] }

export const MAX_TEXT_CHARS = 2000;
export const MAX_BATCH = 16;
/** All texts in one request together; keeps one model call well under its output cap. */
export const MAX_TOTAL_CHARS = 8000;

export type ProviderName = 'anthropic' | 'deepl' | 'stub';

export interface TranslateBatch {
  /** Language code to translate into, e.g. 'es', 'hi'. */
  target: string;
  /** Language the texts are in, if the sender's language is known. */
  source?: string;
  texts: string[];
}

export interface TranslateResult {
  /** The translation, or the original text when it wasn't translated (see the flags). */
  text: string;
  /** Code of the language the text was written in, e.g. 'en'; null when unknown. */
  detectedSource: string | null;
  /** The provider can't translate into `target` (e.g. DeepL and Tagalog). `text` is the original. */
  unsupported?: true;
  /** No real translator here (local and mock modes without keys). `text` is the original. */
  unavailable?: true;
  /** The model declined to translate it. `text` is the original. */
  refused?: true;
}

export interface TranslateResponse {
  provider: ProviderName;
  translations: TranslateResult[];
}

/** A provider translates one already-validated batch, results in the same order as `texts`. */
export interface Translator {
  name: ProviderName;
  translate(batch: TranslateBatch): Promise<TranslateResult[]>;
}

const CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/** 'pt-BR' → 'pt', 'EN' → 'en'. */
export function baseLanguage(code: string): string {
  return code.split(/[-_]/)[0]!.toLowerCase();
}

export type Parsed = { ok: true; batch: TranslateBatch } | { ok: false; error: string };

/** Checks a request body against the limits above. */
export function parseBatch(body: unknown): Parsed {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send a JSON object: { target, texts }.' };
  const { target, source, texts } = body as Record<string, unknown>;
  if (typeof target !== 'string' || !CODE.test(target)) return { ok: false, error: '"target" must be a language code such as "es".' };
  if (source !== undefined && source !== null && (typeof source !== 'string' || !CODE.test(source))) {
    return { ok: false, error: '"source" must be a language code such as "en", or left out.' };
  }
  if (!Array.isArray(texts) || texts.length === 0) return { ok: false, error: '"texts" must be a non-empty array of strings.' };
  if (texts.length > MAX_BATCH) return { ok: false, error: `At most ${MAX_BATCH} texts per request.` };
  let total = 0;
  for (const t of texts) {
    if (typeof t !== 'string') return { ok: false, error: '"texts" must be a non-empty array of strings.' };
    if (t.length > MAX_TEXT_CHARS) return { ok: false, error: `Each text must be at most ${MAX_TEXT_CHARS} characters.` };
    total += t.length;
  }
  if (total > MAX_TOTAL_CHARS) return { ok: false, error: `At most ${MAX_TOTAL_CHARS} characters per request.` };
  return { ok: true, batch: { target, ...(typeof source === 'string' ? { source } : {}), texts: texts as string[] } };
}

/** English names for the prompt; covers the app's LANGUAGES list (src/features/profile/options.ts). */
const ENGLISH_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', zh: 'Chinese (Simplified)', ko: 'Korean', tl: 'Tagalog', vi: 'Vietnamese',
  hy: 'Armenian', fa: 'Persian', ja: 'Japanese', ru: 'Russian', ar: 'Arabic', fr: 'French', pt: 'Portuguese',
  de: 'German', it: 'Italian', hi: 'Hindi', pa: 'Punjabi', th: 'Thai', km: 'Khmer', he: 'Hebrew',
};

export function englishName(code: string): string {
  return ENGLISH_NAMES[baseLanguage(code)] ?? code;
}

/** Sign languages have no written form to translate into. */
export function isSignLanguage(code: string): boolean {
  return baseLanguage(code) === 'ase';
}
