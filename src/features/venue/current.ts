// Where the person is right now: the venue they last opened, and optionally the spot in it
// (a facility, e.g. Gate 2). Kept on this device under one key. The help request, the emergency
// "call venue staff" number and the volunteer home all read it.
//
// e.g. { venueId: 'crypto-arena', facilityId: 'gate-2' } = "Near Gate 2, Crypto.com Arena".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { getFacility, getVenue } from './mock';

export interface WhereAmI {
  venueId: string;
  /** A facility id in that venue, or null when they haven't said where they are. */
  facilityId: string | null;
}

export const WHERE_KEY = 'venu.whereAmI';
export const DEFAULT_WHERE: WhereAmI = { venueId: 'sofi', facilityId: null };

let state: WhereAmI = DEFAULT_WHERE;
// Set by the first change, so a slow read of the saved value never overwrites it.
let touched = false;
let hydration: Promise<void> | null = null;
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
  touched = true;
  if (next.venueId === state.venueId && next.facilityId === state.facilityId) return;
  state = next;
  emit();
  AsyncStorage.setItem(WHERE_KEY, JSON.stringify(next)).catch(() => {
    // Storage blocked (private browsing): it still holds for this visit.
  });
}

/** Reads the saved value once; later calls return the same promise. */
export function hydrateWhereAmI(): Promise<void> {
  hydration ??= AsyncStorage.getItem(WHERE_KEY)
    .then(raw => {
      if (touched || !raw) return;
      state = validWhere(JSON.parse(raw));
      emit();
    })
    .catch(() => {});
  return hydration;
}

export function getWhereAmI(): WhereAmI {
  return state;
}

/** Opening a venue makes it current; a different venue forgets the old spot. */
export function setCurrentVenue(venueId: string) {
  if (!getVenue(venueId)) return;
  set(venueId === state.venueId ? state : { venueId, facilityId: null });
}

/** The spot in the current venue (a facility id), or null to clear it. */
export function setCurrentSpot(facilityId: string | null) {
  if (facilityId !== null && !getFacility(state.venueId, facilityId)) return;
  set({ ...state, facilityId });
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
  state = DEFAULT_WHERE;
  touched = false;
  hydration = null;
  listeners.clear();
}
