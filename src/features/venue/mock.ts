/**
 * Mock LA28 venues and their facilities, until the venue data lives in Supabase.
 * SoFi Stadium, Crypto.com Arena and Intuit Dome list what each venue's own guest guide names
 * (entries, guest services, first aid, sensory spaces, drop-off, parking), so names match the
 * official map and signs. The Coliseum and Rose Bowl still share the made-up LAYOUT.
 *
 * - Pins (`x`, `y`) sit on the venue's real compass side, north up, in StadiumMap's 400×400 frame
 *   (bowl or arena outline from 35 to 365 across, 55 to 345 down; lots in the bottom corners).
 * - `walkMinutes` and `wait` are stand-ins for live data, e.g. a gate is a "Long wait" before doors.
 * - `accessible` = the guide says it's step-free or reachable by the venue's elevators/ramp.
 */
import { eventsLabel, facilityDescription, facilityLocation, facilityName, venueT, type VenueT } from './labels';
import type { Facility, FacilityCategory, Venue } from './types';

export const VENUES: Venue[] = [
  { id: 'sofi', name: 'SoFi Stadium', address: '1001 Stadium Dr, Inglewood, CA 90301', events: ['opening_ceremony', 'swimming'], shape: 'bowl' },
  { id: 'coliseum', name: 'LA Memorial Coliseum', address: '3911 S Figueroa St, Los Angeles, CA 90037', events: ['athletics'], shape: 'bowl' },
  { id: 'rose-bowl', name: 'Rose Bowl Stadium', address: '1001 Rose Bowl Dr, Pasadena, CA 91103', events: ['soccer'], shape: 'bowl' },
  { id: 'crypto-arena', name: 'Crypto.com Arena', address: '1111 S Figueroa St, Los Angeles, CA 90015', events: ['gymnastics'], shape: 'arena' },
  { id: 'intuit-dome', name: 'Intuit Dome', address: '3930 W Century Blvd, Inglewood, CA 90303', events: ['basketball'], shape: 'arena' },
];

type Template = Omit<Facility, 'venueId'>;

// The Coliseum and Rose Bowl, until their guides are researched. Bowl centred at (200,200); gates
// sit on the outer wall, services on the concourse ring.
const LAYOUT: Template[] = [
  {
    id: 'gate-1', name: 'Gate 1', category: 'gate', x: 200, y: 56,
    description: 'North entrance, closest to the Metro shuttle stop.',
    location: 'North side, at the shuttle stop', walkMinutes: 6, wait: 'long', accessible: false,
    tags: [{ id: 'stairs', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'gate-2', name: 'Gate 2', category: 'gate', x: 362, y: 200,
    description: 'East entrance with a ramp, next to accessible parking in Lot C.',
    location: 'East side, by Lot C', walkMinutes: 3, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'ramp', tone: 'note' }, { id: 'bag_check', tone: 'note' }],
  },
  {
    id: 'gate-3', name: 'Gate 3', category: 'gate', x: 200, y: 344,
    description: 'South entrance for rideshare drop-off and pick-up.',
    location: 'South side, at the rideshare zone', walkMinutes: 8, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'rideshare', tone: 'note' }],
  },
  {
    id: 'gate-4', name: 'Gate 4', category: 'gate', x: 38, y: 200,
    description: 'West entrance for ticket holders in sections 200 to 240.',
    location: 'West side, off the main plaza', walkMinutes: 9, wait: 'none', accessible: false,
    tags: [{ id: 'escalators', tone: 'note' }],
  },
  {
    id: 'info-desk', name: 'Guest Services', category: 'info', x: 258, y: 82,
    description: 'Questions, lost tickets, sensory kits and ear defenders.',
    location: 'Concourse, section 105', walkMinutes: 4, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'sensory_kits', tone: 'note' }],
  },
  {
    id: 'first-aid', name: 'First Aid', category: 'first_aid', x: 338, y: 146,
    description: 'Nurses and EMTs on duty from gates open until the venue clears.',
    location: 'Concourse, section 112', walkMinutes: 3, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'quiet_room', tone: 'note' }],
  },
  {
    id: 'restroom-east', name: 'Restrooms East', category: 'restroom', x: 338, y: 254,
    description: 'Men’s, women’s and an all-gender family room with a changing table.',
    location: 'Concourse, section 118', walkMinutes: 4, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'family_room', tone: 'note' }],
  },
  {
    id: 'food-south', name: 'Taco Corner', category: 'food', x: 258, y: 318,
    description: 'Tacos, burritos and agua fresca. Vegetarian options.',
    location: 'Concourse, section 124', walkMinutes: 6, wait: 'long', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'long_lines_halftime', tone: 'note' }],
  },
  {
    id: 'lost-found', name: 'Lost & Found', category: 'lost_found', x: 142, y: 318,
    description: 'Drop off or pick up lost items. Lost children are brought here too.',
    location: 'Concourse, section 131', walkMinutes: 7, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'accessible-seating', name: 'Accessibility Services', category: 'accessible', x: 62, y: 254,
    description: 'Wheelchair loans, companion seating and assistive listening devices.',
    location: 'Concourse, section 136', walkMinutes: 8, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_loans', tone: 'note' }],
  },
  {
    id: 'food-west', name: 'Burger Stand', category: 'food', x: 62, y: 146,
    description: 'Burgers, fries and soft drinks. Halal patties available.',
    location: 'Concourse, section 140', walkMinutes: 9, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'restroom-west', name: 'Restrooms West', category: 'restroom', x: 142, y: 82,
    description: 'Men’s and women’s restrooms. The accessible stall is on the left.',
    location: 'Concourse, section 145', walkMinutes: 7, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'parking-c', name: 'Parking Lot C', category: 'parking', x: 360, y: 360,
    description: 'Accessible parking with a short, level path to Gate 2.',
    location: 'Southeast lot', walkMinutes: 5, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'permit_needed', tone: 'note' }],
  },
];

// SoFi Stadium. Sources (read 2026-11-15):
//   https://www.sofistadium.com/plan-your-visit/a-z-guide
//   https://www.sofistadium.com/plan-your-visit/accessibility
//   https://www.sofistadium.com/plan-your-visit/parking-and-transportation/accessible-parking
//   https://www.sofistadium.com/parking-and-transportation
// Entries 1–5 north, 6–7 west (VIP), 8–10 south, 11–12 east (VIP); podiums inside 4, 8 and 10.
// Six of the twelve are listed. Lost and found is at the Guest Services on your seat's level.
// Kareem Ct. between Pincay Dr. and Manchester Blvd. is north of the stadium. District Dr. is
// reached from Prairie Ave. (the west edge), so the accessible drop-off sits west. Parking zones
// sit by the entries the guide says they're closest to.
const SOFI: Template[] = [
  {
    id: 'entry-3', name: 'Entry 3', category: 'gate', x: 150, y: 62,
    description: 'North entrance. Every entry has an accessible path and free wheelchair escorts.',
    location: 'North side', walkMinutes: 5, wait: 'long', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'bag_check', tone: 'note' }],
  },
  {
    id: 'entry-4', name: 'Entry 4', category: 'gate', x: 250, y: 62,
    description: 'North entrance with an accessibility podium and waiting chairs inside.',
    location: 'North side', walkMinutes: 4, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'bag_check', tone: 'note' }],
  },
  {
    id: 'entry-6', name: 'Entry 6', category: 'gate', x: 38, y: 200,
    description: 'West entrance for VIP and premium ticket holders.',
    location: 'West side', walkMinutes: 9, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'premium_access', tone: 'note' }],
  },
  {
    id: 'entry-8', name: 'Entry 8', category: 'gate', x: 150, y: 338,
    description: 'South entrance with an accessibility podium and waiting chairs inside.',
    location: 'South side', walkMinutes: 7, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'bag_check', tone: 'note' }],
  },
  {
    id: 'entry-10', name: 'Entry 10', category: 'gate', x: 250, y: 338,
    description: 'South entrance with an accessibility podium and waiting chairs inside.',
    location: 'South side', walkMinutes: 6, wait: 'long', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'entry-11', name: 'Entry 11', category: 'gate', x: 362, y: 200,
    description: 'East entrance for VIP and premium ticket holders.',
    location: 'East side', walkMinutes: 8, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'premium_access', tone: 'note' }],
  },
  {
    id: 'guest-services-ne', name: 'Guest Services NE', category: 'info', x: 306, y: 108,
    description: 'Questions, lost items, assistive listening, free sensory kits and a sensory room.',
    location: 'Level 3, northeast concourse', walkMinutes: 3, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'sensory_room', tone: 'note' }, { id: 'sensory_kits', tone: 'note' }, { id: 'assistive_listening', tone: 'note' }],
  },
  {
    id: 'guest-services-sw', name: 'Guest Services SW', category: 'info', x: 94, y: 292,
    description: 'Inside the Corona Beach Club. Lost items, assistive listening, free sensory kits and a sensory room.',
    location: 'Level 3, southwest concourse', walkMinutes: 8, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'sensory_room', tone: 'note' }, { id: 'sensory_kits', tone: 'note' }, { id: 'lost_items', tone: 'note' }],
  },
  {
    id: 'first-aid-se', name: 'First Aid SE', category: 'first_aid', x: 306, y: 292,
    description: 'EMTs on site. Any usher or staff member can call them to you.',
    location: 'Level 1, southeast concourse', walkMinutes: 6, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'first-aid-nw', name: 'First Aid NW', category: 'first_aid', x: 94, y: 108,
    description: 'EMTs on site. Any usher or staff member can call them to you.',
    location: 'Level 3, northwest concourse', walkMinutes: 4, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'pedestrian-ramp', name: 'Pedestrian Ramp', category: 'accessible', x: 352, y: 300,
    description: 'The stadium’s one pedestrian ramp. It reaches every level except Level 7.',
    location: 'Southeast side, behind the end zone', walkMinutes: 7, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'ramp', tone: 'note' }],
  },
  {
    id: 'lactation-suite', name: 'Lactation Suite', category: 'restroom', x: 200, y: 326,
    description: 'Private Mamava lactation pod. Family restrooms are on every level.',
    location: 'Level 4, south', walkMinutes: 6, wait: 'short', accessible: false,
    tags: [{ id: 'family_room', tone: 'note' }],
  },
  {
    id: 'rideshare-kareem', name: 'Rideshare Drop-off', category: 'parking', x: 300, y: 28,
    description: 'Uber, Lyft and taxi drop-off. Pick-up is at Kareem Court and Manchester Boulevard.',
    location: 'Kareem Court, between Pincay Drive and Manchester Boulevard', walkMinutes: 10, wait: 'long', accessible: false,
    tags: [{ id: 'rideshare', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'accessible-drop-off', name: 'Accessible Drop-off', category: 'parking', x: 28, y: 110,
    description: 'Drop-off and pick-up for guests with disabilities. Come in from northbound Prairie Avenue via Arbor Vitae Street.',
    location: 'District Drive, between Champions Way and Touchdown Drive', walkMinutes: 8, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'brown-zone', name: 'Brown Zone', category: 'parking', x: 90, y: 24,
    description: 'Parking closest to Entries 1–5 and 12. ADA stalls in every lot, first come, first served.',
    location: '3919 Pincay Drive', walkMinutes: 9, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'permit_needed', tone: 'note' }],
  },
  {
    id: 'blue-zone', name: 'Blue Zone', category: 'parking', x: 50, y: 358,
    description: 'Parking closest to Entries 7 and 8. ADA stalls in every lot, first come, first served.',
    location: '1100 Prairie Avenue', walkMinutes: 11, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'permit_needed', tone: 'note' }],
  },
  {
    id: 'orange-zone', name: 'Orange Zone', category: 'parking', x: 350, y: 358,
    description: 'Parking closest to Entries 10, 11 and 12. ADA stalls in every lot, first come, first served.',
    location: '3695 Pincay Drive', walkMinutes: 10, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'permit_needed', tone: 'note' }],
  },
];

// Crypto.com Arena. Sources (read 2026-11-15):
//   https://www.cryptoarena.com/a-z-guide
//   https://www.cryptoarena.com/accessibility
//   https://www.cryptoarena.com/plan-your-visit/getting-here
//   https://www.cryptoarena.com/plan-your-visit/getting-here/public-transportation
// "North" is the Chick Hearn Ct. (11th St.) side and east is Figueroa St., following the downtown
// street grid (it runs about 38° off true north). Georgia St. is the west side. The guides give
// aisles, not sides, so concourse pins go round the ring in aisle order, roughly. The A-Z guide puts
// upper Guest Services at U6; the accessibility page says aisle 5 (U6 used here).
const CRYPTO_ARENA: Template[] = [
  {
    id: 'kobe-bryant-entrance', name: 'Kobe Bryant Entrance', category: 'gate', x: 58, y: 78,
    description: 'Main entrance for all tickets. GA floor tickets enter here.',
    location: 'Chick Hearn Ct. (11th St.) at Georgia St.', walkMinutes: 5, wait: 'long', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'bag_check', tone: 'note' }],
  },
  {
    id: 'star-plaza-entrance', name: 'Star Plaza Entrance', category: 'gate', x: 342, y: 78,
    description: 'Main entrance for all tickets, between the Box Office and Team LA Store.',
    location: 'Chick Hearn Ct. (11th St.) at Figueroa St.', walkMinutes: 4, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'figueroa-entrance', name: 'Figueroa Entrance', category: 'gate', x: 342, y: 322,
    description: 'Main entrance for all tickets. Ask here for a free wheelchair escort.',
    location: '12th St. at Figueroa St.', walkMinutes: 6, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }],
  },
  {
    id: 'guest-services-m12', name: 'Guest Services M12', category: 'info', x: 350, y: 170,
    description: 'Questions, lost items, assistive listening, sensory bags and weighted lap pads (ID needed).',
    location: 'Main Concourse, across from aisle M12', walkMinutes: 3, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'sensory_kits', tone: 'note' }, { id: 'assistive_listening', tone: 'note' }, { id: 'lost_items', tone: 'note' }],
  },
  {
    id: 'guest-services-u6', name: 'Guest Services U6', category: 'info', x: 290, y: 68,
    description: 'Questions, lost items, sensory bags and lap pads. Ask here for the Sensory Pod code.',
    location: 'Upper Concourse, across from aisle U6', walkMinutes: 6, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'sensory_kits', tone: 'note' }, { id: 'lost_items', tone: 'note' }],
  },
  {
    id: 'first-aid-m3', name: 'First Aid M3', category: 'first_aid', x: 150, y: 68,
    description: 'EMTs at every event, with a quiet area inside.',
    location: 'Main Concourse, across from aisle M3', walkMinutes: 4, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'quiet_room', tone: 'note' }],
  },
  {
    id: 'first-aid-u22', name: 'First Aid U22', category: 'first_aid', x: 230, y: 334,
    description: 'EMTs at every event, with a quiet area inside.',
    location: 'Upper Concourse, across from aisle U22', walkMinutes: 8, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'quiet_room', tone: 'note' }],
  },
  {
    id: 'sensory-pod', name: 'Sensory Pod', category: 'accessible', x: 220, y: 68,
    description: 'Quiet pod for one or two guests, open during every event. Guest Services has the door code.',
    location: 'Upper Concourse, across from aisle 3', walkMinutes: 7, wait: 'none', accessible: false,
    tags: [{ id: 'sensory_room', tone: 'note' }],
  },
  {
    id: 'restroom-m23', name: 'Restroom M23', category: 'restroom', x: 160, y: 334,
    description: 'All-gender restroom with a changing table. Every restroom is wheelchair accessible.',
    location: 'Main Concourse, across from aisle M23', walkMinutes: 5, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'changing_table', tone: 'note' }],
  },
  {
    id: 'restroom-u31', name: 'Restroom U31', category: 'restroom', x: 50, y: 180,
    description: 'All-gender restroom with a changing table. Every restroom is wheelchair accessible.',
    location: 'Upper Concourse, across from aisle U31', walkMinutes: 9, wait: 'short', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'changing_table', tone: 'note' }],
  },
  {
    id: 'rideshare-chick-hearn', name: 'Chick Hearn Rideshare', category: 'parking', x: 90, y: 24,
    description: 'Rideshare drop-off and pick-up in the white zone (eastbound).',
    location: 'Chick Hearn Ct., between L.A. Live Way and Georgia St.', walkMinutes: 7, wait: 'long', accessible: false,
    tags: [{ id: 'rideshare', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'rideshare-figueroa', name: 'Figueroa Rideshare', category: 'parking', x: 380, y: 262,
    description: 'Rideshare drop-off and pick-up in the white zone (southbound).',
    location: 'Figueroa St., between 12th St. and Pico Blvd.', walkMinutes: 8, wait: 'short', accessible: false,
    tags: [{ id: 'rideshare', tone: 'note' }],
  },
  {
    id: 'west-garage-lot-w', name: 'West Garage (Lot W)', category: 'parking', x: 18, y: 140,
    description: 'Arena garage, entered from Chick Hearn Ct. or Georgia St.',
    location: '1005 Chick Hearn Ct.', walkMinutes: 9, wait: 'none', accessible: false,
    tags: [],
  },
];

// Intuit Dome. Sources (read 2026-11-15):
//   https://intuitdome.com/about/a-z-guide
//   https://www.intuitdome.com/plan-your-visit/know-before-you-go
//   https://intuitdome.com/plan-your-visit/parking-information
//   https://www.intuitdome.com/plan-your-visit/venue-map (exterior image: plaza north-west of the
//   dome on Century Blvd., West Garage across Prairie Ave., East Garage to the east)
// The Answers Portal and Main 6 services sit by the plaza entrance (the GameFace lane is "nearest
// the Answers Portal"). "Left of the Main Entrance" is read facing it from the plaza. Terrace
// section sides aren't published, so those pins are approximate, and the sensory room has no
// published spot at all (its pin is a placeholder; the card says to ask an Arena Host).
const INTUIT_DOME: Template[] = [
  {
    id: 'main-entrance', name: 'Main Entrance', category: 'gate', x: 58, y: 80,
    description: 'GameFace ID lane on the left, Identity Pass lane on the right. Free mobility help from security to your seat.',
    location: 'On the plaza, off Century Blvd. and Prairie Ave.', walkMinutes: 4, wait: 'long', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'wheelchair_escort', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'vip-entrance', name: 'VIP Entrance', category: 'gate', x: 125, y: 54,
    description: 'For suite, club and floor ticket holders.',
    location: 'Left of the Main Entrance', walkMinutes: 5, wait: 'none', accessible: false,
    tags: [{ id: 'premium_access', tone: 'note' }],
  },
  {
    id: 'wall-entrance', name: 'The Wall Entrance', category: 'gate', x: 190, y: 54,
    description: 'Dedicated entrance for The Wall.',
    location: 'Left of the Main Entrance, past the VIP Entrance', walkMinutes: 6, wait: 'short', accessible: false,
    tags: [],
  },
  {
    id: 'answers-portal-main', name: 'Answers Portal Main', category: 'info', x: 104, y: 112,
    description: 'Guest services: lost and found, free assisted listening (photo ID held) and OneCourt devices.',
    location: 'Main Level, near section Main 6', walkMinutes: 3, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'assistive_listening', tone: 'note' }, { id: 'lost_items', tone: 'note' }],
  },
  {
    id: 'answers-portal-terrace', name: 'Answers Portal Terrace', category: 'info', x: 300, y: 290,
    description: 'Guest services: lost and found and free assisted listening (photo ID held).',
    location: 'Terrace Level, near section Terrace 18', walkMinutes: 9, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }, { id: 'assistive_listening', tone: 'note' }, { id: 'lost_items', tone: 'note' }],
  },
  {
    id: 'first-aid-main', name: 'First Aid Main', category: 'first_aid', x: 60, y: 140,
    description: 'Trained EMTs at all events.',
    location: 'Main Level concourse, Main 6', walkMinutes: 4, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'first-aid-terrace', name: 'First Aid Terrace', category: 'first_aid', x: 100, y: 300,
    description: 'Trained EMTs at all events.',
    location: 'Terrace Level concourse, Terrace 27', walkMinutes: 10, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'first-aid-floor', name: 'First Aid Floor', category: 'first_aid', x: 348, y: 200,
    description: 'Trained EMTs at all events.',
    location: 'Floor Level, under Wall 19 by the east tunnel', walkMinutes: 7, wait: 'none', accessible: true,
    tags: [{ id: 'accessible', tone: 'good' }],
  },
  {
    id: 'sensory-room', name: 'Sensory Room', category: 'accessible', x: 300, y: 110,
    description: 'The private Kaiser Permanente Sensory Room. Sensory bags are available on request.',
    location: 'Ask an Arena Host for the way', walkMinutes: 6, wait: 'none', accessible: false,
    tags: [{ id: 'sensory_room', tone: 'note' }, { id: 'sensory_kits', tone: 'note' }],
  },
  {
    id: 'infant-care-room', name: 'Infant Care Room', category: 'restroom', x: 150, y: 92,
    description: 'A private room for infant care. Universal restrooms are all around the arena.',
    location: 'Main Level, Main 6', walkMinutes: 4, wait: 'none', accessible: false,
    tags: [{ id: 'family_room', tone: 'note' }],
  },
  {
    id: 'mobility-hub', name: 'Mobility Hub', category: 'parking', x: 382, y: 260,
    description: 'Rideshare and taxi drop-off and pick-up, family drop-off and shuttles.',
    location: 'East Garage, level 1', walkMinutes: 11, wait: 'long', accessible: false,
    tags: [{ id: 'rideshare', tone: 'note' }, { id: 'busy_before_events', tone: 'note' }],
  },
  {
    id: 'east-garage', name: 'East Garage', category: 'parking', x: 350, y: 358,
    description: 'Standard parking; buy a pass ahead. Accessible spaces are sold first come, first served.',
    location: 'Entrance on 102nd St.', walkMinutes: 12, wait: 'none', accessible: false,
    tags: [{ id: 'permit_needed', tone: 'note' }],
  },
  {
    id: 'west-garage', name: 'West Garage', category: 'parking', x: 18, y: 190,
    description: 'VIP parking across Prairie Ave.; buy a pass ahead.',
    location: 'Entrance on Prairie Ave.', walkMinutes: 8, wait: 'none', accessible: false,
    tags: [{ id: 'permit_needed', tone: 'note' }],
  },
];

export function getVenue(id: string | undefined): Venue | undefined {
  return VENUES.find(v => v.id === id);
}

const VENUE_FACILITIES: Readonly<Record<string, Template[]>> = {
  sofi: SOFI,
  'crypto-arena': CRYPTO_ARENA,
  'intuit-dome': INTUIT_DOME,
};

const built = new Map<string, Facility[]>();

/** The venue's facilities; for a known venue, the same array every call (don't sort it in place). */
export function facilitiesFor(venueId: string): Facility[] {
  const cached = built.get(venueId);
  if (cached) return cached;
  const templates = Object.prototype.hasOwnProperty.call(VENUE_FACILITIES, venueId) ? VENUE_FACILITIES[venueId] : LAYOUT;
  const list = templates.map(f => ({ ...f, venueId }));
  if (getVenue(venueId)) built.set(venueId, list);
  return list;
}

export function getFacility(venueId: string, facilityId: string | undefined): Facility | undefined {
  return facilitiesFor(venueId).find(f => f.id === facilityId);
}

/** Venues whose name, address or events (in English or the app language) contain every word of the query (case-insensitive). */
export function searchVenues(query: string, venues: Venue[] = VENUES, t: VenueT = venueT()): Venue[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return venues;
  return venues.filter(v => {
    const hay = `${v.name} ${v.address} ${eventsLabel(v, venueT('en'), 'en')} ${eventsLabel(v, t)}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}

/** "Accessibility" also matches any facility that is accessible, not only the services desk. */
export function matchesCategory(f: Facility, category: FacilityCategory | null): boolean {
  if (!category) return true;
  return f.category === category || (category === 'accessible' && f.accessible);
}

/** Matches name, description and location, in English and in `t`'s language. */
export function searchFacilities(facilities: Facility[], query: string, category: FacilityCategory | null, t: VenueT = venueT()): Facility[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return facilities.filter(f => {
    if (!matchesCategory(f, category)) return false;
    const hay = `${f.name} ${f.description} ${f.location} ${facilityName(f, t)} ${facilityDescription(f, t)} ${facilityLocation(f, t)}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
