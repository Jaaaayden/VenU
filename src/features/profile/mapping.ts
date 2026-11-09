import { PRIVACY_VERSION } from './privacy';
import type { Profile, ProfileDraft } from './types';

/** Row shape of `public.profiles` (see supabase/migrations). */
export interface ProfileRow {
  id: string;
  role: Profile['role'];
  first_name: string;
  avatar_path: string | null;
  languages: string[];
  main_language: string;
  app_language: string;
  access_needs: Profile['accessNeeds'];
  access_needs_note: string | null;
  communication: Profile['communication'];
  helper_gender_pref: Profile['helperGenderPref'];
  helper_age_pref: Profile['helperAgePref'];
  trainings: Profile['trainings'];
  gender: Profile['gender'];
  age_band: Profile['ageBand'];
  verified: boolean;
  privacy_version: string;
  privacy_accepted_at: string;
}

/** Columns a user may write. `id`, `verified` and timestamps are left to the DB. */
export type ProfileWrite = Omit<ProfileRow, 'id' | 'verified'>;

export function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    role: r.role,
    firstName: r.first_name,
    avatarPath: r.avatar_path,
    languages: r.languages ?? [],
    mainLanguage: r.main_language,
    appLanguage: r.app_language,
    accessNeeds: r.access_needs ?? [],
    accessNeedsNote: r.access_needs_note ?? '',
    communication: r.communication ?? [],
    helperGenderPref: r.helper_gender_pref ?? 'none',
    helperAgePref: r.helper_age_pref ?? 'any',
    trainings: r.trainings ?? [],
    gender: r.gender,
    ageBand: r.age_band,
    verified: r.verified,
    privacyVersion: r.privacy_version,
    privacyAcceptedAt: r.privacy_accepted_at,
  };
}

/**
 * Turns a validated draft into the columns to write. Fields that don't apply to
 * the role are cleared, so a visitor never stores volunteer data and vice versa.
 */
export function draftToWrite(d: ProfileDraft, acceptedAt: string): ProfileWrite {
  const visitor = d.role === 'visitor';
  const note = d.accessNeedsNote.trim();
  return {
    role: d.role,
    first_name: d.firstName.trim(),
    avatar_path: d.avatarPath,
    languages: d.languages,
    main_language: d.mainLanguage,
    app_language: d.appLanguage,
    access_needs: visitor ? d.accessNeeds : [],
    access_needs_note: visitor && d.accessNeeds.includes('other') && note ? note : null,
    communication: visitor ? d.communication : [],
    helper_gender_pref: visitor ? d.helperGenderPref : 'none',
    helper_age_pref: visitor ? d.helperAgePref : 'any',
    trainings: visitor ? [] : d.trainings,
    gender: visitor ? null : d.gender,
    age_band: visitor ? null : d.ageBand,
    privacy_version: PRIVACY_VERSION,
    privacy_accepted_at: acceptedAt,
  };
}
