import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { readPendingSetup } from '@/features/auth/pending-setup';

import {
  choosePendingLanguage,
  forgetLanguagePick,
  languageSaveFailed,
  refreshPendingLanguage,
  rememberAccountLanguage,
  retryLanguageSave,
  usePendingLanguage,
} from '../pending-language';

// The hook only reads the shared snapshot; outside React, read it the same way.
jest.mock('react', () => ({ ...jest.requireActual<object>('react'), useSyncExternalStore: (_s: unknown, get: () => unknown) => get() }));
const readSnapshot = usePendingLanguage;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('this device language', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await refreshPendingLanguage();
  });

  it('marks a welcome pick until an account takes it, keeping the language', async () => {
    await choosePendingLanguage('es');
    expect(await readPendingSetup()).toEqual({ language: 'es', languagePicked: true });
    await forgetLanguagePick();
    expect(await readPendingSetup()).toEqual({ language: 'es' });
  });

  it("remembers an account's language without marking it as a pick", async () => {
    await choosePendingLanguage('es');
    await rememberAccountLanguage('ko');
    expect(await readPendingSetup()).toEqual({ language: 'ko' });
  });

  it('reads a pick back after a reload', async () => {
    await AsyncStorage.setItem('venu.setup.pending', JSON.stringify({ language: 'ja', languagePicked: true }));
    await refreshPendingLanguage();
    await forgetLanguagePick(); // only clears what the snapshot knows is a pick
    expect(await readPendingSetup()).toEqual({ language: 'ja' });
  });

  it('keeps a pick whose save failed on screen, and clears the error to retry', async () => {
    await choosePendingLanguage('es');
    languageSaveFailed('es', new TypeError('Failed to fetch'));
    expect(readSnapshot()).toMatchObject({ language: 'es', picked: true, saveError: expect.any(TypeError) });
    await refreshPendingLanguage(); // re-reading the same pick doesn't retry by itself
    expect(readSnapshot().saveError).toBeInstanceOf(TypeError);
    retryLanguageSave();
    expect(readSnapshot()).toMatchObject({ language: 'es', picked: true, saveError: null });
    // Picking again (even the same language) also retries.
    languageSaveFailed('es', new Error('offline'));
    await choosePendingLanguage('es');
    expect(readSnapshot().saveError).toBeNull();
  });

  it('keeps which account a venue-pill pick belongs to, and clears it with the pick', async () => {
    await choosePendingLanguage('es', 'rosa');
    expect(readSnapshot()).toMatchObject({ language: 'es', picked: true, pickedBy: 'rosa' });
    expect(await readPendingSetup()).toEqual({ language: 'es', languagePicked: true, languagePickedBy: 'rosa' });
    await refreshPendingLanguage();
    expect(readSnapshot().pickedBy).toBe('rosa'); // read back after a reload
    await forgetLanguagePick();
    expect(await readPendingSetup()).toEqual({ language: 'es' });
    await choosePendingLanguage('fr'); // welcome pill: nobody's
    expect(readSnapshot().pickedBy).toBeUndefined();
  });

  it("doesn't let a refresh that raced a pick put the old language back", async () => {
    await rememberAccountLanguage('ko');
    // A route change refreshes while the welcome pill pick is still being written.
    const refresh = refreshPendingLanguage();
    const pick = choosePendingLanguage('es');
    await Promise.all([refresh, pick]);
    expect(readSnapshot()).toMatchObject({ language: 'es', picked: true });
    // And a refresh started right after a pick reads it, not the storage from before.
    await rememberAccountLanguage('ko');
    const pick2 = choosePendingLanguage('ja');
    await refreshPendingLanguage();
    await pick2;
    expect(readSnapshot()).toMatchObject({ language: 'ja', picked: true });
  });

  it('leaves a newer pick alone when an older save finishes or fails', async () => {
    await choosePendingLanguage('es');
    await choosePendingLanguage('fr'); // picked again while 'es' was saving
    languageSaveFailed('es', new Error('offline'));
    await forgetLanguagePick('es');
    expect(readSnapshot()).toMatchObject({ language: 'fr', picked: true, saveError: null });
    await forgetLanguagePick('fr');
    expect(readSnapshot()).toMatchObject({ language: 'fr', picked: false });
  });
});
