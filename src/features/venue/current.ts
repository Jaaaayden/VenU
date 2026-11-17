// Where the person is right now: the venue they last opened, and optionally the spot in it
// (a facility, e.g. Entry 4). Kept on this device per account, so the next person on a shared
// phone starts fresh. The help request, the emergency "call venue staff" number and the volunteer
// home all read it.
//
// e.g. { venueId: 'crypto-arena', facilityId: 'star-plaza-entrance' } = "Near Star Plaza Entrance, Crypto.com Arena".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { getFacility, getVenue } from './mock';

export interface WhereAmI {
  venueId: string;
  /** A facility id in that venue, or null when they haven't said where they are. */
  facilityId: string | null;
}

/** Saved under `venu.whereAmI.<userId>`. */
export const WHERE_KEY = 'venu.whereAmI';
export const DEFAULT_WHERE: WhereAmI = { venueId: 'sofi', facilityId: null };

let owner: string | null = null;
let state: WhereAmI = DEFAULT_WHERE;
let hydrated = false;
let hydration: Promise<void> | null = null;
// Bumped on every owner change, so a read for the previous account never lands.
let generation = 0;
const listeners = new Set<() => void>();

/** A saved value that still names a real venue (and facility), else the default. */
export function validWhere(value: unknown): WhereAmI {
  if (!value || typeof value !== 'object') return DEFAULT_WHERE;
  const { venueId, facilityId } = value as Partial<Record<keyof WhereAmI, unknown>>;
  if (typeof venueId !== 'string' || !getVenue(venueId)) return DEFAULT_WHERE;
  const spot = typeof facilityId === 'string' && getFacility(venueId, facilityId) ? facilityId : null;
  return { venueId, facilityId: spot };
}

function emit() {
  for (const l of listeners) l();
}

function set(next: WhereAmI) {
  if (next.venueId !== state.venueId || next.facilityId !== state.facilityId) {
    state = next;
    emit();
  }
  if (!owner) return; // signed out: holds for this visit only
  AsyncStorage.setItem(`${WHERE_KEY}.${owner}`, JSON.stringify(next)).catch(() => {
    // Storage blocked (private browsing): it still holds for this visit.
  });
}

/** Reads the account's saved value once; later calls return the same promise. */
export function hydrateWhereAmI(): Promise<void> {
  if (!owner) {
    hydrated = true;
    return Promise.resolve();
  }
  if (!hydration) {
    const gen = generation;
    hydration = AsyncStorage.getItem(`${WHERE_KEY}.${owner}`)
      .then(raw => (raw ? validWhere(JSON.parse(raw)) : null))
      .catch(() => null)
      .then(saved => {
        if (gen !== generation) return;
        hydrated = true;
        if (saved) {
          state = saved;
          emit();
        }
      });
  }
  return hydration;
}

/** Runs a change once the saved value is in, so "same venue, keep the spot" sees the real spot. */
function afterHydration(change: () => void): Promise<void> {
  if (hydrated) {
    change();
    return Promise.resolve();
  }
  const gen = generation;
  return hydrateWhereAmI().then(() => {
    if (gen === generation) change();
  });
}

/** Whose venue and spot these are: the signed-in user's id, or null when signed out. */
export function setWhereAmIOwner(userId: string | null) {
  if (userId === owner) return;
  owner = userId;
  generation += 1;
  hydrated = false;
  hydration = null;
  if (state !== DEFAULT_WHERE) {
    state = DEFAULT_WHERE;
    emit();
  }
  if (listeners.size) void hydrateWhereAmI();
}

export function getWhereAmI(): WhereAmI {
  return state;
}

/** Opening a venue makes it current; a different venue forgets the old spot. */
export function setCurrentVenue(venueId: string): Promise<void> {
  if (!getVenue(venueId)) return Promise.resolve();
  return afterHydration(() => set(venueId === state.venueId ? state : { venueId, facilityId: null }));
}

/** The spot in the current venue (a facility id), or null to clear it. */
export function setCurrentSpot(facilityId: string | null): Promise<void> {
  return afterHydration(() => {
    if (facilityId !== null && !getFacility(state.venueId, facilityId)) return;
    set({ ...state, facilityId });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void hydrateWhereAmI();
  return () => {
    listeners.delete(listener);
  };
}

/** The current venue and spot; re-renders when either changes. */
export function useWhereAmI(): WhereAmI {
  return useSyncExternalStore(subscribe, getWhereAmI, getWhereAmI);
}

/** Tests only: back to a fresh start. */
export function resetWhereAmIForTests() {
  owner = null;
  state = DEFAULT_WHERE;
  hydrated = false;
  hydration = null;
  generation += 1;
  listeners.clear();
}
