// Which alerts someone wants, kept on this device under one key until push notifications exist.
// e.g. { volunteer: true, chat: true, venue: false, reports: true } = everything but venue alerts.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationKind = 'volunteer' | 'chat' | 'venue' | 'reports';
export type NotificationPrefs = Record<NotificationKind, boolean>;

export const NOTIFICATION_KEY = 'venu.notifications';

export const NOTIFICATION_OPTIONS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: 'volunteer', label: 'Volunteer updates', hint: 'e.g. Daniel accepted and is on his way' },
  { kind: 'chat', label: 'Chat messages', hint: 'New messages from your helper or visitor' },
  { kind: 'venue', label: 'Venue alerts', hint: 'e.g. Gate C at SoFi Stadium is closed' },
  { kind: 'reports', label: 'Report replies', hint: 'When staff answer a facility report' },
];

export const DEFAULT_PREFS: NotificationPrefs = { volunteer: true, chat: true, venue: true, reports: true };

/** Saved choices over the defaults; a missing or broken entry gives the defaults. */
export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Record<string, unknown>>) : {};
    const prefs = { ...DEFAULT_PREFS };
    for (const { kind } of NOTIFICATION_OPTIONS) if (typeof saved[kind] === 'boolean') prefs[kind] = saved[kind];
    return prefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked (private browsing): the switch still flips for this visit.
  }
}
