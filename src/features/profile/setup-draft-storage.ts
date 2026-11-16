/**
 * Keeps the setup answers on this device between steps, so a web reload (or the app being killed)
 * mid-setup resumes where it was instead of starting over. Tied to the account that typed them:
 * another account on the same device starts fresh. Removed when setup saves and on sign-out.
 * The photo isn't kept: a picked web photo is a blob: URL that a reload drops anyway.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyDraft, type ProfileDraft } from './types';

export const SETUP_DRAFT_KEY = 'venu.setup.draft';

interface Saved {
  userId: string;
  draft: ProfileDraft;
}

/**
 * The saved draft if it belongs to `userId`, filled out with today's fields (an older app version
 * may have saved fewer). e.g. parseSavedDraft('{"userId":"u1","draft":{"role":"visitor",…}}', 'u1') → the draft;
 * the same with 'u2' → null.
 */
export function parseSavedDraft(raw: string | null, userId: string | null): ProfileDraft | null {
  if (!raw || !userId) return null;
  try {
    const saved = JSON.parse(raw) as Partial<Saved> | null;
    const d = saved?.draft as Partial<ProfileDraft> | undefined;
    if (saved?.userId !== userId || !d || (d.role !== 'visitor' && d.role !== 'volunteer')) return null;
    if (typeof d.mainLanguage !== 'string' || !Array.isArray(d.languages)) return null;
    return { ...emptyDraft(d.role, d.mainLanguage), ...d };
  } catch {
    return null;
  }
}

export async function readSavedDraft(userId: string | null): Promise<ProfileDraft | null> {
  try {
    return parseSavedDraft(await AsyncStorage.getItem(SETUP_DRAFT_KEY), userId);
  } catch {
    return null; // storage unavailable (private window): setup still works, just without resume
  }
}

export async function writeSavedDraft(userId: string | null, draft: ProfileDraft | null): Promise<void> {
  try {
    if (!userId || !draft) await AsyncStorage.removeItem(SETUP_DRAFT_KEY);
    else await AsyncStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({ userId, draft } satisfies Saved));
  } catch {
    // Best effort, as above.
  }
}

export function clearSavedDraft(): Promise<void> {
  return writeSavedDraft(null, null);
}
