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
  /**
   * Hosts a tap inside the frame may open in place: an exact host, or `*.example.com` for the
   * domain and every subdomain. Any other site opens in the browser.
   */
  frameHosts: string[];
}

export interface ImageOfficialMap extends OfficialMapBase {
  kind: 'images';
  /** First one shows by default. */
  images: OfficialMapImage[];
}

export type OfficialMap = EmbeddedOfficialMap | ImageOfficialMap;

/** An embed's page is the framed page unless it says otherwise. */
type OfficialMapEntry = (Omit<EmbeddedOfficialMap, 'pageUrl'> & { pageUrl?: string }) | ImageOfficialMap;

// Intuit Dome's own site loads these from its Adobe publish host; intuitdome.com/content/dam/…
// answers with an HTML page, not the image.
const INTUIT_DOME_IMAGES = 'https://publish-p111705-e1087822.adobeaemcloud.com/content/dam/intuit-dome/en/web/content/venue-map';

const OFFICIAL_MAPS: Readonly<Record<string, OfficialMapEntry>> = {
  // Mappedin Web on SoFi's site. Loads slowly (often 15 s or more before the map draws) and opens
  // with SoFi's Ketch cookie banner, which the visitor answers inside the frame.
  sofi: {
    kind: 'embed',
    source: 'SoFi Stadium',
    url: 'https://www.sofistadium.com/plan-your-visit/maps',
    frameHosts: ['sofistadium.com', 'www.sofistadium.com', '*.mappedin.com', '*.ketchcdn.com'],
  },
  // Wayfyndr, with its own level switcher and Food / Drink / Merchandise / Parking filters.
  'crypto-arena': {
    kind: 'embed',
    source: 'Crypto.com Arena',
    url: 'https://visit.cryptoarena.com/map',
    frameHosts: ['visit.cryptoarena.com', 'cryptoarena.com', 'www.cryptoarena.com', '*.wayfyndr.com', '*.ketchcdn.com'],
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

const resolved = new Map<string, OfficialMap>();

export function officialMapFor(venueId: string): OfficialMap | undefined {
  if (!Object.prototype.hasOwnProperty.call(OFFICIAL_MAPS, venueId)) return undefined;
  let map = resolved.get(venueId);
  if (!map) {
    const entry = OFFICIAL_MAPS[venueId];
    map = entry.kind === 'embed' ? { ...entry, pageUrl: entry.pageUrl ?? entry.url } : entry;
    resolved.set(venueId, map); // same object every time, so it can sit in hook deps
  }
  return map;
}

/** Venue ids that show an official map, for tests and checks. */
export function venuesWithOfficialMaps(): string[] {
  return Object.keys(OFFICIAL_MAPS);
}

/** e.g. hostAllowed(['*.mappedin.com'], 'cdn.mappedin.com') → true; (['visit.cryptoarena.com'], 'cryptoarena.com') → false */
export function hostAllowed(patterns: string[], host: string): boolean {
  const h = host.toLowerCase();
  return patterns.some(p => (p.startsWith('*.') ? h === p.slice(2) || h.endsWith(p.slice(1)) : h === p));
}

export interface FrameNavigation {
  url: string;
  /** false for a subframe (ads, consent iframes); undefined where the platform doesn't say. */
  isTopFrame?: boolean;
  /** iOS only: 'click' for a tapped link; 'other', 'reload', 'formsubmit', … otherwise. */
  navigationType?: string;
  /** Whether the framed page has finished its first load. */
  loaded: boolean;
  platform: 'ios' | 'android' | string;
}

/**
 * What the native frame does with a navigation:
 * - `allow`: load it in the frame;
 * - `block`: don't load it (an app link the frame can't show, that the visitor didn't tap);
 * - `browser`: open it in the in-app browser instead (a tapped link to another site);
 * - `app`: hand it to the phone (tel:, mailto:, sms:, intent:, maps links the visitor tapped).
 *
 * Until the first load finishes, everything web stays in the frame, so redirects and consent hops
 * aren't pushed out. After it, only the visitor's own top-frame taps are redirected: iOS says
 * which navigations are taps; Android asks only about top-frame navigations.
 * e.g. a tapped ticketmaster.com link on SoFi's map → 'browser'; a tapped tel: link → 'app'
 */
export function frameNavigation(map: EmbeddedOfficialMap, nav: FrameNavigation): 'allow' | 'block' | 'browser' | 'app' {
  if (nav.isTopFrame === false) return 'allow';
  const kind = urlKind(nav.url);
  if (kind === 'inline') return 'allow';
  const userTap = nav.loaded && (nav.platform !== 'ios' || nav.navigationType === 'click');
  if (kind === 'app') return userTap ? 'app' : 'block';
  if (!userTap) return 'allow';
  return hostAllowed(map.frameHosts, new URL(nav.url).hostname) ? 'allow' : 'browser';
}

function urlKind(url: string): 'inline' | 'web' | 'app' {
  if (/^(about|data|blob):/i.test(url)) return 'inline';
  if (/^https?:\/\//i.test(url)) {
    try {
      new URL(url);
      return 'web';
    } catch {
      return 'app';
    }
  }
  return 'app';
}
