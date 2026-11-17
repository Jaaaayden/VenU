import { afterEach, describe, expect, it } from '@jest/globals';

import i18n from '@/i18n';
import { resources } from '@/i18n/locales';

import { VENUES } from '../mock';
import { frameNavigation, hostAllowed, officialMapFor, venuesWithOfficialMaps, type EmbeddedOfficialMap } from '../official-maps';

afterEach(async () => { await i18n.changeLanguage('en'); });

describe('officialMapFor', () => {
  it('embeds the interactive maps for SoFi and Crypto.com Arena', () => {
    expect(officialMapFor('sofi')).toEqual({
      kind: 'embed',
      source: 'SoFi Stadium',
      url: 'https://www.sofistadium.com/plan-your-visit/maps',
      pageUrl: 'https://www.sofistadium.com/plan-your-visit/maps',
      frameHosts: ['sofistadium.com', 'www.sofistadium.com', '*.mappedin.com', '*.ketchcdn.com'],
    });
    expect(officialMapFor('crypto-arena')).toMatchObject({
      kind: 'embed',
      source: 'Crypto.com Arena',
      url: 'https://visit.cryptoarena.com/map',
      pageUrl: 'https://visit.cryptoarena.com/map',
    });
  });

  it('defaults an embed’s page to the framed URL and returns the same object each time', () => {
    const map = officialMapFor('crypto-arena');
    expect(map?.pageUrl).toBe(map?.kind === 'embed' ? map.url : undefined);
    expect(officialMapFor('crypto-arena')).toBe(map);
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

  it('has no map for an unknown venue', () => {
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

describe('hostAllowed', () => {
  it('matches exact hosts and wildcard domains, nothing looser', () => {
    expect(hostAllowed(['visit.cryptoarena.com'], 'visit.cryptoarena.com')).toBe(true);
    expect(hostAllowed(['visit.cryptoarena.com'], 'cryptoarena.com')).toBe(false);
    expect(hostAllowed(['*.mappedin.com'], 'cdn.mappedin.com')).toBe(true);
    expect(hostAllowed(['*.mappedin.com'], 'mappedin.com')).toBe(true);
    expect(hostAllowed(['*.mappedin.com'], 'evilmappedin.com')).toBe(false);
    expect(hostAllowed(['*.mappedin.com'], 'mappedin.com.evil.example')).toBe(false);
    // No "last two labels" guessing: co.uk-style suffixes don't widen the match.
    expect(hostAllowed(['venue.co.uk'], 'other.co.uk')).toBe(false);
  });
});

describe('frameNavigation', () => {
  const crypto = officialMapFor('crypto-arena') as EmbeddedOfficialMap;
  const tap = (url: string, platform = 'ios') => frameNavigation(crypto, { url, isTopFrame: true, navigationType: 'click', loaded: true, platform });

  it('keeps everything web in the frame until the first load finishes', () => {
    // A redirect or consent hop to another site during the initial load.
    expect(frameNavigation(crypto, { url: 'https://consent.example.com/hop', isTopFrame: true, navigationType: 'other', loaded: false, platform: 'ios' })).toBe('allow');
    expect(frameNavigation(crypto, { url: 'https://consent.example.com/hop', isTopFrame: true, loaded: false, platform: 'android' })).toBe('allow');
  });

  it('opens a tapped link to another site in the browser, and keeps the venue’s own', () => {
    expect(tap('https://www.ticketmaster.com/event/1')).toBe('browser');
    expect(tap('https://cryptoarena.com.evil.example/map')).toBe('browser');
    expect(tap('https://visit.cryptoarena.com/map?level=2')).toBe('allow');
    expect(tap('https://crypto-arena.wayfyndr.com/x')).toBe('allow');
  });

  it('treats any Android top-frame navigation after load as the visitor’s, since Android says no more', () => {
    expect(frameNavigation(crypto, { url: 'https://www.ticketmaster.com/', isTopFrame: true, navigationType: 'other', loaded: true, platform: 'android' })).toBe('browser');
  });

  it('leaves iOS script navigations, reloads and subframes alone', () => {
    expect(frameNavigation(crypto, { url: 'https://www.ticketmaster.com/', isTopFrame: true, navigationType: 'other', loaded: true, platform: 'ios' })).toBe('allow');
    expect(frameNavigation(crypto, { url: 'https://ads.example.com/frame', isTopFrame: false, navigationType: 'click', loaded: true, platform: 'ios' })).toBe('allow');
    expect(tap('about:blank')).toBe('allow');
  });

  it('hands tapped tel:, mailto:, sms:, intent: and maps links to the phone', () => {
    for (const url of ['tel:+12137427100', 'mailto:info@example.com', 'sms:+12137427100', 'intent://maps#Intent;end', 'geo:34.04,-118.26', 'maps://?q=Crypto.com+Arena']) {
      expect([url, tap(url)]).toEqual([url, 'app']);
      expect([url, tap(url, 'android')]).toEqual([url, 'app']);
    }
  });

  it('never loads an app link in the frame, even when nobody tapped it', () => {
    expect(frameNavigation(crypto, { url: 'intent://x#Intent;end', isTopFrame: true, navigationType: 'other', loaded: true, platform: 'ios' })).toBe('block');
    expect(frameNavigation(crypto, { url: 'tel:911', isTopFrame: true, loaded: false, platform: 'android' })).toBe('block');
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
