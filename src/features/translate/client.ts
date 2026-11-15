// translate({ text, target, source? }) → { text, detectedSource }, for the app. Calls made in the same
// tick for the same languages go out as one batch (a chat that opens with 5 messages is one request).
// The transport is the only part that knows where translations come from: the `translate` Edge
// Function (Supabase and mock modes) or the offline stub (local mode). No provider keys in the app.
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  MAX_BATCH,
  MAX_TEXT_CHARS,
  MAX_TOTAL_CHARS,
  type ProviderName,
  type TranslateBatch,
  type TranslateResponse,
  type TranslateResult,
} from '../../../supabase/functions/translate/core';

export type { ProviderName, TranslateResult } from '../../../supabase/functions/translate/core';

export interface TranslateRequest {
  text: string;
  target: string;
  source?: string;
}

/** What the app gets back: the server's result, plus `partial` when only the start of a long text went out. */
export interface Translation extends TranslateResult {
  partial?: true;
}

/** Sends one batch, resolves with the provider and one result per text in order; rejects on any failure. */
export type Transport = (batch: TranslateBatch) => Promise<TranslateResponse>;

export type Translate = (req: TranslateRequest) => Promise<Translation>;

interface Pending {
  req: TranslateRequest;
  resolve(r: Translation): void;
  reject(e: unknown): void;
}

/** The first `max` characters, without splitting an emoji or other surrogate pair. */
export function cutToLimit(text: string, max = MAX_TEXT_CHARS): string {
  if (text.length <= max) return text;
  const code = text.charCodeAt(max - 1);
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? max - 1 : max);
}

export interface ClientOptions {
  /** Called with the provider named in each reply (e.g. to tell whether real translation is on). */
  onProvider?: (provider: ProviderName) => void;
}

export function createTranslateClient(transport: Transport, { onProvider }: ClientOptions = {}): Translate {
  const queues = new Map<string, Pending[]>();

  /** `partial`: a single over-long text, cut to the server's limit so it can't sink a batch. */
  function send(group: Pending[], partial = false) {
    const { target, source } = group[0]!.req;
    const texts = group.map(p => (partial ? cutToLimit(p.req.text) : p.req.text));
    transport({ target, ...(source ? { source } : {}), texts })
      .then(({ provider, translations }) => {
        if (translations.length !== group.length) throw new Error('Wrong number of translations');
        onProvider?.(provider);
        group.forEach((p, i) => p.resolve(partial ? { ...translations[i]!, partial: true } : translations[i]!));
      })
      .catch(e => group.forEach(p => p.reject(e)));
  }

  function flush(key: string) {
    const items = queues.get(key) ?? [];
    queues.delete(key);
    // Split to stay inside the server's limits (core.ts).
    let group: Pending[] = [];
    let chars = 0;
    for (const p of items) {
      if (p.req.text.length > MAX_TEXT_CHARS) {
        send([p], true);
        continue;
      }
      if (group.length && (group.length >= MAX_BATCH || chars + p.req.text.length > MAX_TOTAL_CHARS)) {
        send(group);
        group = [];
        chars = 0;
      }
      group.push(p);
      chars += p.req.text.length;
    }
    if (group.length) send(group);
  }

  return req =>
    new Promise<Translation>((resolve, reject) => {
      const key = `${req.target}|${req.source ?? ''}`;
      const queue = queues.get(key);
      if (queue) queue.push({ req, resolve, reject });
      else {
        queues.set(key, [{ req, resolve, reject }]);
        queueMicrotask(() => flush(key));
      }
    });
}

/** Through the `translate` Edge Function; supabase-js sends the signed-in user's token. */
export function edgeFunctionTransport(supabase: SupabaseClient): Transport {
  return async batch => {
    const { data, error } = await supabase.functions.invoke<TranslateResponse>('translate', { body: batch });
    if (error) throw error;
    if (!data || !Array.isArray(data.translations)) throw new Error('Unexpected reply from translate');
    return data;
  };
}
