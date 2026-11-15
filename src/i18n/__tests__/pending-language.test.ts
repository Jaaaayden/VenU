import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { readPendingSetup } from '@/features/auth/pending-setup';

import { choosePendingLanguage, forgetLanguagePick, refreshPendingLanguage, rememberAccountLanguage } from '../pending-language';

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
});
