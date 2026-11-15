// Profile shapes shared by onboarding, the Profile tab and (later) matching.
// Codes are stable strings stored in the DB; labels live in options.ts.

import { PRIVACY_VERSION } from './privacy';

export type Role = 'visitor' | 'volunteer';

export type AccessNeed = 'wheelchair' | 'hard_of_hearing' | 'low_vision' | 'walking_aid' | 'other';
export type CommunicationMethod = 'speaking' | 'text' | 'sign_language';
export type HelperGenderPref = 'none' | 'woman' | 'man';
export type HelperAgePref = 'any' | 'under_40' | '40_plus';
export type Training = 'wheelchair' | 'asl' | 'first_aid' | 'sighted_guide' | 'mental_health';
export type Gender = 'woman' | 'man' | 'nonbinary' | 'prefer_not';
export type AgeBand = 'under_40' | '40_plus' | 'prefer_not';

export interface Profile {
  id: string;
  role: Role;
  firstName: string;
  /** Storage path (`<uid>/avatar-<ms>`) on Supabase, or a data/file URI on the device store. */
  avatarPath: string | null;
  /** Language codes, main language included. For volunteers: fluent languages only. */
  languages: string[];
  mainLanguage: string;
  /** Language the app UI should use (read by the translation feature). */
  appLanguage: string;

  // Visitor
  accessNeeds: AccessNeed[];
  accessNeedsNote: string;
  communication: CommunicationMethod[];
  helperGenderPref: HelperGenderPref;
  helperAgePref: HelperAgePref;

  // Volunteer
  trainings: Training[];
  gender: Gender | null;
  ageBand: AgeBand | null;
  /** Set by LA28 staff only; users can't write it. */
  verified: boolean;

  privacyVersion: string;
  privacyAcceptedAt: string;
}

/** What the onboarding / edit form holds before it's saved. */
export type ProfileDraft = Omit<Profile, 'id' | 'verified' | 'privacyVersion' | 'privacyAcceptedAt'> & {
  privacyAccepted: boolean;
};

export function emptyDraft(role: Role, mainLanguage = 'en'): ProfileDraft {
  return {
    role,
    firstName: '',
    avatarPath: null,
    languages: [mainLanguage],
    mainLanguage,
    appLanguage: mainLanguage,
    accessNeeds: [],
    accessNeedsNote: '',
    communication: [],
    helperGenderPref: 'none',
    helperAgePref: 'any',
    trainings: [],
    gender: null,
    ageBand: null,
    privacyAccepted: false,
  };
}

/** Consent carries over only if the policy hasn't changed since they agreed. */
export function draftFromProfile(p: Profile): ProfileDraft {
  const { id: _id, verified: _v, privacyVersion, privacyAcceptedAt: _pa, ...rest } = p;
  return { ...rest, privacyAccepted: privacyVersion === PRIVACY_VERSION };
}

/** Where each role lands after sign-in or setup. */
export function homeFor(p: Pick<Profile, 'role'>): '/venue' | '/volunteer' {
  return p.role === 'volunteer' ? '/volunteer' : '/venue';
}
