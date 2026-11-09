import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as auth from '@/lib/auth';
import { AVATAR_BUCKET, supabase } from '@/lib/supabase';

import { createLocalStore, createSupabaseStore, type PickedImage, type ProfileStore } from './store';
import type { Profile, ProfileDraft } from './types';

const store: ProfileStore = supabase
  ? createSupabaseStore(supabase, AVATAR_BUCKET)
  : createLocalStore(AsyncStorage);

type Status = 'loading' | 'signedOut' | 'ready';

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
    const s = await loadSession();
    applySession(s);
    return s.profile;
  }, [applySession]);

  useEffect(() => {
    let alive = true;
    loadSession()
      .then(s => alive && applySession(s))
      .catch(() => alive && setStatus('signedOut'));
    return () => {
      alive = false;
    };
  }, [applySession]);

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
