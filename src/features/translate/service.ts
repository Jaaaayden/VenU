// The app's translator and cache. Supabase and mock modes call the `translate` Edge Function;
// local mode (no Supabase) uses the offline stub. Also remembers which provider answered last, so
// the chat only promises "will see this translated" when a real one is on.
import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

import { createTranslationCache } from './cache';
import { createTranslateClient, edgeFunctionTransport, type ProviderName, type Transport } from './client';
import { localStub } from './local';

let provider: ProviderName | null = supabase ? null : 'stub';
const providerListeners = new Set<() => void>();

const stubTransport: Transport = async batch => ({ provider: 'stub', translations: await localStub.translator.translate(batch) });

export const translate = createTranslateClient(supabase ? edgeFunctionTransport(supabase) : stubTransport, {
  onProvider(name) {
    if (name === provider) return;
    provider = name;
    providerListeners.forEach(l => l());
  },
});

export const translationCache = createTranslationCache(translate);

/** The provider that answered last ('anthropic', 'deepl', 'stub'), or null before any reply. */
export function useTranslationProvider(): ProviderName | null {
  return useSyncExternalStore(
    l => {
      providerListeners.add(l);
      return () => { providerListeners.delete(l); };
    },
    () => provider,
    () => provider,
  );
}

/** True once a real translator (not the offline stub) has answered. */
export function isRealProvider(name: ProviderName | null): boolean {
  return name === 'anthropic' || name === 'deepl';
}
