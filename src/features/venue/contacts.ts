// Guest services phone numbers, each copied from the venue's own site (checked 2026-11-15).
// A venue with no confirmed number is left out, and "Call venue staff" hides there.
// e.g. venueContact('sofi') → { phone: '+14245419100', source: 'https://www.sofistadium.com/accessibility' }
import { Linking } from 'react-native';

export interface VenueContact {
  /** Dialable E.164 number, e.g. '+14245419100'. */
  phone: string;
  /** The official page that lists it. */
  source: string;
}

export const VENUE_CONTACTS: Readonly<Record<string, VenueContact>> = {
  // "Guest Services ... call 424-541-9100"
  sofi: { phone: '+14245419100', source: 'https://www.sofistadium.com/accessibility' },
  // "Guest Services at (213) 742-7FAN (326)"
  'crypto-arena': { phone: '+12137427326', source: 'https://www.cryptoarena.com/general-info-faq' },
  // Customer Support: "or by calling 1-888-311-0231"
  'intuit-dome': { phone: '+18883110231', source: 'https://www.intuitdome.com/contact-us/customer-support' },
  // The Coliseum's main line (no separate guest services number is published)
  coliseum: { phone: '+12137477111', source: 'https://www.lacoliseum.com/contact-us/' },
  // The stadium's main line, "Phone: (626) 577-3100"
  'rose-bowl': { phone: '+16265773100', source: 'https://rosebowlstadium.com/about' },
};

/** The venue's staff line, or null when no official number is known. */
export function venueContact(venueId: string): VenueContact | null {
  return Object.prototype.hasOwnProperty.call(VENUE_CONTACTS, venueId) ? VENUE_CONTACTS[venueId]! : null;
}

/** Opens the phone dialer, e.g. dial('911') or dial('+14245419100'). */
export function dial(number: string) {
  Linking.openURL(`tel:${number}`).catch(() => {
    // No phone app (a desktop browser): nothing to open.
  });
}
