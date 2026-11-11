// Mock data for the volunteer flow. The real matching backend (owned by Krisha) replaces
// mockBackend in backend.ts; these lists stay as the UI's fixed options.
import type { Option } from '@/features/profile/options';

import type { FeedbackTag, HelpType, IncomingRequest, MeetPoint, ProblemKind, Volunteer } from './types';

/** The six "What do you need help with?" cards, in grid order. */
export const HELP_TYPES: HelpType[] = [
  { id: 'physical', label: 'Physical Assistance' },
  { id: 'directions', label: 'Directions' },
  { id: 'language', label: 'Language Help' },
  { id: 'quiet', label: 'Quiet Space' },
  { id: 'lost', label: 'Lost & Found' },
  { id: 'other', label: 'Something Else' },
];

/** Where the visitor is. Later: from the venue map / device location. */
export const MOCK_LOCATION: MeetPoint = { spot: 'Near Gate 2 Ramp', venue: 'SoFi Stadium' };

/** Volunteers on shift near the visitor. The mock matcher picks the first who speaks the request's language. */
export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-daniel',
    name: 'Daniel K.',
    firstName: 'Daniel',
    possessive: 'his',
    languages: ['en', 'es'],
    rating: 4.9,
    tags: [
      { label: 'Wheelchair trained', tone: 'success' },
      { label: 'English', tone: 'warning' },
      { label: 'Español', tone: 'warning' },
    ],
  },
  {
    id: 'vol-minji',
    name: 'Min-ji P.',
    firstName: 'Min-ji',
    possessive: 'her',
    languages: ['ko', 'en'],
    rating: 4.8,
    tags: [
      { label: 'First aid', tone: 'success' },
      { label: '한국어', tone: 'warning' },
      { label: 'English', tone: 'warning' },
    ],
  },
  {
    id: 'vol-amara',
    name: 'Amara O.',
    firstName: 'Amara',
    possessive: 'her',
    languages: ['en', 'fr', 'ase'],
    rating: 5,
    tags: [
      { label: 'ASL', tone: 'success' },
      { label: 'Français', tone: 'warning' },
      { label: 'English', tone: 'warning' },
    ],
  },
];

export function greetingFrom(v: Volunteer, visitorName: string, spot: string): string {
  const hi = visitorName ? `Hi ${visitorName}!` : 'Hi!';
  return `${hi} I'm ${v.firstName}, your LA28 volunteer. I'm heading to you ${spot.replace(/^Near/, 'near')} now.`;
}

/** The mock volunteer's replies, in order (then the last one repeats). */
export const MOCK_REPLIES = [
  "Got it, thanks! I'll be there in a couple of minutes.",
  "I can see Gate 2 now. I'm wearing a pink LA28 vest.",
  'No problem, take your time. I will wait with you.',
];

export const FEEDBACK_TAGS: Option<FeedbackTag>[] = [
  { value: 'language', label: 'Spoke my language' },
  { value: 'venue', label: 'Knew the venue' },
  { value: 'patient', label: 'Patient' },
  { value: 'fast', label: 'Arrived fast' },
  { value: 'helpful', label: 'Helpful' },
  { value: 'other', label: 'Other' },
];

export const PROBLEM_KINDS: Option<ProblemKind>[] = [
  { value: 'no_show', label: "Didn't arrive" },
  { value: 'unsafe', label: 'I felt unsafe' },
  { value: 'rude', label: 'Rude or unkind' },
  { value: 'other', label: 'Something else' },
];

/** What a signed-in volunteer sees on their tab until real matching exists. */
export const MOCK_INCOMING: IncomingRequest[] = [
  { id: 'in-1', visitorName: 'Rosa', helpType: 'physical', spot: 'Near Gate 2 Ramp', venue: 'SoFi Stadium', language: 'es', minutesAgo: 1, distanceFeet: 180 },
  { id: 'in-2', visitorName: 'Wei', helpType: 'directions', spot: 'Section 214 concourse', venue: 'SoFi Stadium', language: 'zh', minutesAgo: 4, distanceFeet: 420 },
  { id: 'in-3', visitorName: 'Sam', helpType: 'quiet', spot: 'Main entrance plaza', venue: 'SoFi Stadium', language: 'en', minutesAgo: 7, distanceFeet: 650 },
];
