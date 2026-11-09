import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as auth from '@/lib/auth';
import { AVATAR_BUCKET, supabase } from '@/lib/supabase';

import { AVATAR_URL_TTL_S, createLocalStore, createSupabaseStore, type PickedImage, type ProfileStore } from './store';
import type { Profile, ProfileDraft } from './types';

const store: ProfileStore = supabase
  ? createSupabaseStore(supabase, AVATAR_BUCKET)
  : createLocalStore(AsyncStorage);

/** `error`: couldn't load (e.g. offline); the saved session is kept and `refresh()` retries. */
type Status = 'loading' | 'signedOut' | 'ready' | 'error';

/** `PickedImage` replaces the photo, `'remove'` clears it, `null` leaves it as is. */
export type AvatarChange = PickedImage | 'remove' | null;

interface ProfileContextValue {
  status: Status;
  userId: string | null;
  profile: Profile | null;
  avatarUrl: string | null;
  /** Re-reads the session and profile; returns the profile (null if none yet). */
  refresh(): Promise<Profile | null>;
  save(draft: ProfileDraft, avatar: AvatarChange): Promise<Profile>;
  deleteAll(): Promise<void>;
  signOut(): Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface Session {
  userId: string | null;
  profile: Profile | null;
  avatarUrl: string | null;
}

async function loadSession(): Promise<Session> {
  const userId = await auth.currentUserId();
  const profile = userId ? await store.get(userId) : null;
  const avatarUrl = profile?.avatarPath ? await store.avatarUrl(profile.avatarPath) : null;
  return { userId, profile, avatarUrl };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const applyProfile = useCallback(async (p: Profile | null) => {
    const url = p?.avatarPath ? await store.avatarUrl(p.avatarPath) : null;
    setProfile(p);
    setAvatarUrl(url);
  }, []);

  const applySession = useCallback((s: Session) => {
    setUserId(s.userId);
    setProfile(s.profile);
    setAvatarUrl(s.avatarUrl);
    setStatus(s.userId ? 'ready' : 'signedOut');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await loadSession();
      applySession(s);
      return s.profile;
    } catch (e) {
      setStatus('error');
      throw e;
    }
  }, [applySession]);

  // Startup load. A failure (e.g. offline) is 'error', not 'signedOut', so a saved session isn't thrown away.
  useEffect(() => {
    let alive = true;
    loadSession()
      .then(s => alive && applySession(s))
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [applySession]);

  // Session ended elsewhere (token revoked/expired, signed out on another tab): drop to signed out.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') applySession({ userId: null, profile: null, avatarUrl: null });
    });
    return () => data.subscription.unsubscribe();
  }, [applySession]);

  // Signed photo URLs expire; re-sign shortly before they do while the app stays open.
  const avatarPath = profile?.avatarPath ?? null;
  useEffect(() => {
    if (!supabase || !avatarPath) return;
    const timer = setInterval(() => {
      store.avatarUrl(avatarPath).then(url => url && setAvatarUrl(url)).catch(() => {});
    }, (AVATAR_URL_TTL_S - 5 * 60) * 1000);
    return () => clearInterval(timer);
  }, [avatarPath]);

  const save = useCallback(
    async (draft: ProfileDraft, avatar: AvatarChange) => {
      if (!userId) throw new Error('Not signed in');
      let avatarPath = profile?.avatarPath ?? null;
      if (avatar === 'remove') {
        if (avatarPath) await store.removeAvatar(avatarPath);
        avatarPath = null;
      } else if (avatar) {
        avatarPath = await store.uploadAvatar(userId, avatar);
      }
      const saved = await store.save(userId, { ...draft, avatarPath }, profile);
      await applyProfile(saved);
      return saved;
    },
    [userId, profile, applyProfile],
  );

  const deleteAll = useCallback(async () => {
    if (!userId) return;
    await store.deleteAll(userId);
    await applyProfile(null);
  }, [userId, applyProfile]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUserId(null);
    await applyProfile(null);
    setStatus('signedOut');
  }, [applyProfile]);

  const value = useMemo(
    () => ({ status, userId, profile, avatarUrl, refresh, save, deleteAll, signOut }),
    [status, userId, profile, avatarUrl, refresh, save, deleteAll, signOut],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
