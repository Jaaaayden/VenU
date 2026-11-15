import { describe, expect, it } from '@jest/globals';

import { VENUE_CONTACTS, venueContact } from '../contacts';
import { VENUES } from '../mock';

// Each venue's own site, so a number never comes from a ticket reseller or a directory.
const OFFICIAL_HOSTS: Record<string, string> = {
  sofi: 'www.sofistadium.com',
  'crypto-arena': 'www.cryptoarena.com',
  'intuit-dome': 'www.intuitdome.com',
  coliseum: 'www.lacoliseum.com',
  'rose-bowl': 'rosebowlstadium.com',
};

describe('venue contacts', () => {
  it('lists only real venues, each with a dialable US number and an official https source', () => {
    for (const [id, contact] of Object.entries(VENUE_CONTACTS)) {
      expect({ id, known: VENUES.some(v => v.id === id) }).toEqual({ id, known: true });
      expect({ id, phone: /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(contact.phone) }).toEqual({ id, phone: true });
      if (contact.text !== undefined) expect({ id, text: /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(contact.text) }).toEqual({ id, text: true });
      const url = new URL(contact.source);
      expect({ id, protocol: url.protocol, host: url.host }).toEqual({ id, protocol: 'https:', host: OFFICIAL_HOSTS[id] });
    }
  });

  it('looks numbers up by venue id, and has none for an unknown venue', () => {
    expect(venueContact('sofi')).toEqual({ phone: '+14245419100', text: '+14245419222', source: 'https://www.sofistadium.com/accessibility' });
    expect(venueContact('nowhere')).toBeNull();
    expect(venueContact('toString')).toBeNull();
  });
});
