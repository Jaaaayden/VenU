// Plain-language privacy policy. DRAFT: the team needs to review it before launch;
// this isn't legal text. Bump PRIVACY_VERSION whenever a section changes so
// profiles store which version the person agreed to.

export const PRIVACY_VERSION = '2026-11-draft-2';

export interface PrivacySection {
  title: string;
  points: string[];
}

export const PRIVACY_SUMMARY =
  'We only ask for what we need to match you with the right helper, and you can change or delete it any time.';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: 'What we collect',
    points: [
      'Your first name and, if you add one, a profile photo.',
      'Languages you speak and how you like to communicate.',
      'Access needs you choose to share, e.g. "Wheelchair user".',
      'Helper preferences (visitors), or training, gender and age range (volunteers).',
      'Your email, only to sign you in.',
    ],
  },
  {
    title: 'Why we collect it',
    points: [
      'To find a volunteer who speaks your language and has the right training.',
      'So you never have to explain your needs twice.',
      'We never sell your data or use it for ads.',
    ],
  },
  {
    title: 'Who sees it',
    points: [
      'Your helper sees your first name, photo, languages and the access needs you shared, and only while helping you.',
      'Visitors see a volunteer\'s first name, photo, languages and training.',
      'Your email, gender and age range are never shown to other people.',
    ],
  },
  {
    title: 'Where it\'s stored',
    points: [
      'In our database (Supabase), encrypted in transit and protected so each account can only read its own profile.',
      'Profile photos are in private storage. Only you can open yours; during a help request the other person gets a short-lived link to it.',
    ],
  },
  {
    title: 'How long we keep it',
    points: [
      'Until you delete your account.',
      'Data from LA28 events is deleted after the Games end (date TBD by the team).',
    ],
  },
  {
    title: 'Your choices',
    points: [
      'Edit your profile any time from the Profile tab.',
      'Access needs are optional. Share only what helps.',
      'Delete your data from Profile → Delete my data. It removes your profile and photo.',
    ],
  },
];
