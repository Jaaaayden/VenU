import type { SupabaseClient } from '@supabase/supabase-js';

import { draftToWrite, rowToProfile, type ProfileRow } from './mapping';
import { PRIVACY_VERSION } from './privacy';
import type { Profile, ProfileDraft } from './types';

export interface PickedImage {
  uri: string;
  mimeType: string | null;
  /** Present on web, where blob: URIs don't survive a reload. */
  base64?: string | null;
}

/** Persistence for the signed-in user's own profile. Swap implementations without touching screens. */
export interface ProfileStore {
  get(userId: string): Promise<Profile | null>;
  /** Creates or updates. `existing` keeps the original consent time unless the policy version changed. */
  save(userId: string, draft: ProfileDraft, existing: Profile | null): Promise<Profile>;
  /** Stores the picked image and returns the value to keep in `avatarPath`. */
  uploadAvatar(userId: string, image: PickedImage): Promise<string>;
  removeAvatar(path: string): Promise<void>;
  /** A URL `expo-image` can show, or null. */
  avatarUrl(path: string): Promise<string | null>;
  /** Removes the profile row and photo. */
  deleteAll(userId: string): Promise<void>;
}

function consentTime(existing: Profile | null): string {
  return existing && existing.privacyVersion === PRIVACY_VERSION
    ? existing.privacyAcceptedAt
    : new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Local (device-only) store: used when Supabase isn't configured.

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const localKey = (userId: string) => `venu.profile.${userId}`;

export function createLocalStore(storage: KeyValueStorage): ProfileStore {
  return {
    async get(userId) {
      const raw = await storage.getItem(localKey(userId));
      return raw ? rowToProfile(JSON.parse(raw) as ProfileRow) : null;
    },
    async save(userId, draft, existing) {
      const row: ProfileRow = {
        id: userId,
        verified: existing?.verified ?? false,
        ...draftToWrite(draft, consentTime(existing)),
        // Role is fixed once the profile exists, same as the DB rule.
        ...(existing ? { role: existing.role } : {}),
      };
      try {
        await storage.setItem(localKey(userId), JSON.stringify(row));
      } catch (e) {
        // Web localStorage caps at ~5 MB; a base64 photo is the only thing big enough to hit it.
        if (row.avatar_path?.startsWith('data:')) throw new Error('That photo is too big to keep in local dev mode. Try a smaller one.');
        throw e;
      }
      return rowToProfile(row);
    },
    async uploadAvatar(_userId, image) {
      // Native keeps the picker's cache URI, which the OS may clear. Fine for this dev-only fallback.
      return image.base64 ? `data:${image.mimeType ?? 'image/jpeg'};base64,${image.base64}` : image.uri;
    },
    async removeAvatar() {},
    async avatarUrl(path) {
      return path;
    },
    async deleteAll(userId) {
      await storage.removeItem(localKey(userId));
    },
  };
}

// ---------------------------------------------------------------------------
// Supabase store: `public.profiles` + private `avatars` bucket.

/** Signed photo URLs last this long; the provider re-signs a bit before they expire. */
export const AVATAR_URL_TTL_S = 60 * 60;

export function createSupabaseStore(client: SupabaseClient, bucket: string): ProfileStore {
  const table = () => client.from('profiles');

  return {
    async get(userId) {
      const { data, error } = await table().select('*').eq('id', userId).maybeSingle<ProfileRow>();
      if (error) throw error;
      return data ? rowToProfile(data) : null;
    },
    async save(userId, draft, existing) {
      const write = draftToWrite(draft, consentTime(existing));
      // Role can't change after creation; the column isn't updatable for users.
      const { role: _role, ...updatable } = write;
      const query = existing
        ? table().update(updatable).eq('id', userId)
        : table().insert({ id: userId, ...write });
      const { data, error } = await query.select('*').single<ProfileRow>();
      if (error) throw error;
      return rowToProfile(data);
    },
    async uploadAvatar(userId, image) {
      const contentType = image.mimeType ?? 'image/jpeg';
      // A fresh name per upload (`<uid>/avatar-<ms>`), so the live photo is never overwritten
      // before the row points at the new one; the provider deletes the old file after saving.
      const path = `${userId}/avatar-${Date.now()}`;
      const body = await (await fetch(image.uri)).arrayBuffer();
      const { error } = await client.storage.from(bucket).upload(path, body, { contentType, upsert: true });
      if (error) throw error;
      return path;
    },
    async removeAvatar(path) {
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) throw error;
    },
    async avatarUrl(path) {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, AVATAR_URL_TTL_S);
      return error ? null : data.signedUrl;
    },
    async deleteAll(userId) {
      // Photos first: if that fails, stop, so we never report "deleted" with a photo left behind.
      const listed = await client.storage.from(bucket).list(userId);
      if (listed.error) throw listed.error;
      if (listed.data.length) {
        const removed = await client.storage.from(bucket).remove(listed.data.map(f => `${userId}/${f.name}`));
        if (removed.error) throw removed.error;
      }
      const { error } = await table().delete().eq('id', userId);
      if (error) throw error;
    },
  };
}

/** `PickedImage` replaces the photo, `'remove'` clears it, `null` leaves it as is. */
export type AvatarChange = PickedImage | 'remove' | null;

/**
 * Saves a profile and its photo change in a safe order: upload the new photo to a fresh
 * path, save the row, and only then delete the old file. A failed save leaves the old
 * photo and row untouched (and cleans up the new upload).
 */
export async function saveWithAvatar(
  store: ProfileStore,
  userId: string,
  draft: ProfileDraft,
  avatar: AvatarChange,
  existing: Profile | null,
): Promise<Profile> {
  const previous = existing?.avatarPath ?? null;
  const uploaded = avatar && avatar !== 'remove' ? await store.uploadAvatar(userId, avatar) : null;
  const avatarPath = avatar === 'remove' ? null : (uploaded ?? previous);
  let saved: Profile;
  try {
    saved = await store.save(userId, { ...draft, avatarPath }, existing);
  } catch (e) {
    if (uploaded) await store.removeAvatar(uploaded).catch(() => {});
    throw e;
  }
  // Best effort: if this fails the file is orphaned in the user's own folder, and deleteAll sweeps it.
  if (previous && previous !== avatarPath) await store.removeAvatar(previous).catch(() => {});
  return saved;
}
