import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createMockBackend } from '../backend';
import { MOCK_LOCATION } from '../mock';
import { createRequestStore, INITIAL_STATE, reduce, type NewRequest } from '../request-store';
import { formatClock } from '../format';

const TIMING = { search: 1000, greeting: 500, reply: 800 };

const rosaNeedsHelp: NewRequest = {
  visitorName: 'Rosa',
  helpTypes: ['physical'],
  note: 'Stuck near ramp 2',
  photoUri: null,
  language: 'en',
  location: MOCK_LOCATION,
};

function setup() {
  return createRequestStore(createMockBackend(TIMING));
}

/** Runs timers and lets the awaited promises settle. */
async function advance(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

describe('volunteer request store', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('goes idle → searching → matched, then the volunteer says hello', async () => {
    const store = setup();
    const done = store.sendRequest(rosaNeedsHelp);
    expect(store.getState().status).toBe('searching');
    expect(store.getState().request?.helpTypes).toEqual(['physical']);

    await advance(TIMING.search);
    await done;
    const matched = store.getState();
    expect(matched.status).toBe('matched');
    expect(matched.match?.volunteer.name).toBe('Daniel K.');
    expect(matched.unread).toBe(0);

    await advance(TIMING.greeting);
    expect(store.getState().messages.map(m => m.from)).toEqual(['volunteer']);
    expect(store.getState().messages[0]!.text).toContain('Hi Rosa!');
    expect(store.getState().unread).toBe(1);

    store.markRead();
    expect(store.getState().unread).toBe(0);
  });

  it('matches someone who speaks the requested language', async () => {
    const store = setup();
    const done = store.sendRequest({ ...rosaNeedsHelp, language: 'ko' });
    await advance(TIMING.search);
    await done;
    expect(store.getState().match?.volunteer.languages).toContain('ko');
  });

  it('adds my message, then a mock reply', async () => {
    const store = setup();
    const done = store.sendRequest(rosaNeedsHelp);
    await advance(TIMING.search + TIMING.greeting);
    await done;

    store.sendMessage('  I am by the blue sign  ');
    store.sendMessage('   '); // ignored
    expect(store.getState().messages.at(-1)).toMatchObject({ from: 'me', text: 'I am by the blue sign' });

    await advance(TIMING.reply);
    const { messages } = store.getState();
    expect(messages.map(m => m.from)).toEqual(['volunteer', 'me', 'volunteer']);
  });

  it('cancelling while searching drops the late match', async () => {
    const store = setup();
    const done = store.sendRequest(rosaNeedsHelp);
    store.cancel();
    expect(store.getState()).toEqual(INITIAL_STATE);
    await advance(TIMING.search * 2);
    await done;
    expect(store.getState().status).toBe('idle');
  });

  it('cancelling a match stops its messages', async () => {
    const store = setup();
    const done = store.sendRequest(rosaNeedsHelp);
    await advance(TIMING.search);
    await done;
    store.cancel();
    await advance(TIMING.greeting + TIMING.reply);
    expect(store.getState()).toEqual(INITIAL_STATE);
  });

  it('ending help asks for feedback; submitting returns home with a thank-you', async () => {
    const store = setup();
    const done = store.sendRequest(rosaNeedsHelp);
    await advance(TIMING.search);
    await done;

    store.endHelp();
    expect(store.getState().status).toBe('done');
    await advance(TIMING.greeting); // the greeting arrives after the help ended: ignored
    expect(store.getState().messages).toEqual([]);

    await store.submitFeedback(5, ['patient', 'helpful'], ' Thank you ');
    expect(store.getState().status).toBe('idle');
    expect(store.getState().notice).toMatchObject({ tone: 'success' });
    expect(store.getState().notice?.text).toContain('Daniel');

    store.dismissNotice();
    expect(store.getState().notice).toBeNull();
  });

  it('a failed search returns to the form with an error', async () => {
    const backend = createMockBackend(TIMING);
    backend.findVolunteer = () => Promise.reject(new Error('offline'));
    const store = createRequestStore(backend);
    await store.sendRequest(rosaNeedsHelp);
    expect(store.getState().status).toBe('idle');
    expect(store.getState().notice?.tone).toBe('error');
  });

  it('signing out calls off the request and clears it, so the next user starts fresh', async () => {
    const backend = createMockBackend(TIMING);
    const cancelRequest = jest.spyOn(backend, 'cancelRequest');
    const store = createRequestStore(backend);
    store.setUser('rosa');
    const done = store.sendRequest(rosaNeedsHelp);
    await advance(TIMING.search + TIMING.greeting);
    await done;
    store.sendMessage('I am by the blue sign');
    const requestId = store.getState().request!.id;

    store.setUser(null);
    expect(store.getState()).toEqual(INITIAL_STATE);
    expect(cancelRequest).toHaveBeenCalledWith(requestId);
    await advance(TIMING.reply * 2); // the pending reply never lands
    expect(store.getState()).toEqual(INITIAL_STATE);

    store.setUser('sam');
    expect(store.getState()).toEqual(INITIAL_STATE);
  });

  it('another user signing in drops a search in progress', async () => {
    const store = setup();
    store.setUser('rosa');
    const done = store.sendRequest(rosaNeedsHelp);
    store.setUser('sam');
    expect(store.getState()).toEqual(INITIAL_STATE);
    await advance(TIMING.search * 2);
    await done;
    expect(store.getState().status).toBe('idle');
  });

  it('the same user loading again keeps the request', async () => {
    const store = setup();
    store.setUser('rosa');
    const done = store.sendRequest(rosaNeedsHelp);
    await advance(TIMING.search);
    await done;
    store.setUser('rosa');
    expect(store.getState().status).toBe('matched');
  });

  it('ignores actions that do not fit the current status', () => {
    expect(reduce(INITIAL_STATE, { type: 'end' })).toBe(INITIAL_STATE);
    expect(reduce(INITIAL_STATE, { type: 'cancel' })).toBe(INITIAL_STATE);
    expect(reduce(INITIAL_STATE, { type: 'send', message: { id: 'm', from: 'me', text: 'hi', sentAt: 0 } })).toBe(INITIAL_STATE);
  });
});

describe('formatClock', () => {
  it('prints Figma-style times', () => {
    expect(formatClock(new Date(2026, 6, 14, 14, 0).getTime())).toBe('2:00pm');
    expect(formatClock(new Date(2026, 6, 14, 0, 5).getTime())).toBe('12:05am');
    expect(formatClock(new Date(2026, 6, 14, 12, 30).getTime())).toBe('12:30pm');
  });
});
