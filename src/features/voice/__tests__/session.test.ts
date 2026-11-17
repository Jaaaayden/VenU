import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { DictationError, DictationState } from '../dictation-state';
import { setSpeechEngineForTests, speechEngine, type SpeechEngine } from '../engine';
import { DictationSession, STOP_TIMEOUT_MS } from '../session';

// Like Expo Go: the library's import throws because the native module isn't in the binary.
jest.mock('expo-speech-recognition', () => {
  throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
});

type Listener = (e: never) => void;

/** A stand-in for ExpoSpeechRecognitionModule that tests drive by emitting events. */
function fakeEngine(opts: { available?: boolean; granted?: boolean; locales?: string[]; installed?: string[] } = {}) {
  const listeners = new Map<string, Set<Listener>>();
  const engine = {
    isRecognitionAvailable: jest.fn(() => opts.available ?? true),
    requestPermissionsAsync: jest.fn(async () => ({ granted: opts.granted ?? true })),
    getSupportedLocales: jest.fn(async () => ({ locales: opts.locales ?? [], installedLocales: opts.installed ?? [] })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addListener: jest.fn((name: string, fn: Listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
      return { remove: () => listeners.get(name)!.delete(fn) };
    }),
  };
  const emit = (name: string, payload?: unknown) => {
    for (const fn of [...(listeners.get(name) ?? [])]) fn(payload as never);
  };
  const listening = () => [...listeners.values()].reduce((n, s) => n + s.size, 0);
  return { engine, emit, listening, asEngine: engine as unknown as SpeechEngine };
}

function setup(fake: ReturnType<typeof fakeEngine> | null, platform = 'ios') {
  const texts: string[] = [];
  const errors: DictationError[] = [];
  const states: DictationState[] = [];
  const onListening = jest.fn<(fellBack: boolean) => void>();
  const onEnd = jest.fn<(heard: boolean) => void>();
  const commits: string[] = [];
  const session = new DictationSession(
    { onState: s => states.push(s), onText: t => texts.push(t), onCommit: t => commits.push(t), onError: e => errors.push(e), onListening, onEnd },
    { platform, engine: () => fake?.asEngine ?? null },
  );
  return { session, texts, commits, errors, states, onListening, onEnd };
}

const result = (transcript: string, isFinal: boolean) => ({ isFinal, results: [{ transcript, confidence: 0.9, segments: [] }] });

afterEach(() => setSpeechEngineForTests(undefined));

describe('loading the engine', () => {
  it('returns null instead of crashing where the native module is missing', () => {
    expect(speechEngine()).toBeNull();
  });
});

describe('a dictation session', () => {
  it('listens, streams interim words, appends the final text, and stops', async () => {
    const fake = fakeEngine({ locales: ['es-US', 'en-US'], installed: ['es-US'] });
    const { session, texts, onListening, onEnd } = setup(fake);
    await session.start('Cerca de la rampa 2.', 'es-US');

    expect(fake.engine.requestPermissionsAsync).toHaveBeenCalled();
    expect(fake.engine.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'es-US', requiresOnDeviceRecognition: true, interimResults: true, continuous: true }));
    fake.emit('start');
    expect(session.snapshot.status).toBe('listening');
    expect(onListening).toHaveBeenCalledWith(false);

    fake.emit('result', result('uso silla', false));
    fake.emit('result', result('uso silla de ruedas', false));
    expect(texts).toEqual(['Cerca de la rampa 2. uso silla', 'Cerca de la rampa 2. uso silla de ruedas']);

    session.stop();
    expect(fake.engine.stop).toHaveBeenCalled();
    expect(session.snapshot.status).toBe('stopping');
    fake.emit('result', result('uso silla de ruedas', true)); // same words, now final: no new text
    fake.emit('end');
    expect(texts).toHaveLength(2);
    expect(session.snapshot).toMatchObject({ status: 'idle', committed: 'uso silla de ruedas' });
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(fake.listening()).toBe(0);
  });

  it('says "unavailable" when there is no recogniser (Expo Go, Firefox)', async () => {
    const missing = setup(null);
    await missing.session.start('typed', 'en-US');
    expect(missing.errors).toEqual(['unsupported']);
    expect(missing.texts).toEqual([]);

    const firefox = fakeEngine({ available: false });
    const off = setup(firefox, 'web');
    await off.session.start('', 'en-US');
    expect(off.errors).toEqual(['unsupported']);
    expect(firefox.engine.start).not.toHaveBeenCalled();
  });

  it('reports a refused permission without starting', async () => {
    const fake = fakeEngine({ granted: false });
    const { session, errors, onEnd } = setup(fake, 'android');
    await session.start('', 'en-US');
    expect(errors).toEqual(['denied']);
    expect(fake.engine.start).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it("doesn't call the permission or locale APIs on web (they only warn there)", async () => {
    const fake = fakeEngine();
    const { session } = setup(fake, 'web');
    await session.start('', 'fr-FR');
    expect(fake.engine.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(fake.engine.getSupportedLocales).not.toHaveBeenCalled();
    expect(fake.engine.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'fr-FR', requiresOnDeviceRecognition: false }));
  });

  it('falls back to English when the language is not supported, and says so', async () => {
    const fake = fakeEngine();
    const { session, onListening, errors } = setup(fake, 'web');
    await session.start('', 'hy-AM');
    fake.emit('error', { error: 'language-not-supported', message: '' });
    fake.emit('end');
    expect(fake.engine.start).toHaveBeenLastCalledWith(expect.objectContaining({ lang: 'en-US' }));
    fake.emit('start');
    expect(onListening).toHaveBeenCalledWith(true);
    expect(session.snapshot.fellBack).toBe(true);
    expect(errors).toEqual([]);
  });

  it('turns recogniser errors into a note and ignores its own aborts', async () => {
    const fake = fakeEngine();
    const { session, errors } = setup(fake);
    await session.start('', 'en-US');
    fake.emit('start');
    fake.emit('error', { error: 'no-speech', message: '' });
    expect(errors).toEqual(['no-speech']);
    expect(session.snapshot.status).toBe('idle');
    expect(fake.listening()).toBe(0);

    await session.start('', 'en-US');
    fake.emit('start');
    session.abort();
    expect(fake.engine.abort).toHaveBeenCalled();
    fake.emit('error', { error: 'aborted', message: '' });
    expect(errors).toEqual(['no-speech']);
  });

  it('drops late words after abort (on send)', async () => {
    const fake = fakeEngine();
    const { session, texts } = setup(fake);
    await session.start('', 'en-US');
    fake.emit('start');
    fake.emit('result', result('on my way', false));
    session.abort();
    fake.emit('result', result('on my way now', true));
    expect(texts).toEqual(['on my way']);
    expect(session.snapshot.status).toBe('idle');
  });

  it('cancels a start still waiting on the permission prompt', async () => {
    const fake = fakeEngine();
    let grant!: (v: { granted: boolean }) => void;
    fake.engine.requestPermissionsAsync.mockImplementation(() => new Promise(r => { grant = r; }));
    const { session } = setup(fake);
    const starting = session.start('', 'en-US');
    session.stop();
    grant({ granted: true });
    await starting;
    expect(fake.engine.start).not.toHaveBeenCalled();
    expect(session.snapshot.status).toBe('idle');
  });

  it('cancels during the locale check, and a quick re-tap starts the recogniser only once', async () => {
    const fake = fakeEngine();
    let answer!: (v: { locales: string[]; installedLocales: string[] }) => void;
    fake.engine.getSupportedLocales.mockImplementationOnce(() => new Promise(r => { answer = r; }));
    const { session } = setup(fake);
    const first = session.start('', 'en-US');
    await Promise.resolve(); // past the permission prompt, now awaiting the locale list
    await Promise.resolve();
    expect(session.preparing).toBe(true);
    session.stop();
    expect(session.snapshot.status).toBe('idle');
    expect(session.preparing).toBe(false);
    const second = session.start('', 'en-US');
    answer({ locales: [], installedLocales: [] });
    await Promise.all([first, second]);
    expect(fake.engine.start).toHaveBeenCalledTimes(1);
    expect(fake.engine.stop).not.toHaveBeenCalled();
  });

  it('keeps what the user types while listening', async () => {
    const fake = fakeEngine();
    const { session, texts } = setup(fake);
    await session.start('Near ramp 2.', 'en-US');
    fake.emit('start');
    fake.emit('result', result('I use a', false));
    session.edit('Near ramp 2, gate B. I use a'); // typed before the dictated words
    fake.emit('result', result('I use a wheelchair', false));
    expect(texts.at(-1)).toBe('Near ramp 2, gate B. I use a wheelchair');
    session.edit('Near ramp 2, gate B. I use a wheelchair, thanks'); // typed after them
    fake.emit('result', result('I use a wheelchair and', false));
    expect(texts.at(-1)).toBe('Near ramp 2, gate B. I use a wheelchair, thanks and');
  });

  it('saves only settled text: on a final result and at the end, never on interim words', async () => {
    const fake = fakeEngine();
    const { session, commits } = setup(fake, 'android');
    await session.start('Hi', 'en-US');
    fake.emit('start');
    fake.emit('result', result('I am', false));
    fake.emit('result', result('I am at', false));
    expect(commits).toEqual([]);
    fake.emit('result', result('I am at gate 2', true));
    expect(commits).toEqual(['Hi I am at gate 2']);
    fake.emit('result', result('by the', false));
    session.stop();
    fake.emit('end');
    expect(commits).toEqual(['Hi I am at gate 2', 'Hi I am at gate 2 by the']);
  });

  it('complete() waits for the final words, then nothing refills the field', async () => {
    const fake = fakeEngine();
    const { session, texts } = setup(fake);
    await session.start('', 'en-US');
    fake.emit('start');
    fake.emit('result', result('on my', false));
    const done = session.complete();
    expect(fake.engine.stop).toHaveBeenCalled();
    fake.emit('result', result('on my way', true));
    fake.emit('end');
    await expect(done).resolves.toBe('on my way');
    fake.emit('result', result('on my way now', true));
    expect(texts).toEqual(['on my', 'on my way']);
    await expect(session.complete()).resolves.toBeNull(); // nothing running
  });

  it('complete() gives up after the stop timeout and sends what was heard', async () => {
    jest.useFakeTimers();
    try {
      const fake = fakeEngine();
      const { session } = setup(fake);
      await session.start('Gate 2.', 'en-US');
      fake.emit('start');
      fake.emit('result', result('wheelchair', false));
      const done = session.complete();
      jest.advanceTimersByTime(STOP_TIMEOUT_MS);
      await expect(done).resolves.toBe('Gate 2. wheelchair');
    } finally {
      jest.useRealTimers();
    }
  });

  it('goes quiet when disposed (screen closed): no state, text or end callbacks', async () => {
    const fake = fakeEngine();
    const { session, states, onEnd } = setup(fake);
    await session.start('', 'en-US');
    fake.emit('start');
    const seen = states.length;
    session.dispose();
    expect(fake.engine.abort).toHaveBeenCalled();
    expect(states).toHaveLength(seen);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('saves words still interim when disposed (switched tabs mid-sentence)', async () => {
    const fake = fakeEngine();
    const { session, commits, texts } = setup(fake);
    await session.start('Short.', 'en-US');
    fake.emit('start');
    fake.emit('result', result('hello there', false));
    expect(texts).toEqual(['Short. hello there']);
    expect(commits).toEqual([]);
    session.dispose();
    expect(commits).toEqual(['Short. hello there']);
    fake.emit('result', result('hello there again', true)); // nothing after dispose
    expect(commits).toEqual(['Short. hello there']);
  });

  it('gives up waiting for "end" a few seconds after stop()', async () => {
    jest.useFakeTimers();
    try {
      const fake = fakeEngine();
      const { session, onEnd } = setup(fake);
      await session.start('', 'en-US');
      fake.emit('start');
      session.stop();
      jest.advanceTimersByTime(3000);
      expect(session.snapshot.status).toBe('idle');
      expect(onEnd).toHaveBeenCalledWith(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('starting one session ends another (one recogniser for the app)', async () => {
    const fake = fakeEngine();
    const a = setup(fake);
    const b = setup(fake);
    await a.session.start('', 'en-US');
    fake.emit('start');
    await b.session.start('', 'en-US');
    expect(a.session.snapshot.status).toBe('idle');
    fake.emit('start');
    fake.emit('result', result('hello', false));
    expect(a.texts).toEqual([]);
    expect(b.texts).toEqual(['hello']);
  });
});
