// A small stand-in for Supabase (auth, the `profiles` table, the `avatars` bucket) for testing on
// your own machine without a real project. It mirrors the rules in supabase/migrations: users see
// and change only their own row, can't change role or verified, and keep photos in their own folder.
// Sign-ups start unverified, as on the real project; only the verify hook below (the dashboard,
// live) verifies a volunteer, and unverified volunteers can't accept requests.
// Started by `npm run dev:mock`; see scripts/dev.mjs.
//
// It also serves the `translate` Edge Function (POST /functions/v1/translate), running the same code
// as supabase/functions/translate. Without keys it uses the offline stub; with TRANSLATE_PROVIDER and
// a key in .env.server.local (git-ignored, never bundled into the app) it calls the real provider:
//   TRANSLATE_PROVIDER=anthropic            or   TRANSLATE_PROVIDER=deepl
//   ANTHROPIC_API_KEY=sk-ant-...                 DEEPL_API_KEY=...:fx
//
// Test hooks: GET /__state (everything stored), POST /__control { dropNextProfileWrite: n }
// (drop the next n profile-save responses, to test lost connections), { failTranslate: n } (the next
// n translate calls fail), { translateDelayMs: ms } (slow translations), { clockOffsetMs: ms } (move the
// clock used for how long a sign-up has waited unconfirmed, e.g. 2h to free its username),
// { verify: 'sam_helps' } (verify a volunteer by username or email, as LA28 staff do in the dashboard;
// add verified: false to take it back), GET /__confirm?email=...
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SERVER_ENV_FILE = join(ROOT, '.env.server.local');

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// profiles columns from 20261118020000_volunteer_settings_verified.sql.
const AVAILABILITIES = ['free', 'busy', 'off'];
const NOTIFICATION_KINDS = ['volunteer', 'chat', 'venue', 'reports'];
const DEFAULT_NOTIFICATION_PREFS = { volunteer: true, chat: true, venue: true, reports: true };
// Saved state from before verified was enforced: its volunteers were made when anyone could accept,
// so they load verified (keeps the demo's volunteer working). Later sign-ups start unverified.
const VERIFIED_RULE = 1;

// Below 49152 on purpose: Windows (Hyper-V, WSL, Docker) reserves blocks of 49152-65535 that move
// between reboots, and a reserved port fails with EACCES. 54330 was inside one of those blocks.
export const MOCK_SUPABASE_PORT = 47330;

/**
 * @param {{ port: number, confirmEmail?: boolean, stateFile?: string, log?: (line: string) => void }} options
 *   confirmEmail: sign-up sends a (printed) confirmation link instead of signing straight in.
 *   stateFile: keep accounts, profiles and photos here between runs.
 */
export function startMockSupabase({ port, confirmEmail = false, stateFile, log = console.log }) {
  const users = new Map(); // email -> { id, email, password, confirmed, createdAt, username?, wantedUsername? }
  const profiles = new Map(); // user id -> row
  const files = new Map(); // path -> { bytes: Buffer, type }
  const refreshTokens = new Map(); // token -> user id
  const requests = [];
  const control = { dropNextProfileWrite: 0, failTranslate: 0, translateDelayMs: 0, clockOffsetMs: 0 };
  const now = () => Date.now() + control.clockOffsetMs;

  if (stateFile && existsSync(stateFile)) {
    try {
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      for (const u of saved.users ?? []) users.set(u.email, u);
      const grandfather = (saved.verifiedRule ?? 0) < VERIFIED_RULE;
      for (const p of saved.profiles ?? []) {
        // Rows from before the settings columns get their defaults, as `add column ... default` does.
        const row = { availability: 'free', availability_updated_at: p.created_at ?? null, notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS }, ...p };
        profiles.set(p.id, grandfather && p.role === 'volunteer' ? { ...row, verified: true } : row);
      }
      for (const [path, f] of Object.entries(saved.files ?? {})) files.set(path, { bytes: Buffer.from(f.bytes, 'base64'), type: f.type });
      for (const [token, id] of Object.entries(saved.refreshTokens ?? {})) refreshTokens.set(token, id);
    } catch {
      log(`mock supabase: couldn't read ${stateFile}, starting empty`);
    }
  }
  function persist() {
    if (!stateFile) return;
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify({
      users: [...users.values()],
      profiles: [...profiles.values()],
      files: Object.fromEntries([...files].map(([path, f]) => [path, { bytes: f.bytes.toString('base64'), type: f.type }])),
      refreshTokens: Object.fromEntries(refreshTokens),
      verifiedRule: VERIFIED_RULE,
    }));
  }

  const b64url = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const publicUser = u => ({
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
    email_confirmed_at: u.confirmed ? '2026-11-09T00:00:00Z' : null,
    app_metadata: { provider: 'email' }, user_metadata: u.username ? { username: u.username } : {},
    created_at: new Date(u.createdAt ?? Date.parse('2026-11-09T00:00:00Z')).toISOString(),
  });
  // Mirrors public.usernames (supabase/migrations/20261116000000_usernames.sql and
  // 20261116120000_free_unconfirmed_usernames.sql).
  const normalUsername = name => (typeof name === 'string' ? name.trim().toLowerCase() : '');
  const userByUsername = name => [...users.values()].find(u => u.username && u.username === normalUsername(name));
  let usernameSignIn = null; // the username-sign-in function's handler, loaded on first use
  // A name an unconfirmed sign-up has held for over an hour is free. (Saved users from before
  // createdAt was kept count as old.)
  const USERNAME_HOLD_MS = 60 * 60 * 1000;
  const holdsUsername = u => u.confirmed || now() - (u.createdAt ?? 0) < USERNAME_HOLD_MS;
  const usernameTaken = name => {
    const holder = userByUsername(name);
    return !!holder && holdsUsername(holder);
  };
  // Supabase Auth stores and matches emails in lower case: "Rosa@Example.com" signs in as rosa@example.com.
  const normalEmail = email => (typeof email === 'string' ? email.trim().toLowerCase() : '');
  function session(user) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const refresh_token = randomUUID();
    refreshTokens.set(refresh_token, user.id);
    persist();
    return {
      access_token: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.mock`,
      token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token, user: publicUser(user),
    };
  }
  /** The signed-in user's id, or null. Tokens for users that no longer exist don't count. */
  function userIdOf(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    return m ? userIdOfToken(m[1]) : null;
  }
  function userIdOfToken(token) {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      if (claims.exp * 1000 < Date.now()) return null;
      return [...users.values()].some(u => u.id === claims.sub) ? claims.sub : null;
    } catch {
      return null;
    }
  }
  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(body === undefined ? '' : JSON.stringify(body));
  }
  const authErr = (res, status, code, message) => send(res, status, { code, error_code: code, msg: message, message });
  const pgErr = (res, status, code, message) => send(res, status, { code, message, details: null, hint: null });

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    if (req.method === 'OPTIONS') return send(res, 204);

    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://mock');
    const p = url.pathname;
    const json = () => { try { return JSON.parse(raw.toString() || 'null'); } catch { return null; } };
    requests.push(`${req.method} ${p}${url.search}`);
    const uid = userIdOf(req);

    // ---- test hooks
    if (p === '/__state') {
      return send(res, 200, { users: [...users.values()].map(u => ({ id: u.id, email: u.email, confirmed: u.confirmed, username: u.username ?? null })), profiles: [...profiles.values()], files: [...files.keys()], log: requests });
    }
    if (p === '/__control') {
      const { verify, verified = true, ...rest } = json() ?? {};
      if (verify !== undefined) {
        // By username or email, like the dashboard's Table Editor (which runs as postgres, past the guard).
        const user = userByUsername(verify) ?? users.get(normalEmail(verify));
        const row = user && profiles.get(user.id);
        if (!row) return send(res, 404, { error: `no profile for ${verify}` });
        row.verified = verified === true;
        row.updated_at = new Date().toISOString();
        persist();
        log(`mock supabase: ${user.username ?? user.email} is ${row.verified ? 'verified' : 'unverified'}`);
      }
      Object.assign(control, rest);
      return send(res, 200, control);
    }
    if (p === '/__confirm') {
      const user = users.get(normalEmail(url.searchParams.get('email')));
      if (user && !user.confirmed) {
        user.confirmed = true;
        // reclaim_username_on_confirm: a name lost while unconfirmed comes back if still free, else it's dropped.
        if (user.wantedUsername && !user.username && !userByUsername(user.wantedUsername)) user.username = user.wantedUsername;
        delete user.wantedUsername;
        persist();
      }
      res.writeHead(user ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(user ? `<p style="font:16px system-ui">Email confirmed for ${user.email}. Go back to VenU and sign in.</p>` : 'No account with that email.');
    }

    // ---- the translate Edge Function
    if (p === '/functions/v1/translate') {
      const handle = await translate;
      if (!handle) return send(res, 503, { error: 'Translation needs Node 22.18 or newer in mock mode.' });
      const headers = Object.entries(req.headers).filter(([, v]) => typeof v === 'string');
      const reply = await handle(new Request(`http://mock${req.url}`, { method: req.method, headers, body: req.method === 'POST' ? raw : undefined }));
      res.writeHead(reply.status, Object.fromEntries(reply.headers));
      return res.end(Buffer.from(await reply.arrayBuffer()));
    }

    // ---- auth
    if (p === '/auth/v1/signup' && req.method === 'POST') {
      const { email: typed, password, data } = json() ?? {};
      const email = normalEmail(typed);
      if (users.has(email)) return authErr(res, 422, 'user_already_exists', 'User already registered');
      const username = normalUsername(data?.username) || undefined;
      // The claim_username trigger: a taken or malformed name fails the whole sign-up.
      if (username && (usernameTaken(username) || !/^[a-z0-9_.]{3,20}$/.test(username)))
        return authErr(res, 500, 'unexpected_failure', 'Database error saving new user');
      // It frees the name from an unconfirmed sign-up that held it for over an hour.
      const stale = username && userByUsername(username);
      if (stale) { stale.wantedUsername = stale.username; delete stale.username; }
      const user = { id: randomUUID(), email, password, confirmed: !confirmEmail, createdAt: now(), username };
      users.set(email, user);
      persist();
      if (!confirmEmail) return send(res, 200, session(user));
      log(`\n  Confirmation "email" for ${email}: http://localhost:${port}/__confirm?email=${encodeURIComponent(email)}\n`);
      return send(res, 200, publicUser(user)); // a user but no session: the app shows "Check your email"
    }
    if (p === '/auth/v1/token' && req.method === 'POST') {
      const body = json() ?? {};
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const user = users.get(normalEmail(body.email));
        if (!user || user.password !== body.password) return authErr(res, 400, 'invalid_credentials', 'Invalid login credentials');
        if (!user.confirmed) return authErr(res, 400, 'email_not_confirmed', 'Email not confirmed');
        return send(res, 200, session(user));
      }
      if (grant === 'refresh_token') {
        const id = refreshTokens.get(body.refresh_token);
        const user = [...users.values()].find(u => u.id === id);
        if (!user) return authErr(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        refreshTokens.delete(body.refresh_token);
        return send(res, 200, session(user));
      }
    }
    if (p === '/auth/v1/logout' && req.method === 'POST') {
      // Default scope is global: every session of this user ends.
      for (const [token, id] of refreshTokens) if (id === uid) refreshTokens.delete(token);
      persist();
      return send(res, 204);
    }
    if (p === '/auth/v1/user' && req.method === 'GET') {
      const user = [...users.values()].find(u => u.id === uid);
      return user ? send(res, 200, publicUser(user)) : authErr(res, 401, 'bad_jwt', 'invalid JWT');
    }

    // ---- username functions. username_available is callable signed out (Create Account needs it);
    // email_for_username is service role only (20261117000000_private_username_lookup.sql), so Sign
    // In by username goes through the username-sign-in Edge Function, the same code as
    // supabase/functions/username-sign-in, which looks the email up here and never returns it.
    if (p === '/rest/v1/rpc/email_for_username' && req.method === 'POST') {
      return pgErr(res, uid ? 403 : 401, '42501', 'permission denied for function email_for_username');
    }
    if (p === '/functions/v1/username-sign-in') {
      usernameSignIn ??= importShared('supabase/functions/username-sign-in/handler.ts').then(({ createHandler, httpPasswordGrant }) => createHandler({
        emailForUsername: async name => userByUsername(name)?.email ?? null,
        // Auth's password grant on this same server, as the real function calls Supabase Auth.
        passwordGrant: httpPasswordGrant(`http://localhost:${port}`, 'mock-secret-key'),
        log: line => log(`mock supabase: ${line}`),
      })).catch(e => {
        log(`mock supabase: username sign-in is off (${e.message}). It needs Node 22.18+, which loads the shared .ts files.`);
        return null;
      });
      const handle = await usernameSignIn;
      if (!handle) return send(res, 503, { code: 'unexpected_failure', message: 'Username sign-in needs Node 22.18 or newer in mock mode.' });
      const headers = Object.entries(req.headers).filter(([, v]) => typeof v === 'string');
      const reply = await handle(new Request(`http://mock${req.url}`, { method: req.method, headers, body: req.method === 'POST' ? raw : undefined }));
      res.writeHead(reply.status, Object.fromEntries(reply.headers));
      return res.end(Buffer.from(await reply.arrayBuffer()));
    }
    if (p === '/rest/v1/rpc/username_available' && req.method === 'POST') {
      return send(res, 200, !usernameTaken(json()?.p_username));
    }

    // ---- the profiles table
    if (p === '/rest/v1/profiles') {
      if (!uid) return pgErr(res, 401, 'PGRST301', 'JWT expired');
      const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object');
      const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
      const reply = (rows, status = 200) => {
        if (!wantsObject) return send(res, status, rows);
        if (rows.length !== 1) return pgErr(res, 406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
        return send(res, status, rows[0]);
      };
      const checkRow = r => {
        if (r.avatar_path != null && !new RegExp(`^${r.id}/[A-Za-z0-9._-]+$`).test(r.avatar_path)) return 'new row for relation "profiles" violates check constraint "avatar_path_own_folder"';
        if (!Array.isArray(r.languages) || !r.languages.includes(r.main_language)) return 'new row for relation "profiles" violates check constraint "main_language_listed"';
        if (!AVAILABILITIES.includes(r.availability)) return 'new row for relation "profiles" violates check constraint "profiles_availability_check"';
        const prefs = r.notification_prefs;
        if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs) || Object.entries(prefs).some(([k, v]) => !NOTIFICATION_KINDS.includes(k) || typeof v !== 'boolean'))
          return 'new row for relation "profiles" violates check constraint "notification_prefs_shape"';
        return null;
      };
      // Simulates a lost connection: the write is saved but the app never hears back.
      const dropResponse = () => {
        if (control.dropNextProfileWrite <= 0) return false;
        control.dropNextProfileWrite -= 1;
        requests.push('  (response dropped)');
        req.socket.destroy();
        return true;
      };
      if (req.method === 'GET') {
        const own = [...profiles.values()].filter(r => r.id === uid && (!idEq || r.id === idEq));
        const cols = url.searchParams.get('select');
        return reply(cols && cols !== '*' ? own.map(r => Object.fromEntries(cols.split(',').map(c => [c, r[c]]))) : own);
      }
      if (req.method === 'POST') {
        const body = json();
        const row = Array.isArray(body) ? body[0] : body;
        if (row?.id !== uid) return pgErr(res, 403, '42501', 'new row violates row-level security policy for table "profiles"');
        if (profiles.has(row.id)) return pgErr(res, 409, '23505', 'duplicate key value violates unique constraint "profiles_pkey"');
        const now = new Date().toISOString();
        // The profiles_guard trigger: a client's verified always comes out false, and the server stamps the time.
        const full = {
          availability: 'free', notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS },
          ...row, verified: false, availability_updated_at: now, created_at: now, updated_at: now,
        };
        const bad = checkRow(full);
        if (bad) return pgErr(res, 400, '23514', bad);
        profiles.set(row.id, full);
        persist();
        if (dropResponse()) return;
        return reply([full], 201);
      }
      if (req.method === 'PATCH') {
        const body = json() ?? {};
        if (['role', 'verified', 'id', 'availability_updated_at'].some(k => k in body)) return pgErr(res, 403, '42501', 'permission denied for table profiles');
        const existing = idEq === uid ? profiles.get(uid) : undefined;
        if (!existing) return reply([]);
        const at = new Date().toISOString();
        const next = { ...existing, ...body, updated_at: at };
        if (existing.availability !== next.availability) next.availability_updated_at = at;
        const bad = checkRow(next);
        if (bad) return pgErr(res, 400, '23514', bad);
        profiles.set(uid, next);
        persist();
        if (dropResponse()) return;
        return reply([next]);
      }
      if (req.method === 'DELETE') {
        if (idEq === uid) { profiles.delete(uid); persist(); }
        return send(res, 204);
      }
    }

    // ---- help requests and chat (see handleHelpRequests below)
    if (handleHelpRequests({ req, res, p, url, body: json, uid, profiles, send, pgErr })) return;

    // ---- the avatars bucket (private: owners only)
    const ownPath = path => path.split('/')[0] === uid;
    let m;
    if ((m = /^\/storage\/v1\/object\/avatars\/(.+)$/.exec(p)) && (req.method === 'POST' || req.method === 'PUT')) {
      const path = decodeURIComponent(m[1]);
      if (!uid || !ownPath(path)) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      if (files.has(path) && req.headers['x-upsert'] !== 'true') return send(res, 409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
      if (raw.length > MAX_PHOTO_BYTES) return send(res, 413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
      files.set(path, { bytes: raw, type: req.headers['content-type'] ?? 'application/octet-stream' });
      persist();
      return send(res, 200, { Key: `avatars/${path}`, Id: randomUUID() });
    }
    if ((m = /^\/storage\/v1\/object\/sign\/avatars\/(.+)$/.exec(p)) && req.method === 'POST') {
      const path = decodeURIComponent(m[1]);
      if (!uid || !ownPath(path) || !files.has(path)) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      return send(res, 200, { signedURL: `/object/sign/avatars/${path}?token=${randomUUID()}` });
    }
    if ((m = /^\/storage\/v1\/object\/sign\/avatars\/(.+)$/.exec(p)) && req.method === 'GET') {
      const f = files.get(decodeURIComponent(m[1]));
      if (!f) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      res.writeHead(200, { 'content-type': f.type });
      return res.end(f.bytes);
    }
    if (p === '/storage/v1/object/list/avatars' && req.method === 'POST') {
      const { prefix = '', limit = 100, offset = 0 } = json() ?? {};
      if (!uid || prefix.replace(/\/$/, '') !== uid) return send(res, 200, []);
      const names = [...files.keys()].filter(k => k.startsWith(`${uid}/`)).map(k => k.slice(uid.length + 1)).sort();
      return send(res, 200, names.slice(offset, offset + limit).map(name => ({ name, id: randomUUID(), metadata: {} })));
    }
    if (p === '/storage/v1/object/avatars' && req.method === 'DELETE') {
      const { prefixes = [] } = json() ?? {};
      const gone = prefixes.filter(k => ownPath(k) && files.delete(k)).map(name => ({ name }));
      persist();
      return send(res, 200, gone);
    }

    requests.push('  (no route)');
    send(res, 404, { message: `mock supabase: no route for ${req.method} ${p}` });
  });

  const translate = createTranslate({ verifyUser: async token => userIdOfToken(token), control, log }).catch(e => {
    log(`mock supabase: translate is off (${e.message}). It needs Node 22.18+, which loads the shared .ts files.`);
    return null;
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

// ---- help requests and chat: the help_requests and messages tables and their functions, with the
// rules of supabase/migrations/20261117010000_help_requests_chat.sql. Signed in only, tables and
// functions alike (20261118000000_db_hardening.sql took EXECUTE away from anon). One store per server (keyed
// by its profiles map), kept in memory only. There's no Realtime here: the app sees its channels fail
// and polls instead (src/features/volunteer/supabase-backend.ts).
// Test hooks: GET /__help (every request and message); POST /__help { rejectSends: true } makes
// message inserts fail (as RLS would), to try "Not sent · Tap to retry"; false turns that off.
const helpStores = new WeakMap();
const HELP_TYPE_IDS = ['physical', 'directions', 'language', 'quiet', 'lost', 'other'];
const HELP_ROUTES = new Set([
  '/__help', '/rest/v1/help_requests', '/rest/v1/messages', '/rest/v1/rpc/accept_help_request',
  '/rest/v1/rpc/close_help_request', '/rest/v1/rpc/release_help_request', '/rest/v1/rpc/open_help_requests',
]);
/** open_help_requests(): requests opened within this long are listed. */
const OPEN_WINDOW_MS = 5 * 60 * 1000;

/** PostgREST-style filters from the query string, e.g. status=eq.open&created_at=gte.2026-11-17T18:00:00Z. */
function rowFilter(url) {
  const tests = [];
  for (const [col, raw] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'columns'].includes(col)) continue;
    const dot = raw.indexOf('.');
    const op = raw.slice(0, dot);
    const v = raw.slice(dot + 1);
    const cmp = (a, b) => (a == null ? -1 : String(a) < b ? -1 : String(a) > b ? 1 : 0);
    if (op === 'eq') tests.push(r => String(r[col]) === v);
    else if (op === 'neq') tests.push(r => String(r[col]) !== v);
    else if (op === 'gt') tests.push(r => cmp(r[col], v) > 0);
    else if (op === 'gte') tests.push(r => cmp(r[col], v) >= 0);
    else if (op === 'lt') tests.push(r => cmp(r[col], v) < 0);
    else if (op === 'lte') tests.push(r => cmp(r[col], v) <= 0);
    else if (op === 'is') tests.push(r => (v === 'null' ? r[col] == null : String(r[col]) === v));
    else if (op === 'in') { const set = v.replace(/^\(|\)$/g, '').split(','); tests.push(r => set.includes(String(r[col]))); }
  }
  return row => tests.every(t => t(row));
}

/** order=created_at.desc and limit=n, as PostgREST applies them. */
function orderAndLimit(rows, url) {
  const order = url.searchParams.get('order');
  let out = [...rows];
  if (order) {
    const [col, dir] = order.split('.');
    out.sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -1 : String(a[col] ?? '') > String(b[col] ?? '') ? 1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  const limit = Number(url.searchParams.get('limit'));
  return limit > 0 ? out.slice(0, limit) : out;
}

/** Handles the help request routes; false for anything else. */
function handleHelpRequests({ req, res, p, url, body, uid, profiles, send, pgErr }) {
  if (!HELP_ROUTES.has(p)) return false;
  if (!helpStores.has(profiles)) helpStores.set(profiles, { requests: new Map(), messages: [], rejectSends: false });
  helpRoute({ req, res, p, url, body, uid, profiles, send, pgErr }, helpStores.get(profiles));
  return true;
}

function helpRoute({ req, res, p, url, body, uid, profiles, send, pgErr }, store) {
  if (p === '/__help') {
    if (req.method === 'POST') store.rejectSends = !!body()?.rejectSends;
    return send(res, 200, { requests: [...store.requests.values()], messages: store.messages, rejectSends: store.rejectSends });
  }
  if (!uid) return pgErr(res, 401, 'PGRST301', 'JWT expired');

  const isVolunteer = profiles.get(uid)?.role === 'volunteer';
  const canSee = r => r.visitor_id === uid || r.volunteer_id === uid || (r.status === 'open' && isVolunteer);
  const isParty = id => { const r = store.requests.get(id); return !!r && (r.visitor_id === uid || r.volunteer_id === uid); };
  // can_read_message: the visitor or the current volunteer, a message from one of them, sent since that volunteer accepted.
  const canRead = m => {
    const r = store.requests.get(m.request_id);
    if (!r || !r.matched_at || m.created_at < r.matched_at) return false;
    const parties = [r.visitor_id, r.volunteer_id];
    return parties.includes(uid) && parties.includes(m.sender_id);
  };
  const wantsRows = (req.headers.prefer ?? '').includes('return=representation');
  const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object');
  const rls = table => pgErr(res, 403, '42501', `new row violates row-level security policy for table "${table}"`);
  const reply = (rows, status = 200) => {
    if (!wantsObject) return send(res, status, rows);
    if (rows.length !== 1) return pgErr(res, 406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
    return send(res, status, rows[0]);
  };
  const now = () => new Date().toISOString();
  const input = body();

  if (p === '/rest/v1/help_requests') {
    if (req.method === 'GET') return reply(orderAndLimit([...store.requests.values()].filter(canSee).filter(rowFilter(url)), url));
    if (req.method === 'POST') {
      const row = Array.isArray(input) ? input[0] : input;
      const visitorId = row?.visitor_id ?? uid;
      const opensClean = (row?.status ?? 'open') === 'open'
        && ['volunteer_id', 'volunteer_name', 'volunteer_languages', 'volunteer_trainings', 'closed_by', 'matched_at', 'closed_at'].every(k => row?.[k] == null);
      if (!row || visitorId !== uid || !opensClean) return rls('help_requests');
      const types = row.help_types;
      if (!Array.isArray(types) || types.length < 1 || types.length > 6 || !types.every(t => HELP_TYPE_IDS.includes(t)) || !row.venue_id || !row.language)
        return pgErr(res, 400, '23514', 'new row for relation "help_requests" violates check constraint');
      const id = row.id ?? randomUUID();
      if (store.requests.has(id)) return pgErr(res, 409, '23505', 'duplicate key value violates unique constraint "help_requests_pkey"');
      const at = now();
      const full = {
        id, visitor_id: uid, visitor_name: String(row.visitor_name ?? '').slice(0, 40), venue_id: row.venue_id, spot: row.spot ?? null,
        help_types: types, note: String(row.note ?? '').slice(0, 500), language: row.language, status: 'open',
        volunteer_id: null, volunteer_name: null, volunteer_languages: null, volunteer_trainings: null,
        closed_by: null, created_at: at, opened_at: at, matched_at: null, closed_at: null,
      };
      store.requests.set(id, full);
      return wantsRows ? reply([full], 201) : send(res, 201);
    }
    return pgErr(res, 403, '42501', 'permission denied for table help_requests'); // no direct updates or deletes
  }

  if (p === '/rest/v1/messages') {
    if (req.method === 'GET') {
      const rows = store.messages.filter(canRead).filter(rowFilter(url));
      return reply(orderAndLimit(rows, url));
    }
    if (req.method === 'POST') {
      const row = Array.isArray(input) ? input[0] : input;
      const r = row && store.requests.get(row.request_id);
      if (store.rejectSends || !row || (row.sender_id ?? uid) !== uid || !isParty(row.request_id) || r?.status !== 'matched') return rls('messages');
      const text = String(row.text ?? '');
      if (text.length < 1 || text.length > 1000) return pgErr(res, 400, '23514', 'new row for relation "messages" violates check constraint');
      const full = { id: randomUUID(), request_id: row.request_id, sender_id: uid, text, language: row.language ?? null, created_at: now() };
      store.messages.push(full);
      return wantsRows ? reply([full], 201) : send(res, 201);
    }
    return pgErr(res, 403, '42501', 'permission denied for table messages');
  }

  if (p === '/rest/v1/rpc/open_help_requests' && (req.method === 'GET' || req.method === 'POST')) {
    const nowMs = Date.now();
    const rows = [...store.requests.values()]
      .filter(r => r.status === 'open' && canSee(r))
      .map(r => ({ ...r, age_seconds: Math.floor((nowMs - Date.parse(r.opened_at)) / 1000) }))
      .filter(r => r.age_seconds >= 0 && r.age_seconds * 1000 <= OPEN_WINDOW_MS)
      .sort((a, b) => (a.opened_at < b.opened_at ? 1 : a.opened_at > b.opened_at ? -1 : 0))
      .slice(0, 20);
    return send(res, 200, rows);
  }
  if (req.method !== 'POST') return pgErr(res, 405, 'PGRST117', 'Unsupported HTTP method');
  if (p === '/rest/v1/rpc/accept_help_request') {
    const me = profiles.get(uid);
    if (me?.role !== 'volunteer') return pgErr(res, 403, '42501', 'not_a_volunteer');
    if (me.verified !== true) return pgErr(res, 403, '42501', 'not_verified');
    if ([...store.requests.values()].some(x => x.volunteer_id === uid && x.status === 'matched')) return pgErr(res, 400, 'P0001', 'already_helping');
    const r = store.requests.get(input?.p_request_id);
    // Node runs one request at a time, so check-and-set here is as atomic as the SQL update.
    if (!r || r.status === 'cancelled' || r.status === 'done') return pgErr(res, 400, 'P0001', 'request_closed');
    if (r.status !== 'open' || r.visitor_id === uid) return pgErr(res, 400, 'P0001', 'already_taken');
    Object.assign(r, {
      status: 'matched', volunteer_id: uid, volunteer_name: me.first_name,
      volunteer_languages: [me.main_language, ...me.languages.filter(l => l !== me.main_language)],
      volunteer_trainings: me.trainings ?? [], matched_at: now(),
    });
    return send(res, 200, r);
  }
  if (p === '/rest/v1/rpc/close_help_request') {
    const status = input?.p_status;
    if (status !== 'cancelled' && status !== 'done') return pgErr(res, 400, '22023', 'bad_status');
    const r = store.requests.get(input?.p_request_id);
    const allowed = r && (r.status === 'open' || r.status === 'matched')
      && (r.visitor_id === uid || (r.volunteer_id === uid && r.status === 'matched' && status === 'done'));
    if (allowed) Object.assign(r, { status, closed_by: uid, closed_at: now() });
    return send(res, 204);
  }
  if (p === '/rest/v1/rpc/release_help_request') {
    const r = store.requests.get(input?.p_request_id);
    if (r && r.status === 'matched' && r.volunteer_id === uid) {
      Object.assign(r, {
        status: 'open', volunteer_id: null, volunteer_name: null, volunteer_languages: null, volunteer_trainings: null,
        matched_at: null, opened_at: now(),
      });
    }
    return send(res, 204);
  }
}

/** KEY=value lines from .env.server.local (git-ignored), or {} when there's no such file. */
export function readServerEnv(file = SERVER_ENV_FILE) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/**
 * Imports a TypeScript module shared with the Edge Function or the app. Node 22.18+ strips the types;
 * its "module type not specified" warning for these files is expected and silenced.
 */
async function importShared(relativePath) {
  const emit = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const code = typeof rest[0] === 'object' ? rest[0]?.code : rest[1];
    if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return;
    return emit.call(this, warning, ...rest);
  };
  try {
    return await import(pathToFileURL(join(ROOT, relativePath)).href);
  } finally {
    process.emitWarning = emit;
  }
}

/** The stub's string tables: volunteer `mock.*` and facility names from every locale, as the app has them. */
function stubCatalog(flattenStrings, placeNames) {
  const dir = join(ROOT, 'src', 'i18n', 'locales');
  const catalog = {};
  for (const lang of readdirSync(dir)) {
    const file = join(dir, lang, 'volunteer.json');
    if (!existsSync(file)) continue;
    const venueFile = join(dir, lang, 'venue.json');
    const places = existsSync(venueFile) ? placeNames(JSON.parse(readFileSync(venueFile, 'utf8')).facilityText ?? {}) : {};
    catalog[lang] = { ...flattenStrings(JSON.parse(readFileSync(file, 'utf8')).mock ?? {}), ...places };
  }
  return catalog;
}

/** The translate function's handler with the provider from .env.server.local, else the stub. */
async function createTranslate({ verifyUser, control, log }) {
  const { chooseProvider, createHandler } = await importShared('supabase/functions/translate/handler.ts');
  const { createStub, flattenStrings, placeNames } = await importShared('src/features/translate/stub.ts');
  const env = readServerEnv();
  let translator = null;
  if (env.TRANSLATE_PROVIDER) {
    const Anthropic = env.TRANSLATE_PROVIDER.trim().toLowerCase() === 'anthropic' ? (await import('@anthropic-ai/sdk')).default : null;
    const choice = chooseProvider(env, apiKey => new Anthropic({ apiKey, timeout: 20_000, maxRetries: 2 }));
    if (choice.ok) translator = choice.translator;
    else log(`mock supabase: ${choice.reason} in .env.server.local; using the stub translator`);
  }
  translator ??= createStub(stubCatalog(flattenStrings, placeNames)).translator;
  log(translator.name === 'stub'
    ? 'Translate: offline stub (knows the mock volunteer lines). Real provider: see README "Chat translation".'
    : `Translate: ${translator.name}, keys from .env.server.local`);

  const real = translator;
  const controlled = {
    name: real.name,
    async translate(batch) {
      if (control.translateDelayMs > 0) await new Promise(r => setTimeout(r, control.translateDelayMs));
      if (control.failTranslate > 0) {
        control.failTranslate -= 1;
        throw new Error('failed on purpose (/__control failTranslate)');
      }
      return real.translate(batch);
    },
  };
  return createHandler({ verifyUser, translator: controlled, log: line => log(`mock supabase: ${line}`) });
}

// Run on its own: node scripts/mock-supabase.mjs [port] [--confirm-email]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv.find(a => /^\d+$/.test(a)) ?? MOCK_SUPABASE_PORT);
  const server = await startMockSupabase({ port, confirmEmail: process.argv.includes('--confirm-email') });
  console.log(`mock supabase on http://localhost:${server.address().port}`); // port 0 picks a free one
}
