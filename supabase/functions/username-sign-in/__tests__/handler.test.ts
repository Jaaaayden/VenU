/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

import { createHandler, httpPasswordGrant, type GrantResult } from '../handler.ts';

const SESSION = { access_token: 'at', refresh_token: 'rt' };

function setup() {
  const emailForUsername = jest.fn(async (name: string) => (name === 'rosa_m' ? 'rosa@example.com' : null));
  const passwordGrant = jest.fn(async (email: string, password: string, _ip: string | null): Promise<GrantResult> =>
    email === 'rosa@example.com' && password === 'right-pw'
      ? { ok: true, session: SESSION }
      : { ok: false, status: 400, code: 'invalid_credentials' });
  const log = jest.fn();
  return { handle: createHandler({ emailForUsername, passwordGrant, log }), emailForUsername, passwordGrant, log };
}

const call = (handle: (r: Request) => Promise<Response>, body: unknown, method = 'POST', headers: Record<string, string> = {}) =>
  handle(new Request('http://x/functions/v1/username-sign-in', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  }));

const WRONG = { code: 'invalid_credentials', message: 'Invalid login credentials' };

describe('username-sign-in function', () => {
  it('signs in by username (any case) and returns only the session', async () => {
    const { handle, emailForUsername, passwordGrant } = setup();
    const res = await call(handle, { username: '  Rosa_M ', password: 'right-pw' }, 'POST', { 'X-Forwarded-For': '203.0.113.7, 10.0.0.1' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(SESSION);
    expect(JSON.stringify(body)).not.toContain('rosa@example.com');
    expect(emailForUsername).toHaveBeenCalledWith('rosa_m');
    // The caller's IP goes to Auth so its per-IP rate limit counts the caller, not the function.
    expect(passwordGrant).toHaveBeenCalledWith('rosa@example.com', 'right-pw', '203.0.113.7');
  });

  it('words a wrong password like Auth does', async () => {
    const { handle } = setup();
    const res = await call(handle, { username: 'rosa_m', password: 'wrong' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(WRONG);
  });

  it('words an unknown username exactly like a wrong password, without trying to sign in', async () => {
    const { handle, passwordGrant } = setup();
    const res = await call(handle, { username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(WRONG);
    expect(passwordGrant).not.toHaveBeenCalled();
  });

  it.each([['an email', 'rosa@example.com'], ['a malformed name', 'ro'], ['a name with other characters', 'rosa m!']])(
    'treats %s as no such username, without a lookup', async (_, username) => {
      const { handle, emailForUsername, passwordGrant } = setup();
      const res = await call(handle, { username, password: 'right-pw' });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual(WRONG);
      expect(emailForUsername).not.toHaveBeenCalled();
      expect(passwordGrant).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['not JSON', '{'],
    ['null', null],
    ['no password', { username: 'rosa_m' }],
    ['a non-string username', { username: 42, password: 'pw' }],
    ['an empty username', { username: '  ', password: 'pw' }],
    ['an empty password', { username: 'rosa_m', password: '' }],
    ['a huge password', { username: 'rosa_m', password: 'x'.repeat(1001) }],
  ])('rejects %s with 400 bad_request', async (_, body) => {
    const { handle, emailForUsername } = setup();
    const res = await call(handle, body);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('bad_request');
    expect(emailForUsername).not.toHaveBeenCalled();
  });

  it('passes on Auth refusals the app explains (unconfirmed email, rate limit)', async () => {
    const { handle, passwordGrant } = setup();
    passwordGrant.mockResolvedValueOnce({ ok: false, status: 400, code: 'email_not_confirmed' });
    expect(await (await call(handle, { username: 'rosa_m', password: 'right-pw' })).json()).toEqual({ code: 'email_not_confirmed', message: 'Email not confirmed' });
    passwordGrant.mockResolvedValueOnce({ ok: false, status: 429, code: 'over_request_rate_limit' });
    const limited = await call(handle, { username: 'rosa_m', password: 'right-pw' });
    expect(limited.status).toBe(429);
    expect((await limited.json()).code).toBe('over_request_rate_limit');
  });

  it('answers 502 when the lookup or Auth fails, logging neither email nor password', async () => {
    const { handle, emailForUsername, passwordGrant, log } = setup();
    emailForUsername.mockRejectedValueOnce(new Error('db down'));
    expect((await call(handle, { username: 'rosa_m', password: 'right-pw' })).status).toBe(502);
    passwordGrant.mockResolvedValueOnce({ ok: false, status: 500, code: 'unexpected_failure' });
    const res = await call(handle, { username: 'rosa_m', password: 'right-pw' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('rosa@example.com');
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).not.toContain('rosa@example.com');
    expect(logged).not.toContain('right-pw');
  });

  it('answers CORS preflight and refuses other methods', async () => {
    const { handle } = setup();
    const pre = await call(handle, null, 'OPTIONS');
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await call(handle, null, 'GET')).status).toBe(405);
  });
});

describe('httpPasswordGrant', () => {
  it('posts to Auth with the key and the forwarded IP, and returns the tokens', async () => {
    const fetchFn = jest.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ ...SESSION, user: { email: 'rosa@example.com' } }), { status: 200 }));
    const grant = httpPasswordGrant('https://p.supabase.co/', 'sb_secret_x', fetchFn as unknown as typeof fetch);
    expect(await grant('rosa@example.com', 'pw', '203.0.113.7')).toEqual({ ok: true, session: SESSION });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://p.supabase.co/auth/v1/token?grant_type=password');
    expect(init.headers).toMatchObject({ apikey: 'sb_secret_x', 'Sb-Forwarded-For': '203.0.113.7' });
    expect(JSON.parse(String(init.body))).toEqual({ email: 'rosa@example.com', password: 'pw' });
  });

  it("reports Auth's error code", async () => {
    const fetchFn = async () => new Response(JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }), { status: 400 });
    const grant = httpPasswordGrant('https://p.supabase.co', 'k', fetchFn as unknown as typeof fetch);
    expect(await grant('a@b.c', 'pw', null)).toEqual({ ok: false, status: 400, code: 'invalid_credentials' });
  });
});
