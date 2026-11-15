// DeepL as the translator, over its REST API (POST /v2/translate, one call per batch).
// Free keys end in ":fx" and use api-free.deepl.com; paid keys use api.deepl.com.
import { baseLanguage, type TranslateBatch, type TranslateResult, type Translator } from './core.ts';

/**
 * App languages DeepL can translate into, mapped to its target codes. Anything else (Tagalog,
 * Vietnamese, Armenian, Persian, Hindi, ...) comes back untranslated with `unsupported: true`.
 * DeepL adds languages over time: check https://developers.deepl.com/docs/getting-started/supported-languages
 * and add a line here.
 */
export const DEEPL_TARGETS: Record<string, string> = {
  en: 'EN-US', es: 'ES', zh: 'ZH-HANS', ko: 'KO', ja: 'JA', ru: 'RU', ar: 'AR', fr: 'FR', pt: 'PT-BR', de: 'DE', it: 'IT',
};

export function deeplEndpoint(apiKey: string): string {
  return apiKey.trim().endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
}

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export function createDeepLTranslator(apiKey: string, fetchFn: Fetch = fetch): Translator {
  return {
    name: 'deepl',
    async translate({ target, source, texts }: TranslateBatch): Promise<TranslateResult[]> {
      const targetLang = DEEPL_TARGETS[baseLanguage(target)];
      if (!targetLang) return texts.map(text => ({ text, detectedSource: source ?? null, unsupported: true }));

      // Source codes are the bare language ("EN", "PT"); an unknown one is left for DeepL to detect.
      const sourceLang = source && DEEPL_TARGETS[baseLanguage(source)] ? baseLanguage(source).toUpperCase() : undefined;
      const res = await fetchFn(deeplEndpoint(apiKey), {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${apiKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texts, target_lang: targetLang, ...(sourceLang ? { source_lang: sourceLang } : {}) }),
      });
      // 403 bad key, 456 monthly quota used up, 429 too many requests, 5xx DeepL down.
      if (!res.ok) throw new Error(`DeepL answered ${res.status}`);
      const body = (await res.json()) as { translations?: { text: string; detected_source_language?: string }[] };
      const out = body.translations;
      if (!Array.isArray(out) || out.length !== texts.length) throw new Error('DeepL returned the wrong number of translations');
      return out.map(t => ({ text: t.text, detectedSource: t.detected_source_language ? baseLanguage(t.detected_source_language) : null }));
    },
  };
}
