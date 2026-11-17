/**
 * Directions inside a venue: from where the visitor is (./current.ts, set by "I'm here") to a
 * facility, as a dashed line on the map and a walk estimate with steps in the sheet.
 * Until the visitor says where they are, the walk starts at the venue's main way in (its map's
 * `arrival`), and the sheet says so.
 *
 * e.g. routeFor(sofiMap, sofiFacilities, { venueId: 'sofi', facilityId: null }, 'first-aid-se')
 *      → from Entry 4 (the arrival), to First Aid SE, heading 'se', about 6 min
 */
import { contentSize, walkBetween, type Box, type Walk } from './map-geometry';
import type { WhereAmI } from './current';
import { mapAspect, type VenueMap } from './venue-maps';
import type { Facility } from './types';

export interface Route {
  from: Facility;
  to: Facility;
  /** The visitor set `from` with "I'm here"; false when it's the venue's arrival spot. */
  fromIsMine: boolean;
  /** Already there: no line to draw. */
  here: boolean;
  walk: Walk;
}

/** Where a walk at this venue starts: the visitor's own spot, else the main way in, else the first facility. */
export function routeStart(map: VenueMap, facilities: Facility[], where: WhereAmI, venueId: string): { from: Facility; mine: boolean } | null {
  const mine = where.venueId === venueId && where.facilityId ? facilities.find(f => f.id === where.facilityId) : undefined;
  if (mine) return { from: mine, mine: true };
  const arrival = facilities.find(f => f.id === map.arrival) ?? facilities[0];
  return arrival ? { from: arrival, mine: false } : null;
}

/** The route to `toId`, with the line in `content` px (any width works for the sheet's numbers). */
export function routeFor(
  map: VenueMap,
  facilities: Facility[],
  where: WhereAmI,
  venueId: string,
  toId: string,
  content: Box = contentSize(mapAspect(map), 1),
): Route | null {
  const to = facilities.find(f => f.id === toId);
  const start = routeStart(map, facilities, where, venueId);
  if (!to || !start) return null;
  return { from: start.from, to, fromIsMine: start.mine, here: start.from.id === to.id, walk: walkBetween(start.from, to, content, map.widthMeters) };
}
