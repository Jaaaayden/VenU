/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

import { MAX_BATCH, MAX_TEXT_CHARS, MAX_TOTAL_CHARS, parseBatch, type Translator } from '../core.ts';
import { chooseProvider, createHandler } from '../handler.ts';

const echo: Translator = { name: 'stub', translate: async b => b.texts.map(t => ({ text: `[${b.target}] ${t}`, detectedSource: 'en' })) };

function setup(translator: Translator | null = echo) {
  const verifyUser = jest.fn(async (token: string) => (token === 'good' ? 'user-1' : null));
  const log = jest.fn();
  return { handle: createHandler({ verifyUser, translator, log }), verifyUser, log };
}

const call = (handle: (r: Request) => Promise<Response>, body: unknown, token: string | null = 'good', method = 'POST') =>
  handle(new Request('http://x/functions/v1/translate', {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  }));

describe('translate function', () => {
  it('translates for a signed-in user', async () => {
    const { handle } = setup();
    const res = await call(handle, { target: 'es', texts: ['Hi'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: 'stub', translations: [{ text: '[es] Hi', detectedSource: 'en' }] });
  });

  it('rejects requests without a token or with one that is not a signed-in user', async () => {
    const { handle, verifyUser } = setup();
    expect((await call(handle, { target: 'es', texts: ['Hi'] }, null)).status).toBe(401);
    expect((await call(handle, { target: 'es', texts: ['Hi'] }, 'anon-key-jwt')).status).toBe(401);
    expect(verifyUser).toHaveBeenCalledWith('anon-key-jwt');
  });

  it('treats a verifier that throws as signed out', async () => {
    const handle = createHandler({ verifyUser: async () => { throw new Error('jwks down'); }, translator: echo });
    expect((await call(handle, { target: 'es', texts: ['Hi'] })).status).toBe(401);
  });

  it.each([
    ['not JSON', '{'],
    ['no target', { texts: ['a'] }],
    ['a bad target', { target: 'Spanish', texts: ['a'] }],
    ['a bad source', { target: 'es', source: 42, texts: ['a'] }],
    ['no texts', { target: 'es', texts: [] }],
    ['a non-string text', { target: 'es', texts: [1] }],
    ['a text over the limit', { target: 'es', texts: ['x'.repeat(MAX_TEXT_CHARS + 1)] }],
    ['too many texts', { target: 'es', texts: Array.from({ length: MAX_BATCH + 1 }, () => 'a') }],
    ['too many characters in all', { target: 'es', texts: Array.from({ length: 5 }, () => 'x'.repeat(MAX_TOTAL_CHARS / 4)) }],
  ])('rejects %s with 400', async (_, body) => {
    const { handle } = setup();
    const res = await call(handle, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it('accepts texts right at the limits', () => {
    expect(parseBatch({ target: 'es', texts: ['x'.repeat(MAX_TEXT_CHARS)] }).ok).toBe(true);
    expect(parseBatch({ target: 'pt-BR', source: 'en', texts: Array.from({ length: MAX_BATCH }, () => 'a') }).ok).toBe(true);
  });

  it('answers CORS preflight and refuses other methods', async () => {
    const { handle } = setup();
    expect((await call(handle, null, null, 'OPTIONS')).status).toBe(204);
    expect((await call(handle, null, 'good', 'GET')).status).toBe(405);
  });

  it('skips the provider when source and target match', async () => {
    const translate = jest.fn(echo.translate);
    const { handle } = setup({ name: 'deepl', translate });
    const res = await call(handle, { target: 'es', source: 'es-MX', texts: ['Hola'] });
    expect(await res.json()).toEqual({ provider: 'deepl', translations: [{ text: 'Hola', detectedSource: 'es' }] });
    expect(translate).not.toHaveBeenCalled();
  });

  it('returns 502 when the provider fails, without logging the message text', async () => {
    const { handle, log } = setup({ name: 'anthropic', translate: async () => { throw new Error('529 overloaded'); } });
    const res = await call(handle, { target: 'es', texts: ['my secret message'] });
    expect(res.status).toBe(502);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('529 overloaded'));
    expect(JSON.stringify(log.mock.calls)).not.toContain('my secret message');
  });

  it('returns 503 when no provider is configured', async () => {
    const { handle } = setup(null);
    expect((await call(handle, { target: 'es', texts: ['Hi'] })).status).toBe(503);
  });
});

describe('provider choice', () => {
  const client = () => ({ messages: { create: jest.fn<never>() } });

  it('picks the provider named by TRANSLATE_PROVIDER when its key is set', () => {
    const a = chooseProvider({ TRANSLATE_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-x' }, client);
    expect(a.ok && a.translator.name).toBe('anthropic');
    const d = chooseProvider({ TRANSLATE_PROVIDER: ' DeepL ', DEEPL_API_KEY: 'k:fx' }, client);
    expect(d.ok && d.translator.name).toBe('deepl');
  });

  it('explains what is missing', () => {
    expect(chooseProvider({}, client)).toEqual({ ok: false, reason: 'TRANSLATE_PROVIDER is not set' });
    expect(chooseProvider({ TRANSLATE_PROVIDER: 'deepl' }, client)).toEqual({ ok: false, reason: expect.stringContaining('DEEPL_API_KEY') });
    expect(chooseProvider({ TRANSLATE_PROVIDER: 'anthropic', DEEPL_API_KEY: 'x' }, client)).toEqual({ ok: false, reason: expect.stringContaining('ANTHROPIC_API_KEY') });
    expect(chooseProvider({ TRANSLATE_PROVIDER: 'google' }, client)).toEqual({ ok: false, reason: expect.stringContaining('google') });
  });
});
