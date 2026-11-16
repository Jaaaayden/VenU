import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_WHERE, getWhereAmI, hydrateWhereAmI, resetWhereAmIForTests, setCurrentSpot, setCurrentVenue, validWhere, WHERE_KEY } from '../current';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const saved = async () => JSON.parse((await AsyncStorage.getItem(WHERE_KEY)) ?? 'null');

describe('where am I', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetWhereAmIForTests();
  });

  it('starts at SoFi with no spot', async () => {
    await hydrateWhereAmI();
    expect(getWhereAmI()).toEqual(DEFAULT_WHERE);
  });

  it('saves the venue and spot under one key', async () => {
    setCurrentVenue('crypto-arena');
    setCurrentSpot('star-plaza-entrance');
    expect(getWhereAmI()).toEqual({ venueId: 'crypto-arena', facilityId: 'star-plaza-entrance' });
    await Promise.resolve();
    expect(await saved()).toEqual({ venueId: 'crypto-arena', facilityId: 'star-plaza-entrance' });
  });

  it('opening another venue forgets the spot; reopening the same one keeps it', () => {
    setCurrentSpot('entry-4');
    setCurrentVenue('sofi');
    expect(getWhereAmI().facilityId).toBe('entry-4');
    setCurrentVenue('intuit-dome');
    expect(getWhereAmI()).toEqual({ venueId: 'intuit-dome', facilityId: null });
  });

  it('ignores unknown venues and facilities', () => {
    setCurrentVenue('nowhere');
    setCurrentSpot('not-a-facility');
    expect(getWhereAmI()).toEqual(DEFAULT_WHERE);
  });

  it('reads back a saved value, dropping stale ids', async () => {
    await AsyncStorage.setItem(WHERE_KEY, JSON.stringify({ venueId: 'intuit-dome', facilityId: 'main-entrance' }));
    await hydrateWhereAmI();
    expect(getWhereAmI()).toEqual({ venueId: 'intuit-dome', facilityId: 'main-entrance' });
    expect(validWhere({ venueId: 'sofi', facilityId: 'gone' })).toEqual({ venueId: 'sofi', facilityId: null });
    expect(validWhere({ venueId: 'gone' })).toEqual(DEFAULT_WHERE);
    expect(validWhere('{bad')).toEqual(DEFAULT_WHERE);
  });

  it('opening the default venue before the saved value loads still saves it', async () => {
    await AsyncStorage.setItem(WHERE_KEY, JSON.stringify({ venueId: 'intuit-dome', facilityId: null }));
    const loading = hydrateWhereAmI();
    setCurrentVenue('sofi');
    await loading;
    expect(getWhereAmI().venueId).toBe('sofi');
    expect((await saved()).venueId).toBe('sofi');
  });

  it('a change made before the saved value loads wins', async () => {
    await AsyncStorage.setItem(WHERE_KEY, JSON.stringify({ venueId: 'intuit-dome', facilityId: null }));
    const loading = hydrateWhereAmI();
    setCurrentVenue('crypto-arena');
    await loading;
    expect(getWhereAmI().venueId).toBe('crypto-arena');
  });
});
