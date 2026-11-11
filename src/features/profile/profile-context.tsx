import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import * as auth from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { AVATAR_BUCKET, supabase } from '@/lib/supabase';

import {
  AVATAR_URL_TTL_S,
  createLocalStore,
  createSupabaseStore,
  saveWithAvatar,
  type AvatarChange,
  type PendingUpload,
  type ProfileStore,
} from './store';
import type { Profile, ProfileDraft } from './types';

const store: ProfileStore = supabase
  ? createSupabaseStore(supabase, AVATAR_BUCKET)
  : createLocalStore(AsyncStorage);

/** `error`: couldn't load (e.g. offline); the saved session is kept and `refresh()` retries. */
type Status = 'loading' | 'signedOut' | 'ready' | 'error';

export type { AvatarChange };

interface ProfileContextValue {
  status: Status;
  /** Why loading failed, as one plain sentence (set while status is 'error'). */
  loadError: string | null;
  userId: string | null;
  profile: Profile | null;
  avatarUrl: string | null;
  /** Re-reads the session and profile; returns the profile (null if none yet). */
  refresh(): Promise<Profile | null>;
  save(draft: ProfileDraft, avatar: AvatarChange): Promise<Profile>;
  /** Deletes the profile and photos, then signs out (one step, so no screen sees "signed in, no profile"). */
  deleteAll(): Promise<void>;
  signOut(): Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface Session {
  userId: string | null;
  profile: Profile | null;
  avatarUrl: string | null;
}

const SIGNED_OUT: Session = { userId: null, profile: null, avatarUrl: null };

/** The one place a stored photo path becomes a displayable URL. */
function urlFor(p: Profile | null): Promise<string | null> {
  return p?.avatarPath ? store.avatarUrl(p.avatarPath) : Promise.resolve(null);
}

async function loadSession(): Promise<Session> {
  const userId = await auth.currentUserId();
  const profile = userId ? await store.get(userId) : null;
  return { userId, profile, avatarUrl: await urlFor(profile) };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Uploads kept after network-failed saves, reused by the next retry (see saveWithAvatar).
  const pendingUploads = useRef<PendingUpload[]>([]);
  // Last applied user, read by the auth listener (a ref, so the listener needn't resubscribe).
  const userIdRef = useRef<string | null>(null);
  // When the current photo URL was signed, so a foreground resume only re-signs near expiry.
  const signedAt = useRef(0);
  // Bumped by every load and every sign-out, so a slow load that finishes after something newer
  // happened (a sign-out, a sign-in, another load) is discarded instead of overwriting it.
  const generation = useRef(0);

  const setSignedUrl = useCallback((url: string | null) => {
    signedAt.current = url ? Date.now() : 0;
    setAvatarUrl(url);
  }, []);

  /** The single place the session changes, including every way of becoming signed out. */
  const applySession = useCallback(
    (s: Session) => {
      // Kept uploads belong to one account; never carry them into another session.
      if (s.userId !== userIdRef.current) pendingUploads.current = [];
      userIdRef.current = s.userId;
      setUserId(s.userId);
      setProfile(s.profile);
      setSignedUrl(s.avatarUrl);
      setStatus(s.userId ? 'ready' : 'signedOut');
      setLoadError(null);
    },
    [setSignedUrl],
  );

  const goSignedOut = useCallback(() => {
    generation.current += 1; // drop any load still in flight
    applySession(SIGNED_OUT);
  }, [applySession]);

  /**
   * Loads the session and applies it, unless something newer happened meanwhile.
   * `quiet` (background reloads: another tab, after a failed delete) keeps the current screen
   * on failure; otherwise a failure shows the "Can't reach VenU" / load-error screen.
   */
  const load = useCallback(
    async (quiet: boolean): Promise<Profile | null> => {
      const mine = ++generation.current;
      try {
        const s = await loadSession();
        if (mine === generation.current) applySession(s);
        return s.profile;
      } catch (e) {
        if (!quiet && mine === generation.current) {
          setLoadError(friendlyError(e));
          setStatus('error');
        }
        throw e;
      }
    },
    [applySession],
  );

  const refresh = useCallback(() => load(false), [load]);

  // Startup load. A failure (e.g. offline) is 'error', not 'signedOut', so a saved session isn't thrown away.
  useEffect(() => {
    load(false).catch(() => {});
  }, [load]);

  // Session changed elsewhere: signed out (token revoked/expired, another tab) → drop to signed out;
  // someone signed in (another tab, whether this one was signed out or showing a different user)
  // → reload quietly, so we never show A's data under B's session or sit on sign-in with a live
  // session, and a blip doesn't throw this tab onto the error screen.
  // INITIAL_SESSION is skipped: the startup load above already covers it.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        goSignedOut();
      } else if (session && session.user.id !== userIdRef.current) {
        // Supabase warns against awaiting its own calls inside this callback; defer.
        setTimeout(() => load(true).catch(() => {}), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [goSignedOut, load]);

  // Signed photo URLs expire. Re-sign shortly before they do while the app stays open, and on
  // returning to the foreground (JS timers don't run while a phone app is backgrounded), but only
  // when the URL is near expiry: a new URL makes the image re-download. If there's no URL yet
  // (signing failed, e.g. a blip right after saving), retry soon instead of waiting an hour.
  const avatarPath = profile?.avatarPath ?? null;
  useEffect(() => {
    if (!supabase || !avatarPath) return;
    const refreshAfterMs = (AVATAR_URL_TTL_S - 5 * 60) * 1000;
    // `alive` drops a re-sign that finishes after the photo changed, so it can't overwrite the new URL.
    let alive = true;
    const resign = () => {
      store.avatarUrl(avatarPath).then(url => alive && url && setSignedUrl(url)).catch(() => {});
    };
    const timer = setInterval(resign, refreshAfterMs);
    const retries = signedAt.current === 0 ? [5_000, 30_000, 120_000].map(ms => setTimeout(() => signedAt.current === 0 && resign(), ms)) : [];
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && Date.now() - signedAt.current > refreshAfterMs) resign();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      retries.forEach(clearTimeout);
      sub.remove();
    };
  }, [avatarPath, setSignedUrl]);

  const save = useCallback(
    async (draft: ProfileDraft, avatar: AvatarChange) => {
      if (!userId) throw new Error('Not signed in');
      const saved = await saveWithAvatar(store, userId, draft, avatar, profile, pendingUploads);
      // Someone else signed in (another tab) while this saved: that session wins; don't show A's
      // saved profile under B's session.
      if (userIdRef.current !== userId) return saved;
      generation.current += 1; // a same-user reload that started before this save mustn't put the old profile back
      // Same photo: keep the current URL (no extra round trip, no re-download).
      if (saved.avatarPath !== (profile?.avatarPath ?? null)) setSignedUrl(await urlFor(saved));
      setProfile(saved);
      return saved;
    },
    [userId, profile, setSignedUrl],
  );

  const deleteAll = useCallback(async () => {
    if (!userId) return;
    // Any kept upload is in the folder this sweeps, so it can't be reused afterwards either way.
    pendingUploads.current = [];
    try {
      await store.deleteAll(userId);
    } catch (e) {
      // Part of it may be gone (e.g. the photo). Show what's actually there now, quietly, so the
      // Profile screen stays up to report the failure even if this reload fails too.
      await load(true).catch(() => {});
      throw e;
    }
    // The data is gone; a sign-out hiccup mustn't leave a signed-in user with no profile.
    await auth.signOut().catch(() => {});
    goSignedOut();
  }, [userId, load, goSignedOut]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    goSignedOut();
  }, [goSignedOut]);

  const value = useMemo(
    () => ({ status, loadError, userId, profile, avatarUrl, refresh, save, deleteAll, signOut }),
    [status, loadError, userId, profile, avatarUrl, refresh, save, deleteAll, signOut],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
