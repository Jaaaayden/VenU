/**
 * The venues' own published maps, so what visitors see in VenU matches the maps and signs on site.
 * A venue without an entry keeps the schematic StadiumMap.
 *
 * - `embed`: the venue's public interactive map page, framed as is (WebView on phones, iframe on
 *   web). Nothing is scraped: no API keys, no direct calls to the map vendor.
 * - `images`: static map images the venue publishes, hotlinked from its site (never committed).
 *
 * e.g. officialMapFor('crypto-arena') → { kind: 'embed', url: 'https://visit.cryptoarena.com/map', … }
 *      officialMapFor('coliseum') → undefined (schematic map)
 */

/** Ids of the image views; each shows translated (venue:officialMap.views.<id>). */
export type OfficialMapViewId = 'exterior' | 'east_garage' | 'west_garage';

export interface OfficialMapImage {
  id: OfficialMapViewId;
  url: string;
  /** Pixel size of the published image, for laying it out before it loads. */
  width: number;
  height: number;
}

interface OfficialMapBase {
  /** Who made the map, as shown in "Map: <source>". A proper name, so never translated. */
  source: string;
  /** The venue's page for the map, opened by "Open in browser". */
  pageUrl: string;
}

export interface EmbeddedOfficialMap extends OfficialMapBase {
  kind: 'embed';
  /** The page to frame. */
  url: string;
}

export interface ImageOfficialMap extends OfficialMapBase {
  kind: 'images';
  /** First one shows by default. */
  images: OfficialMapImage[];
}

export type OfficialMap = EmbeddedOfficialMap | ImageOfficialMap;

const INTUIT_DOME_IMAGES = 'https://publish-p111705-e1087822.adobeaemcloud.com/content/dam/intuit-dome/en/web/content/venue-map';

const OFFICIAL_MAPS: Readonly<Record<string, OfficialMap>> = {
  // Mappedin Web on SoFi's site. Loads slowly (often 15 s or more before the map draws) and opens
  // with SoFi's cookie banner, which the visitor answers inside the frame.
  sofi: {
    kind: 'embed',
    source: 'SoFi Stadium',
    url: 'https://www.sofistadium.com/plan-your-visit/maps',
    pageUrl: 'https://www.sofistadium.com/plan-your-visit/maps',
  },
  // Wayfyndr, with its own level switcher and Food / Drink / Merchandise / Parking filters.
  'crypto-arena': {
    kind: 'embed',
    source: 'Crypto.com Arena',
    url: 'https://visit.cryptoarena.com/map',
    pageUrl: 'https://visit.cryptoarena.com/map',
  },
  // Only static images are published. They label the garages, the plaza and the streets but no
  // gates or services, so VenU draws no pins on them.
  'intuit-dome': {
    kind: 'images',
    source: 'Intuit Dome',
    pageUrl: 'https://www.intuitdome.com/plan-your-visit/venue-map',
    images: [
      { id: 'exterior', url: `${INTUIT_DOME_IMAGES}/intuit-dome-exterior-venue-map-1920x1080.jpg`, width: 1920, height: 1080 },
      { id: 'east_garage', url: `${INTUIT_DOME_IMAGES}/intuit-dome-east-garage-map-1920x1080.jpg`, width: 1920, height: 1080 },
      { id: 'west_garage', url: `${INTUIT_DOME_IMAGES}/intuit-dome-west-garage-map-1920x1080.jpg`, width: 1920, height: 1080 },
    ],
  },
};

export function officialMapFor(venueId: string): OfficialMap | undefined {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_MAPS, venueId) ? OFFICIAL_MAPS[venueId] : undefined;
}

/** Venue ids that show an official map, for tests and checks. */
export function venuesWithOfficialMaps(): string[] {
  return Object.keys(OFFICIAL_MAPS);
}

/**
 * Whether a navigation inside the framed page may stay in the frame: same site as the map (any
 * subdomain), or not a top-level page load. Anything else opens in the browser instead.
 * e.g. ('https://visit.cryptoarena.com/map', 'https://www.cryptoarena.com/events') → true
 *      ('https://www.sofistadium.com/…', 'https://www.ticketmaster.com/…') → false
 */
export function staysInFrame(mapUrl: string, nextUrl: string): boolean {
  if (nextUrl === 'about:blank' || nextUrl.startsWith('about:srcdoc') || nextUrl.startsWith('data:') || nextUrl.startsWith('blob:')) return true;
  try {
    const next = new URL(nextUrl);
    if (next.protocol !== 'https:' && next.protocol !== 'http:') return false;
    return siteOf(new URL(mapUrl).hostname) === siteOf(next.hostname);
  } catch {
    return false;
  }
}

/** Last two labels of a host name: visit.cryptoarena.com → cryptoarena.com. */
function siteOf(host: string): string {
  return host.split('.').slice(-2).join('.');
}
