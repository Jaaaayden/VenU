// A fake translator for local and mock modes: offline, deterministic, and only as good as the string
// tables. It recognizes the mock volunteer's canned chat lines (volunteer `mock.*` in every locale)
// and facility names (meeting spots), and answers with the same line from the target locale, names and places filled in. Anything else
// comes back unchanged with `unavailable: true` ("translation unavailable in local mode").
// Imports only core.ts (with its .ts extension), so scripts/mock-supabase.mjs loads this same file in Node.
//
// e.g. createStub(catalog).translateOne('Got it, thanks! I'll be there in a couple of minutes.', 'es')
//      → { text: '¡Entendido, gracias! Llego en un par de minutos.', detectedSource: 'en' }
import { baseLanguage, type TranslateBatch, type TranslateResult, type Translator } from '../../../supabase/functions/translate/core.ts';

/** Per language, flat key → template, e.g. { en: { reply1: 'Got it…', 'spots.gate2Ramp': 'Near Gate 2 Ramp' } }. */
export type StubCatalog = Record<string, Record<string, string>>;

/** Flattens nested string tables: { spots: { a: 'x' } } → { 'spots.a': 'x' }. */
export function flattenStrings(table: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(table)) {
    if (typeof v === 'string') out[prefix + k] = v;
    else if (v && typeof v === 'object') Object.assign(out, flattenStrings(v as Record<string, unknown>, `${prefix}${k}.`));
  }
  return out;
}

/**
 * Facility names from venue `facilityText`, as stub lines, so a meeting spot inside a volunteer's
 * line is translated too: { 'entry-4': { name: 'Entry 4', … } } → { 'places.entry-4': 'Entry 4' }.
 */
export function placeNames(facilityText: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, v] of Object.entries(facilityText)) {
    const name = v && typeof v === 'object' ? (v as { name?: unknown }).name : undefined;
    if (typeof name === 'string') out[`places.${id}`] = name;
  }
  return out;
}

interface Compiled {
  lang: string;
  key: string;
  re: RegExp;
  names: string[];
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(catalog: StubCatalog): Compiled[] {
  const out: Compiled[] = [];
  // English first, so a line that reads the same in two tables is reported as English.
  const langs = Object.keys(catalog).sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : 0));
  for (const lang of langs) {
    for (const [key, template] of Object.entries(catalog[lang]!)) {
      const names: string[] = [];
      let pattern = '';
      let last = 0;
      for (const m of template.matchAll(PLACEHOLDER)) {
        pattern += escape(template.slice(last, m.index)) + '(.+?)';
        names.push(m[1]!);
        last = m.index! + m[0].length;
      }
      pattern += escape(template.slice(last));
      out.push({ lang, key, re: new RegExp(`^${pattern}$`, 's'), names });
    }
  }
  return out;
}

export function createStub(catalog: StubCatalog) {
  const compiled = compile(catalog);

  function find(text: string) {
    for (const c of compiled) {
      const m = c.re.exec(text);
      if (m) return { ...c, values: Object.fromEntries(c.names.map((n, i) => [n, m[i + 1]!])) };
    }
    return null;
  }

  /** A placeholder value that is itself a known line (e.g. a meeting spot) is translated too. */
  function translateValue(value: string, target: string): string {
    const hit = find(value);
    return hit && hit.names.length === 0 ? (catalog[target]?.[hit.key] ?? value) : value;
  }

  function translateOne(text: string, targetCode: string, source?: string): TranslateResult {
    const target = baseLanguage(targetCode);
    const hit = find(text.trim());
    if (!hit) return { text, detectedSource: source ? baseLanguage(source) : null, unavailable: true };
    if (hit.lang === target) return { text, detectedSource: target };
    const template = catalog[target]?.[hit.key];
    if (template === undefined) return { text, detectedSource: hit.lang, unavailable: true };
    const out = template.replace(PLACEHOLDER, (_, name: string) => translateValue(hit.values[name] ?? '', target));
    return { text: out, detectedSource: hit.lang };
  }

  const translator: Translator = {
    name: 'stub',
    async translate({ target, source, texts }: TranslateBatch) {
      return texts.map(t => translateOne(t, target, source));
    },
  };

  return { translateOne, translator };
}
