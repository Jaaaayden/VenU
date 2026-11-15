// The app's translator and cache. Supabase and mock modes call the `translate` Edge Function;
// local mode (no Supabase) uses the offline stub.
import { supabase } from '@/lib/supabase';

import { createTranslationCache } from './cache';
import { createTranslateClient, edgeFunctionTransport } from './client';
import { localStub } from './local';

export const translate = createTranslateClient(supabase ? edgeFunctionTransport(supabase) : localStub.translator.translate);

export const translationCache = createTranslationCache(translate);
