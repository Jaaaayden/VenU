import { describe, expect, it, jest } from '@jest/globals';

import type { ChatMessage } from '@/features/volunteer/types';

import { createTranslationCache } from '../cache';
import { createTranslateClient, type Transport, type TranslateResult } from '../client';
import { MOCK_CATALOG } from '../local';
import { createStub } from '../stub';
import { needsTranslation, readingLanguage, viewOf } from '../use-translation';

// use-translation reads the profile, whose store uses AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise(r => setTimeout(r, 0));

describe('translate client', () => {
  it('sends calls from the same tick as one batch per language pair, in order', async () => {
    const transport = jest.fn<Transport>(async b => b.texts.map(t => ({ text: `${b.target}:${t}`, detectedSource: 'en' })));
    const translate = createTranslateClient(transport);
    const results = await Promise.all([
      translate({ text: 'a', target: 'es' }),
      translate({ text: 'b', target: 'es' }),
      translate({ text: 'c', target: 'ar', source: 'en' }),
    ]);
    expect(results.map(r => r.text)).toEqual(['es:a', 'es:b', 'ar:c']);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0]![0]).toEqual({ target: 'es', texts: ['a', 'b'] });
    expect(transport.mock.calls[1]![0]).toEqual({ target: 'ar', source: 'en', texts: ['c'] });
  });

  it('splits a batch at the server limit of 16 texts', async () => {
    const transport = jest.fn<Transport>(async b => b.texts.map(text => ({ text, detectedSource: null })));
    const translate = createTranslateClient(transport);
    await Promise.all(Array.from({ length: 20 }, (_, i) => translate({ text: `m${i}`, target: 'es' })));
    expect(transport.mock.calls.map(c => c[0].texts.length)).toEqual([16, 4]);
  });

  it('rejects every call in a batch when the transport fails', async () => {
    const translate = createTranslateClient(async () => { throw new Error('offline'); });
    await expect(Promise.all([translate({ text: 'a', target: 'es' }), translate({ text: 'b', target: 'es' })])).rejects.toThrow('offline');
  });
});

describe('translation cache', () => {
  const ok = (text: string): TranslateResult => ({ text, detectedSource: 'en' });

  it('translates a message once per target, however often it is asked', async () => {
    const translate = jest.fn(async (r: { text: string; target: string }) => ok(`${r.target}:${r.text}`));
    const cache = createTranslationCache(translate);
    cache.request('m1', { text: 'Hi', target: 'es' });
    cache.request('m1', { text: 'Hi', target: 'es' }); // while loading
    expect(cache.get('m1', 'es')).toEqual({ status: 'loading' });
    await flush();
    cache.request('m1', { text: 'Hi', target: 'es' }); // done
    expect(cache.get('m1', 'es')).toEqual({ status: 'done', result: ok('es:Hi') });
    cache.request('m1', { text: 'Hi', target: 'ar' }); // another language is its own entry
    await flush();
    cache.request('m1', { text: 'Hi', target: 'es' }); // switching back: still cached
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it('remembers a failure and retries only after the cooldown', async () => {
    let now = 1000;
    const translate = jest.fn(async () => { throw new Error('down'); });
    const cache = createTranslationCache(translate, { retryAfterMs: 30_000, now: () => now });
    cache.request('m1', { text: 'Hi', target: 'es' });
    await flush();
    expect(cache.get('m1', 'es')).toEqual({ status: 'error', at: 1000 });
    for (let i = 0; i < 5; i++) cache.request('m1', { text: 'Hi', target: 'es' });
    expect(translate).toHaveBeenCalledTimes(1);
    now += 30_000;
    cache.request('m1', { text: 'Hi', target: 'es' });
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it('notifies subscribers and drops the oldest entries past the cap', async () => {
    const cache = createTranslationCache(async r => ok(r.text), { max: 2 });
    const listener = jest.fn();
    cache.subscribe(listener);
    for (const id of ['a', 'b', 'c']) cache.request(id, { text: id, target: 'es' });
    await flush();
    expect(listener).toHaveBeenCalled();
    expect(cache.get('a', 'es')).toBeUndefined();
    expect(cache.get('c', 'es')?.status).toBe('done');
  });
});

describe('what a bubble shows', () => {
  const incoming: ChatMessage = { id: 'm1', from: 'volunteer', text: 'Got it, thanks!', sentAt: 0, lang: 'en' };
  const done = (result: TranslateResult) => ({ status: 'done' as const, result });

  it('skips yours and messages already in the reader’s language', () => {
    expect(needsTranslation({ ...incoming, from: 'me' }, 'es')).toBe(false);
    expect(needsTranslation(incoming, 'en')).toBe(false);
    expect(needsTranslation({ ...incoming, lang: undefined }, 'en')).toBe(true); // unknown: ask (detects the source)
    expect(viewOf(undefined, incoming, 'en')).toEqual({ kind: 'original' });
  });

  it('maps each state to translated, loading or a fallback', () => {
    expect(viewOf(undefined, incoming, 'es')).toEqual({ kind: 'loading' });
    expect(viewOf({ status: 'loading' }, incoming, 'es')).toEqual({ kind: 'loading' });
    expect(viewOf({ status: 'error', at: 0 }, incoming, 'es')).toEqual({ kind: 'failed' });
    expect(viewOf(done({ text: '¡Entendido!', detectedSource: 'en' }), incoming, 'es')).toEqual({ kind: 'translated', text: '¡Entendido!', source: 'en' });
    expect(viewOf(done({ text: incoming.text, detectedSource: 'en', refused: true }), incoming, 'es')).toEqual({ kind: 'failed' });
    expect(viewOf(done({ text: incoming.text, detectedSource: 'en', unsupported: true }), incoming, 'tl')).toEqual({ kind: 'unsupported' });
    expect(viewOf(done({ text: incoming.text, detectedSource: null, unavailable: true }), incoming, 'hi')).toEqual({ kind: 'unavailable' });
    // The provider found it was already in the reader's language.
    expect(viewOf(done({ text: 'Hola', detectedSource: 'es' }), { ...incoming, text: 'Hola', lang: undefined }, 'es')).toEqual({ kind: 'original' });
  });

  it('reads ASL users’ messages in English and drops regions', () => {
    expect(readingLanguage('ase')).toBe('en');
    expect(readingLanguage('pt-BR')).toBe('pt');
    expect(readingLanguage('hi')).toBe('hi');
  });
});

describe('stub translator', () => {
  const stub = createStub(MOCK_CATALOG);
  const en = MOCK_CATALOG.en!;

  it('knows the canned volunteer lines in every locale', () => {
    for (const lang of Object.keys(MOCK_CATALOG)) {
      expect(stub.translateOne(en.reply1!, lang)).toEqual({ text: MOCK_CATALOG[lang]!.reply1, detectedSource: 'en' });
    }
  });

  it('fills in names and translates the meeting spot inside the greeting', () => {
    const greeting = en.greeting!.replace('{{name}}', 'Rosa').replace('{{volunteer}}', 'Daniel').replace('{{spot}}', en['spots.gate2Ramp']!);
    const out = stub.translateOne(greeting, 'es');
    expect(out.detectedSource).toBe('en');
    expect(out.text).toContain('Rosa');
    expect(out.text).toContain('Daniel');
    expect(out.text).toContain(MOCK_CATALOG.es!['spots.gate2Ramp']);
    expect(out.unavailable).toBeUndefined();
  });

  it('translates between any two locales and leaves same-language lines alone', () => {
    expect(stub.translateOne(MOCK_CATALOG.ko!.reply2!, 'fr').text).toBe(MOCK_CATALOG.fr!.reply2);
    expect(stub.translateOne(en.reply3!, 'en')).toEqual({ text: en.reply3, detectedSource: 'en' });
  });

  it('returns anything else unchanged, marked unavailable, as it does for untranslated targets', () => {
    expect(stub.translateOne('Where is the elevator?', 'es')).toEqual({ text: 'Where is the elevator?', detectedSource: null, unavailable: true });
    expect(stub.translateOne(en.reply1!, 'hi')).toEqual({ text: en.reply1, detectedSource: 'en', unavailable: true });
  });

  it('is deterministic', async () => {
    const batch = { target: 'ar', texts: [en.reply1!, en.reply2!] };
    expect(await stub.translator.translate(batch)).toEqual(await stub.translator.translate(batch));
  });
});
