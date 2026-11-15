// Translations per (message id, target language), kept for the session. Re-renders, the "Show
// original" toggle and switching languages back never refetch; a request already on its way is
// shared. Each bubble listens to its own key only, and a key a bubble is watching is never evicted.
//
// Failures back off: after the n-th failure in a row a key waits retryAfterMs × 2^(n-1) (capped at
// maxRetryMs). One timer per failed key re-requests it then, but only while a bubble is watching;
// otherwise the next bubble to ask after the wait does. retry() (the "Try again" tap) goes at once.
import type { Translate, TranslateRequest, Translation } from './client';

export type Entry =
  | { status: 'loading' }
  | { status: 'done'; result: Translation }
  | { status: 'error'; at: number };

export interface CacheOptions {
  retryAfterMs?: number;
  maxRetryMs?: number;
  /** Oldest entries are dropped past this many (never loading or watched ones). */
  max?: number;
  now?: () => number;
}

export function createTranslationCache(
  translate: Translate,
  { retryAfterMs = 30_000, maxRetryMs = 5 * 60_000, max = 500, now = Date.now }: CacheOptions = {},
) {
  const entries = new Map<string, Entry>();
  const requests = new Map<string, TranslateRequest>();
  const listeners = new Map<string, Set<() => void>>();
  const failures = new Map<string, number>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const keyOf = (messageId: string, target: string) => `${messageId}\u0000${target}`;
  const watched = (key: string) => (listeners.get(key)?.size ?? 0) > 0;
  const waitFor = (key: string) => Math.min(retryAfterMs * 2 ** Math.max(0, (failures.get(key) ?? 1) - 1), maxRetryMs);

  function set(key: string, entry: Entry) {
    entries.delete(key); // re-insert, so Map order is oldest-first
    entries.set(key, entry);
    for (const k of entries.keys()) {
      if (entries.size <= max) break;
      if (k === key || watched(k) || entries.get(k)?.status === 'loading') continue;
      entries.delete(k);
      requests.delete(k);
      failures.delete(k);
    }
    listeners.get(key)?.forEach(l => l());
  }

  function start(key: string) {
    const req = requests.get(key);
    if (!req) return;
    clearTimeout(timers.get(key));
    timers.delete(key);
    set(key, { status: 'loading' });
    translate(req).then(
      result => {
        failures.delete(key);
        set(key, { status: 'done', result });
      },
      () => {
        failures.set(key, (failures.get(key) ?? 0) + 1);
        set(key, { status: 'error', at: now() });
        timers.set(key, setTimeout(() => {
          timers.delete(key);
          if (watched(key) && entries.get(key)?.status === 'error') start(key);
        }, waitFor(key)));
      },
    );
  }

  return {
    get(messageId: string, target: string): Entry | undefined {
      return entries.get(keyOf(messageId, target));
    },

    /** Starts translating unless it's cached, on its way, or failed and still waiting to retry. */
    request(messageId: string, req: TranslateRequest): void {
      const key = keyOf(messageId, req.target);
      requests.set(key, req);
      const entry = entries.get(key);
      if (entry && (entry.status !== 'error' || now() - entry.at < waitFor(key))) return;
      start(key);
    },

    /** "Try again": re-requests a failed translation now. */
    retry(messageId: string, target: string): void {
      const key = keyOf(messageId, target);
      if (entries.get(key)?.status === 'error') start(key);
    },

    /** Calls `listener` when this message's translation into `target` changes. */
    subscribe(messageId: string, target: string, listener: () => void) {
      const key = keyOf(messageId, target);
      const group = listeners.get(key) ?? new Set();
      group.add(listener);
      listeners.set(key, group);
      return () => {
        group.delete(listener);
        if (!group.size) listeners.delete(key);
      };
    },
  };
}

export type TranslationCache = ReturnType<typeof createTranslationCache>;
