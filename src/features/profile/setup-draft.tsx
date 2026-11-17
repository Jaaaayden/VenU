/**
 * The profile being built across the Onboarding 2.0 steps (languages → preferences or volunteer
 * questions → photo), kept in the onboarding layout so Back and Continue keep every answer.
 * Lost on a web reload; the steps then start again from the languages step.
 */
import { router } from 'expo-router';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { AvatarChange } from './profile-context';
import type { ProfileDraft } from './types';
import { validateDraft, type DraftErrors, type DraftField } from './validate';

interface SetupDraft {
  draft: ProfileDraft | null;
  avatar: AvatarChange;
  start: (draft: ProfileDraft) => void;
  update: (patch: Partial<ProfileDraft>) => void;
  setAvatar: (avatar: AvatarChange) => void;
}

const Ctx = createContext<SetupDraft | null>(null);

export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [avatar, setAvatar] = useState<AvatarChange>(null);
  const value = useMemo<SetupDraft>(() => ({
    draft,
    avatar,
    start: setDraft,
    update: patch => setDraft(prev => (prev ? { ...prev, ...patch } : prev)),
    setAvatar,
  }), [draft, avatar]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSetupDraft(): SetupDraft {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSetupDraft needs <SetupDraftProvider> (the onboarding layout)');
  return ctx;
}

/** Which answers each step asks for, so Continue only checks that step's fields. */
export const STEP_FIELDS = {
  languages: ['languages'],
  preferences: ['accessNeedsNote'],
  volunteer: ['gender', 'ageBand'],
  photo: ['firstName', 'privacyAccepted'],
} as const satisfies Record<string, readonly DraftField[]>;

export type SetupStep = keyof typeof STEP_FIELDS;

/** validateDraft's messages for one step's fields only. e.g. a visitor with no language → { languages: '…' } */
export function stepErrors(step: SetupStep, draft: ProfileDraft): DraftErrors {
  const all = validateDraft(draft);
  const out: DraftErrors = {};
  for (const f of STEP_FIELDS[step]) if (all[f]) out[f] = all[f];
  return out;
}

/** The step after `step` for this role; null after the last one (save). */
export function nextStep(step: SetupStep, role: ProfileDraft['role']): SetupStep | null {
  if (step === 'languages') return role === 'visitor' ? 'preferences' : 'volunteer';
  if (step === 'preferences' || step === 'volunteer') return 'photo';
  return null;
}

export const STEP_HREF = {
  languages: '/onboarding/languages',
  preferences: '/onboarding/preferences',
  volunteer: '/onboarding/volunteer',
  photo: '/onboarding/photo',
} as const satisfies Record<SetupStep, string>;

/** Continue: checks this step's answers, then opens the next step. Returns false (stay) when one needs a fix. */
export function goToNextStep(step: SetupStep, draft: ProfileDraft): boolean {
  if (Object.keys(stepErrors(step, draft)).length) return false;
  const next = nextStep(step, draft.role);
  if (next) router.push(STEP_HREF[next]);
  return true;
}
