import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearSavedDraft, parseSavedDraft, readSavedDraft, SETUP_DRAFT_KEY, writeSavedDraft } from '../setup-draft-storage';
import { emptyDraft } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const volunteer = { ...emptyDraft('volunteer', 'es'), gender: 'woman' as const, ageBand: 'under_40' as const, trainings: ['first_aid' as const] };

describe('setup answers kept across a reload', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('gives back what the same account answered', async () => {
    await writeSavedDraft('u1', volunteer);
    expect(await readSavedDraft('u1')).toEqual(volunteer);
  });

  it("doesn't hand one account's answers to another on the same device", async () => {
    await writeSavedDraft('u1', volunteer);
    expect(await readSavedDraft('u2')).toBeNull();
    expect(await readSavedDraft(null)).toBeNull();
  });

  it('is gone after setup saves or the account signs out', async () => {
    await writeSavedDraft('u1', volunteer);
    await clearSavedDraft();
    expect(await AsyncStorage.getItem(SETUP_DRAFT_KEY)).toBeNull();
  });

  it('fills fields an older version did not save, and ignores junk', () => {
    const old = JSON.stringify({ userId: 'u1', draft: { role: 'visitor', languages: ['ko'], mainLanguage: 'ko', firstName: 'Min' } });
    expect(parseSavedDraft(old, 'u1')).toEqual({ ...emptyDraft('visitor', 'ko'), firstName: 'Min' });
    expect(parseSavedDraft('{not json', 'u1')).toBeNull();
    expect(parseSavedDraft(JSON.stringify({ userId: 'u1', draft: { role: 'admin', languages: [], mainLanguage: 'en' } }), 'u1')).toBeNull();
  });
});
