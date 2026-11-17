import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  availabilityKey,
  getAvailability,
  hydrateAvailability,
  resetAvailabilityForTests,
  setAvailability,
  setAvailabilityStorage,
  type Availability,
  type AvailabilityStorage,
} from '../availability';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** Reads a user's status as a fresh app start would. */
async function reload(userId: string): Promise<Availability> {
  resetAvailabilityForTests();
  await hydrateAvailability(userId);
  return getAvailability(userId).status;
}

describe('volunteer availability', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetAvailabilityForTests();
  });

  it('starts Free, and not ready until the saved status is read', async () => {
    expect(getAvailability('u1')).toEqual({ status: 'free', ready: false });
    await hydrateAvailability('u1');
    expect(getAvailability('u1')).toEqual({ status: 'free', ready: true });
  });

  it('round-trips a change through storage', async () => {
    await setAvailability('u1', 'busy');
    expect(getAvailability('u1')).toEqual({ status: 'busy', ready: true });
    expect(await AsyncStorage.getItem(availabilityKey('u1'))).toBe('busy');
    expect(await reload('u1')).toBe('busy');
  });

  it('keeps each user on a shared phone separate', async () => {
    await setAvailability('u1', 'off');
    expect(await reload('u2')).toBe('free');
    expect(await reload('u1')).toBe('off');
    expect(await AsyncStorage.getAllKeys()).toEqual([availabilityKey('u1')]);
  });

  it('falls back to Free for broken stored values', async () => {
    for (const raw of ['away', '"busy"', '', 'FREE', '{not json']) {
      await AsyncStorage.setItem(availabilityKey('u1'), raw);
      expect(await reload('u1')).toBe('free');
    }
  });

  it('never lets a slow read overwrite a change made meanwhile', async () => {
    await AsyncStorage.setItem(availabilityKey('u1'), 'off');
    const reading = hydrateAvailability('u1');
    await setAvailability('u1', 'busy');
    await reading;
    expect(getAvailability('u1').status).toBe('busy');
  });

  it('runs on any storage, e.g. a server table later', async () => {
    const rows = new Map<string, Availability>([['u1', 'busy']]);
    const server: AvailabilityStorage = {
      load: async id => rows.get(id) ?? null,
      save: async (id, status) => void rows.set(id, status),
    };
    setAvailabilityStorage(server);
    await hydrateAvailability('u1');
    expect(getAvailability('u1').status).toBe('busy');
    await setAvailability('u1', 'off');
    expect(rows.get('u1')).toBe('off');
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('shows Free when storage fails', async () => {
    setAvailabilityStorage({ load: () => Promise.reject(new Error('offline')), save: () => Promise.reject(new Error('offline')) });
    await hydrateAvailability('u1');
    expect(getAvailability('u1')).toEqual({ status: 'free', ready: true });
    await expect(setAvailability('u1', 'busy')).resolves.toBeUndefined();
    expect(getAvailability('u1').status).toBe('busy');
  });
});
