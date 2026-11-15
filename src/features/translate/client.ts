// translate({ text, target, source? }) → { text, detectedSource }, for the app. Calls made in the same
// tick for the same languages go out as one batch (a chat that opens with 5 messages is one request).
// The transport is the only part that knows where translations come from: the `translate` Edge
// Function (Supabase and mock modes) or the offline stub (local mode). No provider keys in the app.
import type { SupabaseClient } from '@supabase/supabase-js';

import { MAX_BATCH, MAX_TOTAL_CHARS, type TranslateBatch, type TranslateResponse, type TranslateResult } from '../../../supabase/functions/translate/core';

export type { TranslateResult } from '../../../supabase/functions/translate/core';

export interface TranslateRequest {
  text: string;
  target: string;
  source?: string;
}

/** Sends one batch, resolves with one result per text in order; rejects on any failure. */
export type Transport = (batch: TranslateBatch) => Promise<TranslateResult[]>;

export type Translate = (req: TranslateRequest) => Promise<TranslateResult>;

interface Pending {
  req: TranslateRequest;
  resolve(r: TranslateResult): void;
  reject(e: unknown): void;
}

export function createTranslateClient(transport: Transport): Translate {
  const queues = new Map<string, Pending[]>();

  function send(group: Pending[]) {
    const { target, source } = group[0]!.req;
    transport({ target, ...(source ? { source } : {}), texts: group.map(p => p.req.text) }).then(
      results => {
        if (results.length !== group.length) throw new Error('Wrong number of translations');
        group.forEach((p, i) => p.resolve(results[i]!));
      },
    ).catch(e => group.forEach(p => p.reject(e)));
  }

  function flush(key: string) {
    const items = queues.get(key) ?? [];
    queues.delete(key);
    // Split to stay inside the server's limits (core.ts).
    let group: Pending[] = [];
    let chars = 0;
    for (const p of items) {
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
    new Promise<TranslateResult>((resolve, reject) => {
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
    return data.translations;
  };
}
