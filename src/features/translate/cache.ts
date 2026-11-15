// Translations per (message id, target language), kept for the session. Re-renders, the "Show
// original" toggle and switching languages back never refetch; a request already on its way is
// shared. A failure is remembered too: the same message isn't retried for `retryAfterMs`, and then
// only when a bubble asks again (e.g. the chat is reopened), so a broken service can't cause a storm.
import type { Translate, TranslateRequest, TranslateResult } from './client';

export type Entry =
  | { status: 'loading' }
  | { status: 'done'; result: TranslateResult }
  | { status: 'error'; at: number };

export interface CacheOptions {
  retryAfterMs?: number;
  /** Oldest entries are dropped past this many. */
  max?: number;
  now?: () => number;
}

export function createTranslationCache(translate: Translate, { retryAfterMs = 30_000, max = 500, now = Date.now }: CacheOptions = {}) {
  const entries = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  const keyOf = (messageId: string, target: string) => `${messageId}\u0000${target}`;

  function set(key: string, entry: Entry) {
    entries.delete(key); // re-insert, so Map order is oldest-first
    entries.set(key, entry);
    for (const k of entries.keys()) {
      if (entries.size <= max) break;
      if (k !== key && entries.get(k)?.status !== 'loading') entries.delete(k);
    }
    listeners.forEach(l => l());
  }

  return {
    get(messageId: string, target: string): Entry | undefined {
      return entries.get(keyOf(messageId, target));
    },

    /** Starts translating unless it's cached, on its way, or failed less than `retryAfterMs` ago. */
    request(messageId: string, req: TranslateRequest): void {
      const key = keyOf(messageId, req.target);
      const entry = entries.get(key);
      if (entry && (entry.status !== 'error' || now() - entry.at < retryAfterMs)) return;
      set(key, { status: 'loading' });
      translate(req).then(
        result => set(key, { status: 'done', result }),
        () => set(key, { status: 'error', at: now() }),
      );
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type TranslationCache = ReturnType<typeof createTranslationCache>;
