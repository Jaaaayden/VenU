import { describe, expect, it, jest } from '@jest/globals';

import i18n, { type UiLanguage } from '@/i18n';
import { resources } from '@/i18n/locales';

import { facilityDescription, facilityLocation, facilityName } from '../labels';
import { facilitiesFor, getFacility, VENUES } from '../mock';
import { SEED_REPORTS } from '../reports';
import { MAP_SIZE } from '../stadium-map';

// reports.ts builds its store on AsyncStorage, which has no native module under jest.
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => {} } }));

// Every venue's facilities come from its official guide (see mock.ts).
const RESEARCHED = ['sofi', 'crypto-arena', 'intuit-dome'];
// A pin is a 34pt circle; keep its centre this far inside the map and away from other pins.
const EDGE = 16;
const MIN_GAP = 44;
const LANGS = Object.keys(resources) as UiLanguage[];

describe('venue facility data', () => {
  it.each(VENUES.map(v => v.id))('%s has gates, first aid and guest services, with unique ids', venueId => {
    const list = facilitiesFor(venueId);
    const ids = list.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const category of ['gate', 'first_aid', 'info'] as const) {
      expect({ venueId, category, found: list.some(f => f.category === category) }).toEqual({ venueId, category, found: true });
    }
    expect(list.every(f => f.venueId === venueId)).toBe(true);
  });

  it.each(VENUES.map(v => v.id))('%s puts every pin inside the map, clear of the others', venueId => {
    const list = facilitiesFor(venueId);
    for (const f of list) {
      expect({ id: f.id, inside: f.x >= EDGE && f.x <= MAP_SIZE - EDGE && f.y >= EDGE && f.y <= MAP_SIZE - EDGE }).toEqual({ id: f.id, inside: true });
    }
    for (const a of list) {
      for (const b of list) {
        if (a.id >= b.id) continue;
        expect({ pair: `${a.id}/${b.id}`, apart: Math.hypot(a.x - b.x, a.y - b.y) >= MIN_GAP }).toEqual({ pair: `${a.id}/${b.id}`, apart: true });
      }
    }
  });

  it('has a name, description and location for every facility in all 13 languages', () => {
    const all = VENUES.flatMap(v => facilitiesFor(v.id));
    for (const lng of LANGS) {
      const text = resources[lng].venue.facilityText as Record<string, { name?: string; description?: string; location?: string }>;
      for (const f of all) {
        const row = text[f.id];
        const ok = !!row?.description && !!row.location && !!row.name;
        expect({ lng, id: f.id, ok }).toEqual({ lng, id: f.id, ok: true });
      }
    }
  });

  it('keeps mock.ts and the English strings in step (an id clash would show another facility’s text)', () => {
    const en = i18n.getFixedT('en', 'venue');
    for (const venueId of RESEARCHED) {
      for (const f of facilitiesFor(venueId)) {
        expect([facilityName(f, en), facilityDescription(f, en), facilityLocation(f, en)]).toEqual([f.name, f.description, f.location]);
      }
    }
  });

  it('translates every researched facility name (proper nouns stay inside the translation)', () => {
    for (const lng of LANGS.filter(l => l !== 'en')) {
      const t = i18n.getFixedT(lng, 'venue');
      for (const venueId of RESEARCHED) {
        for (const f of facilitiesFor(venueId)) {
          expect({ lng, id: f.id, same: facilityName(f, t) === f.name }).toEqual({ lng, id: f.id, same: false });
        }
      }
    }
    expect(facilityName(getFacility('crypto-arena', 'kobe-bryant-entrance')!, i18n.getFixedT('es', 'venue'))).toBe('Entrada Kobe Bryant');
    expect(facilityName(getFacility('sofi', 'entry-4')!, i18n.getFixedT('fa', 'venue'))).toBe('ورودی ۴');
  });

  it('points every seed report at a facility of its own venue', () => {
    for (const r of SEED_REPORTS) {
      expect({ id: r.id, found: !!getFacility(r.venueId, r.facilityId) }).toEqual({ id: r.id, found: true });
    }
    for (const venueId of RESEARCHED) {
      expect(SEED_REPORTS.some(r => r.venueId === venueId)).toBe(true);
    }
  });
});
