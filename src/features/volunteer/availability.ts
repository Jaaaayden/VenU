// Whether a volunteer takes requests right now: Free (requests reach them), Busy or Off (they skip).
// Kept on this device per user id, so a shared phone never shows one volunteer's status to the next.
// e.g. 'venu.availability.u1' → 'busy'
//
// Matching will need it on the server: likely profiles_volunteers.is_available (free → true).
// A backend replaces the storage with setAvailabilityStorage(); screens keep using useAvailability.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export type Availability = 'free' | 'busy' | 'off';

/** In screen order. Labels: volunteer:home.status.<value>. */
export const AVAILABILITIES: readonly Availability[] = ['free', 'busy', 'off'];
export const DEFAULT_AVAILABILITY: Availability = 'free';

/** Where statuses live, e.g. this device or a server table. */
export interface AvailabilityStorage {
  /** The saved status, or null when there's none (or it can't be read). */
  load(userId: string): Promise<Availability | null>;
  save(userId: string, status: Availability): Promise<void>;
}

export function availabilityKey(userId: string): string {
  return `venu.availability.${userId}`;
}

/** A stored value that is one of the statuses, else null: parseAvailability('away') → null. */
export function parseAvailability(raw: unknown): Availability | null {
  return typeof raw === 'string' && (AVAILABILITIES as readonly string[]).includes(raw) ? (raw as Availability) : null;
}

export const deviceAvailabilityStorage: AvailabilityStorage = {
  async load(userId) {
    try {
      return parseAvailability(await AsyncStorage.getItem(availabilityKey(userId)));
    } catch {
      return null;
    }
  },
  async save(userId, status) {
    try {
      await AsyncStorage.setItem(availabilityKey(userId), status);
    } catch {
      // Storage blocked (private browsing): the status still holds for this visit.
    }
  },
};

export interface AvailabilityState {
  status: Availability;
  /** False until the saved status has been read, so screens don't flash the default. */
  ready: boolean;
}

const FRESH: AvailabilityState = { status: DEFAULT_AVAILABILITY, ready: false };

let storage = deviceAvailabilityStorage;
const states = new Map<string, AvailabilityState>();
// Users whose status changed here; a slow read of the saved one never overwrites that.
const touched = new Set<string>();
const hydrations = new Map<string, Promise<void>>();
// Bumped when the storage is swapped, so a read from the old one never lands.
let generation = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Swaps where statuses are kept (a backend, or a fake in tests). Clears what's loaded. */
export function setAvailabilityStorage(next: AvailabilityStorage) {
  storage = next;
  generation += 1;
  states.clear();
  touched.clear();
  hydrations.clear();
  emit();
}

export function getAvailability(userId: string): AvailabilityState {
  return states.get(userId) ?? FRESH;
}

/** Reads the user's saved status once; later calls return the same promise. */
export function hydrateAvailability(userId: string): Promise<void> {
  let pending = hydrations.get(userId);
  if (!pending) {
    const gen = generation;
    pending = storage
      .load(userId)
      .catch(() => null)
      .then(saved => {
        if (gen !== generation || touched.has(userId)) return;
        states.set(userId, { status: saved ?? DEFAULT_AVAILABILITY, ready: true });
        emit();
      });
    hydrations.set(userId, pending);
  }
  return pending;
}

export function setAvailability(userId: string, status: Availability): Promise<void> {
  touched.add(userId);
  const current = states.get(userId);
  if (current?.ready && current.status === status) return Promise.resolve();
  states.set(userId, { status, ready: true });
  emit();
  return storage.save(userId, status).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The volunteer's status and a setter; re-renders when it changes. */
export function useAvailability(userId: string) {
  const state = useSyncExternalStore(subscribe, () => getAvailability(userId), () => getAvailability(userId));
  useEffect(() => {
    void hydrateAvailability(userId);
  }, [userId]);
  return { ...state, setStatus: (status: Availability) => void setAvailability(userId, status) };
}

/** Tests only: back to a fresh start on this device. */
export function resetAvailabilityForTests() {
  setAvailabilityStorage(deviceAvailabilityStorage);
  listeners.clear();
}
