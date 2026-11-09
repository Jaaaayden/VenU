import type { ProfileDraft } from './types';

export type DraftField =
  | 'firstName'
  | 'languages'
  | 'accessNeedsNote'
  | 'gender'
  | 'ageBand'
  | 'privacyAccepted';

export type DraftErrors = Partial<Record<DraftField, string>>;

export const FIRST_NAME_MAX = 40;
export const NOTE_MAX = 200;

/** Returns one message per invalid field; an empty object means the draft can be saved. */
export function validateDraft(d: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};
  const name = d.firstName.trim();

  if (!name) errors.firstName = 'Add your first name.';
  else if (name.length > FIRST_NAME_MAX) errors.firstName = `Keep it under ${FIRST_NAME_MAX} characters.`;

  if (d.languages.length === 0) errors.languages = 'Add at least one language.';
  else if (!d.languages.includes(d.mainLanguage)) errors.languages = 'Pick your main language.';

  if (d.role === 'visitor') {
    const note = d.accessNeedsNote.trim();
    if (d.accessNeeds.includes('other') && !note) errors.accessNeedsNote = 'Tell us a bit about what you need.';
    else if (note.length > NOTE_MAX) errors.accessNeedsNote = `Keep it under ${NOTE_MAX} characters.`;
  } else {
    // Needed so visitors' "I'd prefer help from" choices can be honoured.
    if (!d.gender) errors.gender = 'Pick one (or "Prefer not to say").';
    if (!d.ageBand) errors.ageBand = 'Pick one (or "Prefer not to say").';
  }

  if (!d.privacyAccepted) errors.privacyAccepted = 'Please agree to the privacy policy to continue.';
  return errors;
}

export function isValid(errors: DraftErrors): boolean {
  return Object.keys(errors).length === 0;
}
