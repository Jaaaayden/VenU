import { afterEach, describe, expect, it } from '@jest/globals';

import i18n from '@/i18n';
import { resources } from '@/i18n/locales';

import { VENUES } from '../mock';
import { officialMapFor, staysInFrame, venuesWithOfficialMaps } from '../official-maps';

afterEach(async () => { await i18n.changeLanguage('en'); });

describe('officialMapFor', () => {
  it('embeds the interactive maps for SoFi and Crypto.com Arena', () => {
    expect(officialMapFor('sofi')).toEqual({
      kind: 'embed',
      source: 'SoFi Stadium',
      url: 'https://www.sofistadium.com/plan-your-visit/maps',
      pageUrl: 'https://www.sofistadium.com/plan-your-visit/maps',
    });
    expect(officialMapFor('crypto-arena')).toEqual({
      kind: 'embed',
      source: 'Crypto.com Arena',
      url: 'https://visit.cryptoarena.com/map',
      pageUrl: 'https://visit.cryptoarena.com/map',
    });
  });

  it('shows Intuit Dome’s three published images, exterior first', () => {
    const map = officialMapFor('intuit-dome');
    expect(map?.kind).toBe('images');
    if (map?.kind !== 'images') return;
    expect(map.source).toBe('Intuit Dome');
    expect(map.pageUrl).toBe('https://www.intuitdome.com/plan-your-visit/venue-map');
    expect(map.images.map(i => i.id)).toEqual(['exterior', 'east_garage', 'west_garage']);
    for (const image of map.images) {
      expect(image.url).toMatch(/^https:\/\/publish-p111705-e1087822\.adobeaemcloud\.com\/content\/dam\/intuit-dome\/.+-1920x1080\.jpg$/);
      expect([image.width, image.height]).toEqual([1920, 1080]);
    }
  });

  it('keeps the schematic map for the Coliseum and the Rose Bowl', () => {
    expect(officialMapFor('coliseum')).toBeUndefined();
    expect(officialMapFor('rose-bowl')).toBeUndefined();
    expect(officialMapFor('nowhere')).toBeUndefined();
    expect(officialMapFor('constructor')).toBeUndefined();
  });

  it('only lists real venues, over https', () => {
    const ids = VENUES.map(v => v.id);
    expect(venuesWithOfficialMaps().sort()).toEqual(['crypto-arena', 'intuit-dome', 'sofi']);
    for (const id of venuesWithOfficialMaps()) {
      expect(ids).toContain(id);
      const map = officialMapFor(id)!;
      expect(map.pageUrl).toMatch(/^https:\/\//);
      if (map.kind === 'embed') expect(map.url).toMatch(/^https:\/\//);
    }
  });
});

describe('staysInFrame', () => {
  const crypto = 'https://visit.cryptoarena.com/map';

  it('keeps the venue’s own pages in the frame', () => {
    expect(staysInFrame(crypto, 'https://visit.cryptoarena.com/map?level=2')).toBe(true);
    expect(staysInFrame(crypto, 'https://www.cryptoarena.com/events')).toBe(true);
    expect(staysInFrame(crypto, 'about:blank')).toBe(true);
  });

  it('sends other sites and app links to the browser', () => {
    expect(staysInFrame(crypto, 'https://www.ticketmaster.com/event/1')).toBe(false);
    expect(staysInFrame(crypto, 'https://cryptoarena.com.evil.example/map')).toBe(false);
    expect(staysInFrame(crypto, 'tel:+12137427100')).toBe(false);
    expect(staysInFrame(crypto, 'not a url')).toBe(false);
  });
});

describe('official map strings', () => {
  it('names the source in every language without translating it', async () => {
    for (const lang of Object.keys(resources)) {
      const block = resources[lang as keyof typeof resources].venue.officialMap;
      expect(block.attribution).toContain('{{source}}');
      expect(block.frameLabel).toContain('{{source}}');
      expect(Object.keys(block.views).sort()).toEqual(['east_garage', 'exterior', 'west_garage']);
    }
    expect(i18n.t('venue:officialMap.attribution', { source: 'SoFi Stadium' })).toBe('Map: SoFi Stadium');
    await i18n.changeLanguage('es');
    expect(i18n.t('venue:officialMap.attribution', { source: 'SoFi Stadium' })).toBe('Mapa: SoFi Stadium');
    expect(i18n.t('venue:officialMap.views.east_garage')).toBe('Garaje este');
  });

  it('is actually translated, not copied from English', () => {
    const en = resources.en.venue.officialMap;
    for (const lang of Object.keys(resources).filter(l => l !== 'en')) {
      const block = resources[lang as keyof typeof resources].venue.officialMap;
      expect([lang, block.open]).not.toEqual([lang, en.open]);
      expect([lang, block.error]).not.toEqual([lang, en.error]);
    }
  });
});
