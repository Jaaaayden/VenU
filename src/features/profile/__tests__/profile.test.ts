import { describe, expect, it } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

import { draftToWrite, rowToProfile, type ProfileRow } from '../mapping';
import { searchLanguages } from '../options';
import { PRIVACY_VERSION } from '../privacy';
import { createLocalStore, createSupabaseStore, type KeyValueStorage } from '../store';
import { helperSummary, initials } from '../summary';
import { draftFromProfile, emptyDraft, homeFor, type ProfileDraft } from '../types';
import { isValid, validateDraft } from '../validate';

const rosa: ProfileDraft = {
  ...emptyDraft('visitor', 'es'),
  firstName: '  Rosa ',
  languages: ['es', 'en'],
  accessNeeds: ['wheelchair'],
  privacyAccepted: true,
};

const daniel: ProfileDraft = {
  ...emptyDraft('volunteer', 'en'),
  firstName: 'Daniel',
  languages: ['en', 'es'],
  trainings: ['wheelchair'],
  gender: 'man',
  ageBand: 'under_40',
  privacyAccepted: true,
};

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async k => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async k => void data.delete(k),
  };
}

describe('validateDraft', () => {
  it('accepts complete visitor and volunteer drafts', () => {
    expect(validateDraft(rosa)).toEqual({});
    expect(validateDraft(daniel)).toEqual({});
  });

  it('flags every missing required field for a blank draft', () => {
    const errors = validateDraft({ ...emptyDraft('volunteer'), languages: [] });
    expect(Object.keys(errors).sort()).toEqual(['ageBand', 'firstName', 'gender', 'languages', 'privacyAccepted']);
    expect(isValid(errors)).toBe(false);
  });

  it('requires the main language to be in the list', () => {
    expect(validateDraft({ ...rosa, mainLanguage: 'ko' }).languages).toBe('Pick your main language.');
  });

  it('needs a note only when "Other" is picked', () => {
    expect(validateDraft({ ...rosa, accessNeeds: ['other'] }).accessNeedsNote).toBeDefined();
    expect(validateDraft({ ...rosa, accessNeeds: ['other'], accessNeedsNote: 'Service dog' })).toEqual({});
  });

  it("doesn't ask visitors for volunteer fields", () => {
    expect(validateDraft({ ...rosa, gender: null, ageBand: null })).toEqual({});
  });
});

describe('draftToWrite / rowToProfile', () => {
  const at = '2026-11-09T00:00:00.000Z';

  it('round-trips a visitor and trims the name', () => {
    const row: ProfileRow = { id: 'u1', verified: false, ...draftToWrite(rosa, at) };
    const profile = rowToProfile(row);
    expect(profile.firstName).toBe('Rosa');
    expect(profile.privacyVersion).toBe(PRIVACY_VERSION);
    expect(draftFromProfile(profile)).toEqual({ ...rosa, firstName: 'Rosa' });
  });

  it('clears fields that belong to the other role', () => {
    const visitorWithStrayData = { ...rosa, trainings: ['asl' as const], gender: 'woman' as const, accessNeedsNote: 'stale' };
    const w = draftToWrite(visitorWithStrayData, at);
    expect(w.trainings).toEqual([]);
    expect(w.gender).toBeNull();
    expect(w.access_needs_note).toBeNull(); // "other" not selected

    const v = draftToWrite({ ...daniel, accessNeeds: ['wheelchair'], helperGenderPref: 'woman' }, at);
    expect(v.access_needs).toEqual([]);
    expect(v.helper_gender_pref).toBe('none');
    expect(v.trainings).toEqual(['wheelchair']);
  });
});

describe('local store', () => {
  it('saves, reads back, keeps role and consent time on edit, and deletes', async () => {
    const storage = memoryStorage();
    const store = createLocalStore(storage);

    expect(await store.get('u1')).toBeNull();
    const created = await store.save('u1', rosa, null);
    expect(created.verified).toBe(false);
    expect(await store.get('u1')).toEqual(created);

    const edited = await store.save('u1', { ...rosa, role: 'volunteer', firstName: 'Rosa M' }, created);
    expect(edited.firstName).toBe('Rosa M');
    expect(edited.role).toBe('visitor');
    expect(edited.privacyAcceptedAt).toBe(created.privacyAcceptedAt);

    await store.deleteAll('u1');
    expect(await store.get('u1')).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('keeps web photos as data URIs so they survive a reload', async () => {
    const store = createLocalStore(memoryStorage());
    expect(await store.uploadAvatar('u1', { uri: 'blob:x', mimeType: 'image/png', base64: 'AAA' })).toBe('data:image/png;base64,AAA');
    expect(await store.uploadAvatar('u1', { uri: 'file:///a.jpg', mimeType: null })).toBe('file:///a.jpg');
  });
});

describe('helperSummary', () => {
  it('lists main language first, then needs (visitor)', () => {
    expect(helperSummary({ ...rosa, communication: ['speaking', 'text'] })).toEqual([
      'Speaks Spanish, English',
      'Wheelchair user',
      'Prefers text / writing',
    ]);
  });

  it('lists languages and training (volunteer)', () => {
    expect(helperSummary(daniel)).toEqual(['Speaks English, Spanish', 'Wheelchair trained']);
  });
});

describe('small helpers', () => {
  it('initials', () => {
    expect(initials('Daniel Martinez')).toBe('DM');
    expect(initials('rosa')).toBe('R');
    expect(initials('  ')).toBe('?');
  });

  it('language search ignores case and accents and matches English names', () => {
    expect(searchLanguages('espanol').map(l => l.code)).toEqual(['es']);
    expect(searchLanguages('KOREAN').map(l => l.code)).toEqual(['ko']);
    expect(searchLanguages('sign').map(l => l.code)).toEqual(['ase']);
  });
});

describe('review fixes', () => {
  const at = '2026-11-09T00:00:00.000Z';
  const saved = rowToProfile({ id: 'u1', verified: false, ...draftToWrite(rosa, at) });

  it('asks for consent again once the policy version changes', () => {
    expect(draftFromProfile(saved).privacyAccepted).toBe(true);
    expect(draftFromProfile({ ...saved, privacyVersion: 'old-version' }).privacyAccepted).toBe(false);
  });

  it('sends each role to its own home tab', () => {
    expect(homeFor({ role: 'visitor' })).toBe('/venue');
    expect(homeFor({ role: 'volunteer' })).toBe('/volunteer');
  });

  it('turns a storage quota error on a photo into a readable message', async () => {
    const full: KeyValueStorage = { ...memoryStorage(), setItem: async () => { throw new Error('QuotaExceededError'); } };
    const store = createLocalStore(full);
    await expect(store.save('u1', { ...rosa, avatarPath: 'data:image/png;base64,AAA' }, null)).rejects.toThrow('too big');
    await expect(store.save('u1', rosa, null)).rejects.toThrow('QuotaExceededError');
  });
});

describe('supabase store', () => {
  function fakeClient({ listError = null as Error | null, removeError = null as Error | null } = {}) {
    const calls: string[] = [];
    const bucket = {
      list: async (dir: string) => (calls.push(`list ${dir}`), { data: listError ? null : [{ name: 'avatar' }], error: listError }),
      remove: async (paths: string[]) => (calls.push(`remove ${paths.join(',')}`), { data: null, error: removeError }),
      upload: async (path: string, _b: ArrayBuffer, o: { contentType: string }) => (calls.push(`upload ${path} ${o.contentType}`), { error: null }),
    };
    const client = {
      storage: { from: () => bucket },
      from: () => ({ delete: () => ({ eq: async (_c: string, id: string) => (calls.push(`delete row ${id}`), { error: null }) }) }),
    };
    return { client: client as unknown as SupabaseClient, calls };
  }

  it('deletes photos, then the row', async () => {
    const { client, calls } = fakeClient();
    await createSupabaseStore(client, 'avatars').deleteAll('u1');
    expect(calls).toEqual(['list u1', 'remove u1/avatar', 'delete row u1']);
  });

  it('keeps the row and throws when the photo can\'t be removed', async () => {
    for (const opts of [{ listError: new Error('list failed') }, { removeError: new Error('remove failed') }]) {
      const { client, calls } = fakeClient(opts);
      await expect(createSupabaseStore(client, 'avatars').deleteAll('u1')).rejects.toThrow('failed');
      expect(calls).not.toContain('delete row u1');
    }
  });

  it('always uploads to one fixed path, whatever the format', async () => {
    const { client, calls } = fakeClient();
    const store = createSupabaseStore(client, 'avatars');
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ arrayBuffer: async () => new ArrayBuffer(1) })) as unknown as typeof fetch;
    try {
      expect(await store.uploadAvatar('u1', { uri: 'file:///a.png', mimeType: 'image/png' })).toBe('u1/avatar');
      expect(await store.uploadAvatar('u1', { uri: 'file:///b.jpg', mimeType: 'image/jpeg' })).toBe('u1/avatar');
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(calls).toEqual(['upload u1/avatar image/png', 'upload u1/avatar image/jpeg']);
  });
});
