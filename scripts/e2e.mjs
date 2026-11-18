// End-to-end API test: the core VenU flow as two users, against any backend (the mock, a local
// Supabase, the live project). One line per step, PASS / FAIL / SKIP; exits 1 when a step fails.
//
//   node scripts/e2e.mjs --url http://localhost:47330 --anon mock-publishable-key --signup
//   node scripts/e2e.mjs --url https://<ref>.supabase.co --anon sb_publishable_... --visitor rosa_m:pw --volunteer sam_helps:pw
//
// Flow: sign in both (username → username-sign-in function, email → password sign-in), read their
// profiles, the visitor opens a help request, the volunteer finds it in open_help_requests() and
// accepts, both chat (realtime delivery within --wait seconds when the backend has Realtime), the
// volunteer translates the visitor's Spanish message, the visitor closes it, both see it done.
//
// Safe on a shared project: it creates accounts only with --signup, writes only rows it created
// (one help request, its messages, and with --signup the two new profiles), never deletes anything,
// and cancels its own request if a step fails midway. Never prints passwords or tokens.
//
// Adding a step: put a { id, needs, run } object in STEPS where it belongs in the flow. run() throws
// to FAIL, returns { skip: 'why' } to SKIP, or returns nothing / a short note to PASS. The TODO
// steps show the shape for features that aren't built yet.
import { randomBytes, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Imports a shared .ts file (Node 22.18+ strips the types), without its "module type" warning. */
async function shared(path) {
  const emit = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const code = typeof rest[0] === 'object' ? rest[0]?.code : rest[1];
    if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return;
    return emit.call(this, warning, ...rest);
  };
  try {
    return await import(pathToFileURL(join(ROOT, path)).href);
  } finally {
    process.emitWarning = emit;
  }
}
const { parseE2eArgs, runSteps, summarize, USAGE, waitFor } = await shared('scripts/e2e-lib.ts');
const { PRIVACY_VERSION } = await shared('src/features/profile/privacy.ts');

const parsed = parseE2eArgs(process.argv.slice(2), process.env);
if (!parsed.ok) {
  if (parsed.error) console.error(parsed.error);
  console.error(USAGE);
  process.exit(parsed.error ? 2 : 0);
}
const opts = parsed.options;

// The visitor writes in Spanish; the volunteer answers in English.
const VISITOR_TEXT = 'Hola, estoy en la Entrada 3 y necesito ayuda para llegar a mi asiento con la silla de ruedas.';
const VOLUNTEER_TEXT = 'On my way! Stay by Entry 3, I will be there in 2 minutes.';
const TAG = `e2e-${Date.now().toString(36)}`;

function newClient() {
  return createClient(opts.url, opts.anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/** The function's error reply as text, e.g. '503 Translation is not set up on this server.' */
async function functionError(error, response) {
  const res = response ?? error?.context;
  const status = res?.status ?? 0;
  let message = error?.message ?? '';
  try {
    const body = await res.clone().json();
    message = body.message ?? body.error ?? message;
  } catch {
    // Not JSON: keep the client's message.
  }
  return { status, text: `${status || 'no answer'} ${message}`.trim() };
}

/** Signs `client` in; returns how. Usernames go through username-sign-in, like the app (src/lib/auth.ts). */
async function signIn(client, { login, password }) {
  if (login.includes('@')) {
    const { error } = await client.auth.signInWithPassword({ email: login, password });
    if (error) throw new Error(`password sign-in failed: ${error.message}`);
    return 'by email';
  }
  const { data, error, response } = await client.functions.invoke('username-sign-in', { body: { username: login, password } });
  if (!error && data?.access_token) {
    const set = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    if (set.error) throw new Error(`setSession failed: ${set.error.message}`);
    return 'by username (username-sign-in function)';
  }
  const failure = await functionError(error, response);
  if (failure.status !== 404) throw new Error(`username-sign-in answered ${failure.text}`);
  // The function isn't deployed: the app's fallback, while email_for_username is still callable.
  const lookup = await client.rpc('email_for_username', { p_username: login.toLowerCase() });
  if (lookup.error || !lookup.data) throw new Error(`username-sign-in isn't deployed and email_for_username failed (${lookup.error?.message ?? 'no such user'}); pass an email instead`);
  const { error: pwError } = await client.auth.signInWithPassword({ email: lookup.data, password });
  if (pwError) throw new Error(`password sign-in failed: ${pwError.message}`);
  return 'by username (email_for_username fallback)';
}

async function readRequest(client, id) {
  const { data, error } = await client.from('help_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`reading the request failed: ${error.message}`);
  return data;
}

async function readMessages(client, requestId) {
  const { data, error } = await client.from('messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
  if (error) throw new Error(`reading messages failed: ${error.message}`);
  return data ?? [];
}

/** Listens for new messages on the request; resolves once Realtime answers (or doesn't within --wait). */
function listen(client, requestId, inbox) {
  return new Promise(done => {
    let settled = false;
    const finish = result => { if (!settled) { settled = true; done(result); } };
    const channel = client
      .channel(`${TAG}-${randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, payload => {
        if (payload.new && payload.new.id) inbox.push(payload.new);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') finish({ channel, live: true, status });
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') finish({ channel, live: false, status });
      });
    setTimeout(() => finish({ channel, live: false, status: 'no answer' }), opts.waitMs);
  });
}

/** One help-request-and-chat side: send `text`, then check the other side gets it. */
function chatSteps(fromKey, toKey, text, language, messageKey, inboxKey) {
  return [
    {
      id: `chat-send-${fromKey}`,
      needs: [fromKey, 'matched'],
      async run(ctx) {
        const { error } = await ctx[fromKey].client.from('messages').insert({ request_id: ctx.request.id, text, language });
        if (error) throw new Error(`insert failed: ${error.message}`);
        ctx[messageKey] = text;
        return `${language}: "${text.slice(0, 40)}…"`;
      },
    },
    {
      id: `realtime-${toKey}-receives`,
      needs: [messageKey, 'listening'],
      async run(ctx) {
        if (!ctx.live) return { skip: `no Realtime on this backend (${ctx.liveStatus}); delivery is checked by reading below` };
        const got = await waitFor(async () => ctx[inboxKey].find(m => m.text === text), opts.waitMs, 100);
        if (!got) throw new Error(`no realtime event within ${opts.waitMs / 1000} s (is messages in the supabase_realtime publication?)`);
      },
    },
    {
      id: `chat-read-${toKey}`,
      needs: [messageKey, toKey],
      async run(ctx) {
        const got = await waitFor(async () => (await readMessages(ctx[toKey].client, ctx.request.id)).find(m => m.text === text), opts.waitMs);
        if (!got) throw new Error(`the ${toKey} can't read the message after ${opts.waitMs / 1000} s`);
        if (got.sender_id !== ctx[fromKey].id) throw new Error('the message has the wrong sender_id');
        if (got.language !== language) throw new Error(`the message language is ${got.language}, expected ${language}`);
      },
    },
  ];
}

const STEPS = [
  // ---- accounts
  ...['visitor', 'volunteer'].map(role => ({
    id: `signup-${role}`,
    async run(ctx) {
      if (!opts.signup) return { skip: 'existing account (--signup creates new ones)' };
      const username = `e2e_${role.slice(0, 3)}_${Date.now().toString(36).slice(-6)}${randomBytes(1).toString('hex')}`;
      const email = `${username.replace(/_/g, '.')}@${opts.emailDomain}`;
      const password = `e2e-${randomBytes(12).toString('base64url')}`;
      const { data, error } = await newClient().auth.signUp({ email, password, options: { data: { username } } });
      if (error) throw new Error(`sign-up failed: ${error.message}`);
      if (!data.session) throw new Error('sign-up needs email confirmation on this backend; use --visitor/--volunteer with confirmed accounts');
      ctx.accounts[role] = { login: username, password };
      return `${username} <${email}>`;
    },
  })),
  ...['visitor', 'volunteer'].map(role => ({
    id: `sign-in-${role}`,
    async run(ctx) {
      const account = ctx.accounts[role];
      if (!account) throw new Error('no account to sign in with');
      const client = newClient();
      const how = await signIn(client, account);
      const { data } = await client.auth.getUser();
      if (!data.user) throw new Error('signed in, but /auth/v1/user has no user');
      ctx[role] = { client, id: data.user.id };
      return `${account.login} ${how}`;
    },
  })),
  ...['visitor', 'volunteer'].map(role => ({
    id: `profile-create-${role}`,
    needs: [role],
    async run(ctx) {
      if (!opts.signup) return { skip: 'existing account keeps its profile' };
      const visitor = role === 'visitor';
      const row = {
        id: ctx[role].id, role, first_name: visitor ? 'E2E Rosa' : 'E2E Sam', avatar_path: null,
        languages: visitor ? ['es', 'en'] : ['en', 'es'], main_language: visitor ? 'es' : 'en', app_language: visitor ? 'es' : 'en',
        access_needs: visitor ? ['wheelchair'] : [], access_needs_note: null, communication: visitor ? ['text'] : [],
        helper_gender_pref: 'none', helper_age_pref: 'any', trainings: visitor ? [] : ['wheelchair'],
        gender: visitor ? null : 'prefer_not', age_band: visitor ? null : 'prefer_not',
        privacy_version: PRIVACY_VERSION, privacy_accepted_at: new Date().toISOString(),
      };
      const { error } = await ctx[role].client.from('profiles').insert(row);
      if (error) throw new Error(`insert failed: ${error.message}`);
    },
  })),
  ...['visitor', 'volunteer'].map(role => ({
    id: `profile-read-${role}`,
    needs: [role],
    async run(ctx) {
      const { data, error } = await ctx[role].client.from('profiles').select('*').eq('id', ctx[role].id).maybeSingle();
      if (error) throw new Error(`select failed: ${error.message}`);
      if (!data) throw new Error('no profile row; finish onboarding in the app first');
      if (data.role !== role) throw new Error(`this account is a ${data.role}, not a ${role}`);
      ctx[role].profile = data;
      return `${data.first_name}, main language ${data.main_language}${role === 'volunteer' ? `, verified ${data.verified}` : ''}`;
    },
  })),

  // ---- help request
  {
    id: 'request-create',
    needs: ['visitor'],
    async run(ctx) {
      const row = {
        id: randomUUID(), visitor_name: ctx.visitor.profile?.first_name ?? 'E2E', venue_id: 'sofi', spot: 'entry-3',
        help_types: ['physical', 'directions'], note: `[${TAG}] automated test request, safe to ignore`, language: 'es',
      };
      const { error } = await ctx.visitor.client.from('help_requests').insert(row);
      if (error) throw new Error(`insert failed: ${error.message}`);
      const back = await readRequest(ctx.visitor.client, row.id);
      if (!back || back.status !== 'open') throw new Error(`the visitor reads it back as ${back?.status ?? 'missing'}`);
      ctx.request = { id: row.id, status: 'open' };
      return row.id;
    },
  },
  {
    id: 'request-listed',
    needs: ['request', 'volunteer'],
    async run(ctx) {
      const found = await waitFor(async () => {
        const { data, error } = await ctx.volunteer.client.rpc('open_help_requests');
        if (error) throw new Error(`open_help_requests failed: ${error.message}`);
        return (data ?? []).find(r => r.id === ctx.request.id);
      }, opts.waitMs);
      if (!found) throw new Error('the volunteer does not see the request in open_help_requests()');
      return `age ${found.age_seconds} s`;
    },
  },
  {
    id: 'verified-gate',
    needs: ['request', 'volunteer'],
    todo: 'an unverified volunteer gets not_verified from accept_help_request (lands with profiles.verified enforcement)',
    async run() {},
  },
  {
    id: 'request-accept',
    needs: ['request', 'volunteer'],
    async run(ctx) {
      const { data, error } = await ctx.volunteer.client.rpc('accept_help_request', { p_request_id: ctx.request.id });
      if (error) {
        if (/already_helping/.test(error.message)) throw new Error('already_helping: this volunteer has another matched request; finish it in the app first');
        throw new Error(`accept failed: ${error.message}`);
      }
      if (data?.status !== 'matched' || data.volunteer_id !== ctx.volunteer.id) throw new Error(`accept returned status ${data?.status}`);
      ctx.request.status = 'matched';
    },
  },
  {
    id: 'request-matched-visitor',
    needs: ['request', 'visitor'],
    async run(ctx) {
      const row = await waitFor(async () => {
        const r = await readRequest(ctx.visitor.client, ctx.request.id);
        return r?.status === 'matched' ? r : null;
      }, opts.waitMs);
      if (!row) throw new Error('the visitor never sees the request matched');
      if (row.volunteer_id !== ctx.volunteer?.id) throw new Error('matched to a different volunteer');
      ctx.matched = true;
      return `volunteer ${row.volunteer_name}, speaks ${(row.volunteer_languages ?? []).join(', ')}`;
    },
  },

  // ---- chat
  {
    id: 'realtime-subscribe',
    needs: ['matched'],
    async run(ctx) {
      const [v, w] = await Promise.all([
        listen(ctx.visitor.client, ctx.request.id, ctx.visitorInbox),
        listen(ctx.volunteer.client, ctx.request.id, ctx.volunteerInbox),
      ]);
      ctx.channels = [v.channel, w.channel];
      ctx.listening = true;
      ctx.live = v.live && w.live;
      ctx.liveStatus = ctx.live ? 'SUBSCRIBED' : `visitor ${v.status}, volunteer ${w.status}`;
      if (!ctx.live) return { skip: `Realtime unavailable (${ctx.liveStatus})` };
    },
  },
  ...chatSteps('visitor', 'volunteer', VISITOR_TEXT, 'es', 'visitorMessage', 'volunteerInbox'),
  ...chatSteps('volunteer', 'visitor', VOLUNTEER_TEXT, 'en', 'volunteerMessage', 'visitorInbox'),
  {
    id: 'translate',
    needs: ['visitorMessage', 'volunteer'],
    async run(ctx) {
      const main = ctx.volunteer.profile?.main_language ?? 'en';
      const target = main === 'es' ? 'en' : main;
      const { data, error, response } = await ctx.volunteer.client.functions.invoke('translate', {
        body: { target, source: 'es', texts: [ctx.visitorMessage] },
      });
      if (error) {
        const failure = await functionError(error, response);
        if (failure.status === 404) return { skip: 'the translate function is not deployed (404)' };
        if (failure.status === 503) return { skip: `translate has no provider set up (${failure.text})` };
        throw new Error(`translate answered ${failure.text}`);
      }
      const out = data?.translations?.[0];
      if (!out) throw new Error('translate returned no translations');
      if (out.unavailable) return { skip: `provider ${data.provider}: no real translator here (offline stub)` };
      if (out.refused) throw new Error(`provider ${data.provider} refused to translate`);
      if (out.unsupported) return { skip: `provider ${data.provider} can't translate into ${target}` };
      if (out.text.trim() === ctx.visitorMessage.trim()) throw new Error(`provider ${data.provider} returned the text unchanged`);
      return `${data.provider} es→${target}: "${out.text}"`;
    },
  },

  // ---- after the chat (features not built yet: fill in run() and drop `todo`)
  {
    id: 'rating',
    needs: ['matched'],
    todo: 'the visitor rates the volunteer after help (ratings table not built yet)',
    async run() {},
  },
  {
    id: 'facility-report',
    needs: ['visitor'],
    todo: 'the visitor files a facility report for sofi/entry-3 (facility reports not built yet)',
    async run() {},
  },

  // ---- close
  {
    id: 'request-close',
    needs: ['request', 'visitor'],
    async run(ctx) {
      const { error } = await ctx.visitor.client.rpc('close_help_request', { p_request_id: ctx.request.id, p_status: 'done' });
      if (error) throw new Error(`close failed: ${error.message}`);
      ctx.request.status = 'done';
    },
  },
  {
    id: 'request-final',
    needs: ['request', 'visitor'],
    async run(ctx) {
      const mine = await readRequest(ctx.visitor.client, ctx.request.id);
      if (mine?.status !== 'done') throw new Error(`the visitor sees status ${mine?.status ?? 'missing'}, expected done`);
      if (mine.closed_by !== ctx.visitor.id || !mine.closed_at) throw new Error('closed_by / closed_at not set');
      if (ctx.volunteer && ctx.matched) {
        const theirs = await readRequest(ctx.volunteer.client, ctx.request.id);
        if (theirs?.status !== 'done') throw new Error(`the volunteer sees status ${theirs?.status ?? 'missing'}, expected done`);
      }
      return 'done for both';
    },
  },

  // ---- cleanup: only what this run created
  {
    id: 'cleanup',
    always: true,
    async run(ctx) {
      const notes = [];
      for (const channel of ctx.channels ?? []) await channel.unsubscribe();
      if (ctx.request && ctx.visitor && ctx.request.status !== 'done') {
        const { error } = await ctx.visitor.client.rpc('close_help_request', { p_request_id: ctx.request.id, p_status: 'cancelled' });
        notes.push(error ? `couldn't cancel the request: ${error.message}` : 'cancelled the unfinished request');
      }
      if (opts.signup && ctx.accounts.visitor) notes.push('the two --signup accounts stay (nothing is deleted)');
      return notes.join('; ');
    },
  },
];

const ctx = {
  accounts: { visitor: opts.visitor, volunteer: opts.volunteer },
  visitorInbox: [],
  volunteerInbox: [],
};
console.log(`VenU e2e against ${opts.url} (${opts.signup ? 'new accounts' : 'existing accounts'}, wait ${opts.waitMs / 1000} s)`);
const results = await runSteps(STEPS, ctx);
const { line, exitCode } = summarize(results);
console.log(line);
for (const side of [ctx.visitor, ctx.volunteer]) side?.client.realtime.disconnect();
process.exit(exitCode);
