// The live (Supabase) backend against an in-memory stand-in for the database, shared by a visitor's
// and volunteers' "devices": mapping rows to the app's shapes, open → matched → done / cancelled,
// the accept race, Realtime and the polling fallback.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AlreadyTakenError, createMockBackend } from '../backend';
import { createDeskStore } from '../desk-store';
import { createRequestStore, reduce, type NewRequest } from '../request-store';
import {
  CONNECT_GRACE_MS,
  createLiveBackend,
  OPEN_REFRESH_MS,
  POLL_MS,
  randomUuid,
  requestToRow,
  rowToAssignment,
  rowToIncoming,
  rowToMatch,
  rowToMessage,
  type HelpDb,
  type MessageRow,
  type RequestRow,
  type WatchSpec,
} from '../supabase-backend';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

interface Profile {
  role: 'visitor' | 'volunteer';
  first_name: string;
  languages: string[];
  main_language: string;
  trainings: string[];
  gender: string | null;
}

const PROFILES: Record<string, Profile> = {
  rosa: { role: 'visitor', first_name: 'Rosa', languages: ['es'], main_language: 'es', trainings: [], gender: null },
  sam: { role: 'volunteer', first_name: 'Sam', languages: ['es', 'en'], main_language: 'en', trainings: ['first_aid', 'sighted_guide'], gender: 'man' },
  ana: { role: 'volunteer', first_name: 'Ana', languages: ['en'], main_language: 'en', trainings: [], gender: 'woman' },
};

interface Sub {
  viewer: string;
  spec: WatchSpec;
  onRow: (row: unknown) => void;
}

/**
 * The tables and rules of the migration, in memory. `realtime: false` makes every channel fail, as
 * against the local mock server, so the backend has to poll.
 */
function fakeServer({ realtime = true } = {}) {
  const requests = new Map<string, RequestRow>();
  const messages: MessageRow[] = [];
  const subs = new Set<Sub>();
  let clock = Date.parse('2026-11-17T18:00:00Z');
  const now = () => new Date((clock += 1000)).toISOString();

  const isVolunteer = (id: string) => PROFILES[id]?.role === 'volunteer';
  const canSee = (r: RequestRow, who: string) => r.visitor_id === who || r.volunteer_id === who || (r.status === 'open' && isVolunteer(who));
  const party = (requestId: string, who: string) => {
    const r = requests.get(requestId);
    return !!r && (r.visitor_id === who || r.volunteer_id === who);
  };
  const matches = (filter: string | undefined, row: Record<string, unknown>) => {
    if (!filter) return true;
    const [col, value] = filter.split('=eq.');
    return String(row[col!]) === value;
  };

  function changed(row: RequestRow) {
    for (const s of subs) if (s.spec.table === 'help_requests' && matches(s.spec.filter, row as never) && canSee(row, s.viewer)) s.onRow({ ...row });
  }
  function posted(row: MessageRow) {
    for (const s of subs) if (s.spec.table === 'messages' && matches(s.spec.filter, row as never) && party(row.request_id, s.viewer)) s.onRow({ ...row });
  }

  /** One user's connection. */
  function dbFor(who: string): HelpDb {
    return {
      me: async () => who,
      async insertRequest(row) {
        await Promise.resolve();
        if (requests.has(row.id)) return;
        const full: RequestRow = {
          ...row, visitor_id: who, status: 'open', volunteer_id: null, volunteer_name: null, volunteer_languages: null,
          volunteer_trainings: null, volunteer_gender: null, closed_by: null, created_at: now(), matched_at: null, closed_at: null,
        };
        requests.set(row.id, full);
        changed(full);
      },
      getRequest: async id => {
        const r = requests.get(id);
        return r && canSee(r, who) ? { ...r } : null;
      },
      openRequests: async since => [...requests.values()].filter(r => r.status === 'open' && canSee(r, who) && r.created_at >= since).reverse(),
      activeAssignment: async id => [...requests.values()].find(r => r.volunteer_id === id && r.status === 'matched') ?? null,
      async accept(id) {
        await Promise.resolve(); // both volunteers' calls are in flight before either lands
        const p = PROFILES[who];
        const r = requests.get(id);
        if (!p || p.role !== 'volunteer') throw new Error('not_a_volunteer');
        if (!r || r.status !== 'open' || r.visitor_id === who) throw new AlreadyTakenError();
        const next: RequestRow = {
          ...r, status: 'matched', volunteer_id: who, volunteer_name: p.first_name,
          volunteer_languages: [p.main_language, ...p.languages.filter(l => l !== p.main_language)],
          volunteer_trainings: p.trainings, volunteer_gender: p.gender, matched_at: now(),
        };
        requests.set(id, next);
        changed(next);
        return { ...next };
      },
      async close(id, status) {
        const r = requests.get(id);
        if (!r || (r.status !== 'open' && r.status !== 'matched')) return;
        if (r.visitor_id !== who && !(r.volunteer_id === who && r.status === 'matched' && status === 'done')) return;
        const next: RequestRow = { ...r, status, closed_by: who, closed_at: now() };
        requests.set(id, next);
        changed(next);
      },
      messages: async requestId => (party(requestId, who) ? messages.filter(m => m.request_id === requestId).map(m => ({ ...m })) : []),
      async sendMessage(row) {
        if (!party(row.request_id, who) || requests.get(row.request_id)?.status !== 'matched') throw new Error('row-level security');
        const full: MessageRow = { ...row, id: randomUuid(), sender_id: who, created_at: now() };
        messages.push(full);
        posted(full);
      },
      subscribe<Row>(spec: WatchSpec, onRow: (row: Row | null) => void, onLive: (live: boolean) => void) {
        const sub: Sub = { viewer: who, spec, onRow: onRow as (row: unknown) => void };
        if (realtime) subs.add(sub);
        queueMicrotask(() => onLive(realtime));
        return () => { subs.delete(sub); };
      },
    };
  }

  return { requests, messages, subs, dbFor };
}

const rosaNeedsHelp: NewRequest = {
  visitorName: 'Rosa',
  helpTypes: ['physical', 'directions'],
  note: 'Near the ramp',
  photoUri: null,
  language: 'es',
  location: { venueId: 'sofi', facilityId: 'entry-4' },
};

/** Lets the fake's promises and any due timers run. */
async function settle(ms = 0) {
  await jest.advanceTimersByTimeAsync(ms);
  await jest.advanceTimersByTimeAsync(0);
}

function devices(server: ReturnType<typeof fakeServer>) {
  const visitor = createRequestStore(createLiveBackend(server.dbFor('rosa')));
  visitor.setLanguage('es');
  const sam = createDeskStore(createLiveBackend(server.dbFor('sam')));
  sam.setLanguage('en');
  const ana = createDeskStore(createLiveBackend(server.dbFor('ana')));
  return { visitor, sam, ana };
}

/** Rosa asks; Sam sees it and accepts. */
async function matched(server = fakeServer()) {
  const d = devices(server);
  await d.sam.setUser('sam');
  d.sam.watchOpen();
  void d.visitor.sendRequest(rosaNeedsHelp);
  await settle();
  const id = d.visitor.getState().request!.id;
  expect(await d.sam.accept(id)).toBe(true);
  await settle();
  return { ...d, id, server };
}

describe('mapping rows', () => {
  const row: RequestRow = {
    id: 'r1', visitor_id: 'rosa', visitor_name: 'Rosa', venue_id: 'sofi', spot: 'entry-4', help_types: ['quiet', 'nonsense'],
    note: 'Too loud', language: 'es', status: 'matched', volunteer_id: 'sam', volunteer_name: 'Sam',
    volunteer_languages: ['en', 'es'], volunteer_trainings: ['first_aid', 'sighted_guide'], volunteer_gender: 'man',
    closed_by: null, created_at: '2026-11-17T18:00:00Z', matched_at: '2026-11-17T18:01:00Z', closed_at: null,
  };

  it('sends a request as a row, ids for places', () => {
    expect(requestToRow({ ...rosaNeedsHelp, id: 'r9', createdAt: 0, location: { venueId: 'sofi', facilityId: null } })).toEqual({
      id: 'r9', visitor_name: 'Rosa', venue_id: 'sofi', spot: null, help_types: ['physical', 'directions'], note: 'Near the ramp', language: 'es',
    });
  });

  it('turns the accepted volunteer into a match: name, pronoun, trainings it knows, languages, no rating or ETA', () => {
    const m = rowToMatch(row);
    expect(m.volunteer).toMatchObject({ id: 'sam', name: 'Sam', firstName: 'Sam', possessive: 'his', languages: ['en', 'es'], rating: null });
    expect(m.volunteer.tags).toEqual([
      { label: 'first_aid', skill: 'first_aid', tone: 'success' },
      { label: 'English', tone: 'warning' },
      { label: 'Español', tone: 'warning' },
    ]);
    expect(m).toMatchObject({ language: 'en', etaMinutes: null, distanceFeet: null });
    expect(rowToMatch({ ...row, volunteer_gender: 'woman' }).volunteer.possessive).toBe('her');
    expect(rowToMatch({ ...row, volunteer_gender: null }).volunteer.possessive).toBe('their');
  });

  it('shows an open request with how long ago it came in, skipping help types it does not know', () => {
    const r = rowToIncoming(row, Date.parse('2026-11-17T18:03:30Z'));
    expect(r).toEqual({
      id: 'r1', visitorName: 'Rosa', helpType: 'quiet', location: { venueId: 'sofi', facilityId: 'entry-4' },
      language: 'es', minutesAgo: 3, distanceFeet: null, note: 'Too loud',
    });
    expect(rowToIncoming({ ...row, help_types: ['nonsense'] }).helpType).toBe('other');
    expect(rowToAssignment(row)).toMatchObject({ id: 'r1', visitorName: 'Rosa', helpTypes: ['quiet'], language: 'es', createdAt: Date.parse('2026-11-17T18:00:00Z') });
  });

  it('tells your messages from theirs and keeps the language they were written in', () => {
    const m: MessageRow = { id: 'm1', request_id: 'r1', sender_id: 'sam', text: 'Hi', language: 'en', created_at: '2026-11-17T18:02:00Z' };
    expect(rowToMessage(m, 'rosa')).toEqual({ id: 'm1', from: 'them', text: 'Hi', sentAt: Date.parse('2026-11-17T18:02:00Z'), lang: 'en' });
    expect(rowToMessage({ ...m, language: null }, 'sam')).toEqual({ id: 'm1', from: 'me', text: 'Hi', sentAt: Date.parse('2026-11-17T18:02:00Z') });
  });

  it('makes v4 UUIDs for request ids', () => {
    expect(randomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUuid()).not.toBe(randomUuid());
  });
});

describe('live help requests', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('stores the request as open and shows it to a volunteer with Accept', async () => {
    const server = fakeServer();
    const { visitor, sam } = devices(server);
    expect(sam.live).toBe(true);
    await sam.setUser('sam');
    sam.watchOpen();
    void visitor.sendRequest(rosaNeedsHelp);
    await settle();
    const id = visitor.getState().request!.id;
    expect(visitor.getState().status).toBe('searching');
    expect(server.requests.get(id)).toMatchObject({ status: 'open', visitor_id: 'rosa', spot: 'entry-4', help_types: ['physical', 'directions'] });
    expect(sam.getState().open).toEqual([expect.objectContaining({ id, visitorName: 'Rosa', helpType: 'physical', language: 'es' })]);
  });

  it('open → matched: the visitor sees the volunteer’s real name, and chat flows both ways with languages', async () => {
    const { visitor, sam, id, server } = await matched();
    expect(server.requests.get(id)).toMatchObject({ status: 'matched', volunteer_id: 'sam' });
    expect(visitor.getState().status).toBe('matched');
    expect(visitor.getState().match?.volunteer.firstName).toBe('Sam');
    expect(sam.getState()).toMatchObject({ assignment: { id, visitorName: 'Rosa' }, open: [] });

    visitor.sendMessage('Estoy en la rampa');
    await settle();
    expect(sam.getState().messages).toEqual([expect.objectContaining({ from: 'them', text: 'Estoy en la rampa', lang: 'es' })]);
    expect(sam.getState().unread).toBe(1);

    sam.sendMessage("I'm on my way");
    await settle();
    expect(visitor.getState().messages.map(m => [m.from, m.text, m.lang])).toEqual([
      ['me', 'Estoy en la rampa', 'es'],
      ['them', "I'm on my way", 'en'],
    ]);
    // Each side has the message once, though Realtime also reports their own.
    expect(sam.getState().messages.map(m => m.from)).toEqual(['them', 'me']);
  });

  it('matched → done by the visitor: the volunteer is told and goes back to the list', async () => {
    const { visitor, sam, id, server } = await matched();
    visitor.endHelp();
    await settle();
    expect(visitor.getState().status).toBe('done');
    expect(server.requests.get(id)).toMatchObject({ status: 'done', closed_by: 'rosa' });
    expect(sam.getState()).toMatchObject({ assignment: null, notice: { key: 'done', params: { name: 'Rosa' } } });
  });

  it('matched → cancelled by the visitor: the volunteer is told', async () => {
    const { visitor, sam, id, server } = await matched();
    visitor.cancel();
    await settle();
    expect(server.requests.get(id)?.status).toBe('cancelled');
    expect(sam.getState()).toMatchObject({ assignment: null, notice: { key: 'cancelled', params: { name: 'Rosa' } } });
  });

  it('the volunteer ending the chat moves the visitor to feedback', async () => {
    const { visitor, sam, id, server } = await matched();
    sam.endChat();
    expect(sam.getState()).toMatchObject({ assignment: null, notice: { key: 'ended' } });
    await settle();
    expect(server.requests.get(id)).toMatchObject({ status: 'done', closed_by: 'sam' });
    expect(visitor.getState().status).toBe('done');
    expect(visitor.getState().match?.volunteer.firstName).toBe('Sam');
  });

  it('open → cancelled while searching: it leaves the volunteer’s list on the next refresh', async () => {
    const server = fakeServer();
    const { visitor, sam } = devices(server);
    await sam.setUser('sam');
    sam.watchOpen();
    void visitor.sendRequest(rosaNeedsHelp);
    await settle();
    expect(sam.getState().open).toHaveLength(1);
    visitor.cancel();
    // RLS hides the cancelled row from volunteers, so Realtime can't tell them; the timed refresh does.
    await settle(OPEN_REFRESH_MS);
    expect(sam.getState().open).toEqual([]);
  });

  it('a cancel right after sending waits for the insert, so the request never stays open', async () => {
    const server = fakeServer();
    const { visitor } = devices(server);
    void visitor.sendRequest(rosaNeedsHelp);
    const id = visitor.getState().request!.id;
    visitor.cancel(); // before the insert has landed
    await settle();
    expect(server.requests.get(id)?.status).toBe('cancelled');
  });

  it('the accept race: exactly one of two volunteers gets it; the other hears it was taken', async () => {
    const server = fakeServer();
    const { visitor, sam, ana } = devices(server);
    await sam.setUser('sam');
    await ana.setUser('ana');
    sam.watchOpen();
    ana.watchOpen();
    void visitor.sendRequest(rosaNeedsHelp);
    await settle();
    const id = visitor.getState().request!.id;
    expect(ana.getState().open.map(r => r.id)).toEqual([id]);

    const [samGot, anaGot] = await Promise.all([sam.accept(id), ana.accept(id)]);
    await settle();
    expect([samGot, anaGot]).toEqual([true, false]);
    expect(server.requests.get(id)?.volunteer_id).toBe('sam');
    expect(ana.getState()).toMatchObject({ assignment: null, notice: { tone: 'error', key: 'taken' } });
    expect(ana.getState().open).toEqual([]);
    expect(visitor.getState().match?.volunteer.firstName).toBe('Sam');
  });

  it('only volunteers can accept', async () => {
    const server = fakeServer();
    const { visitor } = devices(server);
    void visitor.sendRequest(rosaNeedsHelp);
    await settle();
    const rosaAsVolunteer = createDeskStore(createLiveBackend(server.dbFor('rosa')));
    expect(await rosaAsVolunteer.accept(visitor.getState().request!.id)).toBe(false);
    expect(rosaAsVolunteer.getState().notice?.key).toBe('acceptFailed');
  });

  it('polls every 2 s when Realtime never subscribes (the local mock server)', async () => {
    const server = fakeServer({ realtime: false });
    const { visitor, sam } = devices(server);
    await sam.setUser('sam');
    sam.watchOpen();
    void visitor.sendRequest(rosaNeedsHelp);
    await settle();
    const id = visitor.getState().request!.id;
    expect(server.subs.size).toBe(0);
    await settle(POLL_MS);
    expect(sam.getState().open.map(r => r.id)).toEqual([id]);

    expect(await sam.accept(id)).toBe(true);
    expect(visitor.getState().status).toBe('searching');
    await settle(POLL_MS);
    expect(visitor.getState().status).toBe('matched');

    visitor.sendMessage('Hola');
    await settle(POLL_MS);
    expect(sam.getState().messages.map(m => m.text)).toEqual(['Hola']);
    sam.endChat();
    await settle(POLL_MS);
    expect(visitor.getState().status).toBe('done');
  });

  it('starts polling if Realtime takes too long to answer', async () => {
    const server = fakeServer();
    const db = server.dbFor('sam');
    const silent: HelpDb = { ...db, subscribe: () => () => {} }; // never reports a status
    const openRequests = jest.spyOn(silent, 'openRequests');
    const desk = createDeskStore(createLiveBackend(silent));
    desk.watchOpen();
    await settle();
    expect(openRequests).toHaveBeenCalledTimes(1);
    await settle(CONNECT_GRACE_MS + POLL_MS);
    expect(openRequests).toHaveBeenCalledTimes(2);
  });

  it('a volunteer restarting the app gets back the request they accepted, with its chat', async () => {
    const { visitor, id, server } = await matched();
    visitor.sendMessage('Hola');
    await settle();
    const again = createDeskStore(createLiveBackend(server.dbFor('sam')));
    await again.setUser('sam');
    await settle();
    expect(again.getState().assignment?.id).toBe(id);
    expect(again.getState().messages.map(m => [m.from, m.text])).toEqual([['them', 'Hola']]);
    expect(again.isRestored()).toBe(true);
  });

  it('a visitor’s chat keeps one copy of messages the live service sends again on resubscribing', async () => {
    const { visitor, sam } = await matched();
    sam.sendMessage('On my way');
    await settle();
    const state = visitor.getState();
    const again = reduce(state, { type: 'receive', requestId: state.request!.id, message: state.messages.at(-1)! });
    expect(again).toBe(state);
  });

  it('signing out of the desk drops the chat and the list', async () => {
    const { sam } = await matched();
    await sam.setUser(null);
    expect(sam.getState()).toEqual(expect.objectContaining({ assignment: null, messages: [], open: [] }));
  });
});

describe('local mode', () => {
  it('the mock backend has no volunteer side, so the volunteer home keeps its examples', async () => {
    const desk = createDeskStore(createMockBackend());
    expect(desk.live).toBe(false);
    expect(await desk.accept('in-1')).toBe(false);
    await desk.setUser('sam');
    expect(desk.getState().assignment).toBeNull();
    expect(desk.isRestored()).toBe(true);
  });
});
