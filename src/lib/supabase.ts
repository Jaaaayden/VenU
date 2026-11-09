import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Set these in `.env.local` (see .env.example). Without them the app runs in local mode: auth is
// skipped and profiles are saved on the device only. `npm run dev:local|mock|supabase` picks a mode.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Web static rendering runs this module in Node, where there's no storage to persist to.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          ...(isServer ? {} : { storage: AsyncStorage }),
          autoRefreshToken: !isServer,
          persistSession: !isServer,
          detectSessionInUrl: false,
          // No `lock`: supabase-js 2.107+ coordinates refreshes without one, and v3 removes the option.
        },
      })
    : null;

// Only refresh tokens while the app is in the foreground (Supabase's RN guidance).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const AVATAR_BUCKET = 'avatars';
