/** Venue tab data shapes. Mock data in ./mock.ts; reports in ./reports.ts. */

export type FacilityCategory =
  | 'gate'
  | 'restroom'
  | 'food'
  | 'first_aid'
  | 'lost_found'
  | 'info'
  | 'accessible'
  | 'parking';

/** How the venue is drawn on the map: an open-air bowl or an indoor arena. */
export type VenueShape = 'bowl' | 'arena';

export interface Venue {
  id: string;
  name: string;
  address: string;
  /** What LA28 holds there, e.g. "Athletics". */
  events: string;
  shape: VenueShape;
}

/** Green "Accessible"-style tag, or an orange heads-up ("Busy before kickoff"). */
export interface FacilityTag {
  label: string;
  tone: 'good' | 'note';
}

export type WaitLevel = 'none' | 'short' | 'long';

export interface Facility {
  /** Unique within its venue; used in the URL (/venue/sofi/gate-2). */
  id: string;
  venueId: string;
  name: string;
  category: FacilityCategory;
  description: string;
  /** Where to find it, e.g. "East entrance, by Lot C". */
  location: string;
  walkMinutes: number;
  wait: WaitLevel;
  /** Step-free and wheelchair usable. Shows the blue wheelchair badge. */
  accessible: boolean;
  tags: FacilityTag[];
  /** Position on the venue map, in the map's 400×400 coordinate space. */
  x: number;
  y: number;
}
