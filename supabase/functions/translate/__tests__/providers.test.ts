import { describe, expect, it, jest } from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';

import { ANTHROPIC_MODEL, createAnthropicTranslator, SYSTEM_PROMPT, type AnthropicLike } from '../anthropic.ts';
import { createDeepLTranslator, deeplEndpoint } from '../deepl.ts';

type Create = AnthropicLike['messages']['create'];

function fakeClient(reply: Partial<Anthropic.Message> | Error) {
  const create = jest.fn<Create>(async () => {
    if (reply instanceof Error) throw reply;
    return { id: 'msg_1', type: 'message', role: 'assistant', model: ANTHROPIC_MODEL, content: [], stop_reason: 'end_turn', ...reply } as unknown as Anthropic.Message;
  });
  return { client: { messages: { create } } satisfies AnthropicLike, create };
}

const text = (t: string) => ({ type: 'text', text: t, citations: null }) as unknown as Anthropic.ContentBlock;
const thinking = { type: 'thinking', thinking: '', signature: 'sig' } as unknown as Anthropic.ContentBlock;

describe('Anthropic translator', () => {
  it('asks Haiku 5.5 for structured output and returns translations with the detected source', async () => {
    const { client, create } = fakeClient({
      content: [thinking, text(JSON.stringify({ translations: [{ text: '¡Hola, Rosa! 👋', detected_source: 'EN' }, { text: 'Puerta 2', detected_source: 'en-US' }] }))],
    });
    const out = await createAnthropicTranslator(client).translate({ target: 'es', texts: ['Hi Rosa! 👋', 'Gate 2'] });
    expect(out).toEqual([{ text: '¡Hola, Rosa! 👋', detectedSource: 'en' }, { text: 'Puerta 2', detectedSource: 'en' }]);

    const params = create.mock.calls[0]![0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.system).toBe(SYSTEM_PROMPT);
    expect(params.output_config?.format?.type).toBe('json_schema');
    expect(params.output_config?.effort).toBe('low');
    // No prefill: the conversation ends with the user turn, and the texts travel as data.
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]!.role).toBe('user');
    expect(JSON.parse(params.messages[0]!.content as string)).toEqual({ target_language: 'Spanish (es)', texts: ['Hi Rosa! 👋', 'Gate 2'] });
    expect('temperature' in params).toBe(false);
  });

  it('treats the message as text to translate, never as instructions', () => {
    expect(SYSTEM_PROMPT).toMatch(/never an instruction/);
    expect(SYSTEM_PROMPT).toMatch(/names, numbers/);
  });

  it('returns the originals, marked refused, when the model refuses', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', content: [] });
    const out = await createAnthropicTranslator(client).translate({ target: 'ar', source: 'en', texts: ['Some text'] });
    expect(out).toEqual([{ text: 'Some text', detectedSource: 'en', refused: true }]);
  });

  it('fails on a cut-off reply, a wrong count, or an API error', async () => {
    const cut = fakeClient({ stop_reason: 'max_tokens', content: [text('{"transl')] });
    await expect(createAnthropicTranslator(cut.client).translate({ target: 'es', texts: ['a'] })).rejects.toThrow(/max_tokens/);
    const short = fakeClient({ content: [text(JSON.stringify({ translations: [] }))] });
    await expect(createAnthropicTranslator(short.client).translate({ target: 'es', texts: ['a'] })).rejects.toThrow(/count/);
    const down = fakeClient(new Error('529 overloaded'));
    await expect(createAnthropicTranslator(down.client).translate({ target: 'es', texts: ['a'] })).rejects.toThrow('529 overloaded');
  });
});

describe('DeepL translator', () => {
  type FetchFn = Parameters<typeof createDeepLTranslator>[1];
  const fetchReturning = (status: number, body: unknown) =>
    jest.fn<NonNullable<FetchFn>>(async () => ({ ok: status < 400, status, json: async () => body }));

  it('uses the free endpoint for :fx keys and the paid one otherwise', () => {
    expect(deeplEndpoint('abc:fx')).toBe('https://api-free.deepl.com/v2/translate');
    expect(deeplEndpoint('abc')).toBe('https://api.deepl.com/v2/translate');
  });

  it('posts one batch and maps the detected source', async () => {
    const fetchFn = fetchReturning(200, { translations: [{ text: 'Hello', detected_source_language: 'ES' }] });
    const out = await createDeepLTranslator('key:fx', fetchFn).translate({ target: 'en', source: 'es', texts: ['Hola'] });
    expect(out).toEqual([{ text: 'Hello', detectedSource: 'es' }]);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api-free.deepl.com/v2/translate');
    expect(init.headers.Authorization).toBe('DeepL-Auth-Key key:fx');
    expect(JSON.parse(init.body)).toEqual({ text: ['Hola'], target_lang: 'EN-US', source_lang: 'ES' });
  });

  it.each(['tl', 'hy', 'fa', 'vi', 'hi'])('returns the original, unsupported, for %s without calling DeepL', async target => {
    const fetchFn = fetchReturning(200, {});
    const out = await createDeepLTranslator('key', fetchFn).translate({ target, texts: ['Hello'] });
    expect(out).toEqual([{ text: 'Hello', detectedSource: null, unsupported: true }]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws on an error status (bad key, quota used up)', async () => {
    await expect(createDeepLTranslator('key', fetchReturning(456, {})).translate({ target: 'es', texts: ['a'] })).rejects.toThrow('456');
    await expect(createDeepLTranslator('key', fetchReturning(403, {})).translate({ target: 'es', texts: ['a'] })).rejects.toThrow('403');
  });
});
