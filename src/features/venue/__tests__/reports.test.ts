import { afterEach, describe, expect, it, jest } from '@jest/globals';

import i18n from '@/i18n';
import { formatDate } from '@/i18n/format';

import { facilitiesFor, matchesCategory, searchFacilities, searchVenues } from '../mock';
import {
  createMemoryReportStore,
  createPersistentReportStore,
  reportAt,
  reportAuthor,
  REPORTS_STORAGE_KEY,
  ReportValidationError,
  SEED_REPORTS,
  validateReport,
  type ReportDraft,
} from '../reports';

// reports.ts builds the app's store on AsyncStorage, which has no native module under jest.
// These tests pass their own storage, so the app's one only needs to exist (jest hoists this).
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => {} } }));

const good: ReportDraft = { title: '  Elevator out at Gate 2 ', topic: 'accessibility', body: ' Use the ramp instead. ' };

describe('validateReport', () => {
  it('accepts a title and topic without a description', () => {
    expect(validateReport({ ...good, body: '' })).toEqual({});
  });

  it('requires a title and a topic', () => {
    const errors = validateReport({ title: '   ', topic: null, body: '' });
    expect(Object.keys(errors).sort()).toEqual(['title', 'topic']);
  });

  it('caps the title and body length', () => {
    const errors = validateReport({ ...good, title: 'x'.repeat(81), body: 'y'.repeat(1001) });
    expect(Object.keys(errors).sort()).toEqual(['body', 'title']);
  });
});

describe('memory report store', () => {
  const now = () => new Date('2026-11-11T12:00:00.000Z');
  let n = 0;
  const makeId = () => `t${++n}`;

  it('lists a facility’s reports newest first', async () => {
    const older = { ...SEED_REPORTS[1], id: 'older', title: 'Older', createdAt: '2026-10-01T00:00:00.000Z' };
    const store = createMemoryReportStore([older, ...SEED_REPORTS], { now, makeId });
    const list = await store.list('sofi', 'entry-4');
    expect(list.map(r => r.title)).toEqual(['Bag check moves fast', 'Older']);
    expect(await store.list('sofi', 'entry-6')).toEqual([]);
  });

  it('adds a trimmed report at the top of that facility’s list only', async () => {
    const store = createMemoryReportStore(SEED_REPORTS, { now, makeId });
    const saved = await store.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: ' Rosa ', draft: good });
    expect(saved).toMatchObject({
      title: 'Elevator out at Gate 2', body: 'Use the ramp instead.', authorName: 'Rosa', topic: 'accessibility',
      createdAt: '2026-11-11T12:00:00.000Z',
    });
    expect((await store.list('sofi', 'entry-4')).map(r => r.id)).toEqual([saved.id, 'seed-bags']);
    expect(await store.list('intuit-dome', 'entry-4')).toEqual([]);
    expect(await store.get(saved.id)).toEqual(saved);
  });

  it('marks the seed reports as English and keeps the language a report was written in', async () => {
    expect(SEED_REPORTS.every(r => r.language === 'en')).toBe(true);
    const store = createMemoryReportStore([], { now, makeId });
    expect((await store.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', language: 'es', draft: good })).language).toBe('es');
    expect((await store.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', draft: good })).language).toBeUndefined();
  });

  it('stores no made-up English name; the screen words the fallback author in its language', async () => {
    const store = createMemoryReportStore([], { now, makeId });
    const saved = await store.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: '  ', draft: good });
    expect(saved.authorName).toBe('');
    expect(reportAuthor(saved, i18n.getFixedT('en', 'venue'))).toBe('VenU visitor');
    expect(reportAuthor(saved, i18n.getFixedT('es', 'venue'))).toBe('Visitante de VenU');
    expect(reportAuthor({ authorName: 'Rosa W.' }, i18n.getFixedT('es', 'venue'))).toBe('Rosa W.');
  });

  it('rejects an incomplete draft with field errors', async () => {
    const store = createMemoryReportStore([], { now, makeId });
    await expect(store.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', draft: { title: '', topic: null, body: '' } }))
      .rejects.toBeInstanceOf(ReportValidationError);
    expect(await store.list('sofi', 'entry-4')).toEqual([]);
  });
});

describe('reportAt', () => {
  const restroom = SEED_REPORTS.find(r => r.id === 'seed-restroom')!;

  it('keeps a report opened under its own facility', () => {
    expect(reportAt(restroom, 'crypto-arena', 'restroom-m23')).toBe(restroom);
  });

  it('hides a report linked under another venue or facility', () => {
    expect(reportAt(restroom, 'sofi', 'entry-4')).toBeNull();
    expect(reportAt(restroom, 'crypto-arena', 'first-aid-m3')).toBeNull();
  });

  it('passes loading and missing through', () => {
    expect(reportAt(undefined, 'sofi', 'entry-4')).toBeUndefined();
    expect(reportAt(null, 'sofi', 'entry-4')).toBeNull();
  });
});

describe('submitted line', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });

  // report-detail.tsx: t('report.submitted', { date: formatDate(report.createdAt) })
  const line = () => i18n.t('venue:report.submitted', { date: formatDate('2026-10-24T12:00:00.000Z') });

  it('is one sentence with the date in each language’s format', async () => {
    expect(line()).toBe('Submitted 10/24/2026');
    await i18n.changeLanguage('es');
    expect(line()).toBe('Enviado el 24/10/2026');
    await i18n.changeLanguage('ja');
    expect(line()).toBe('2026/10/24 に送信');
  });
});

describe('validation messages', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('follow the app language', async () => {
    expect(validateReport({ title: '', topic: null, body: '' }).topic).toBe('Pick the topic that fits best.');
    await i18n.changeLanguage('es');
    const errors = validateReport({ ...good, title: 'x'.repeat(81) });
    expect(errors.title).toBe('El título debe tener menos de 80 caracteres.');
  });
});

describe('venue search', () => {
  it('matches every word against name and address', () => {
    expect(searchVenues('inglewood').map(v => v.id)).toEqual(['sofi', 'intuit-dome']);
    expect(searchVenues('figueroa angeles').map(v => v.id)).toEqual(['crypto-arena']);
    expect(searchVenues('  ')).toHaveLength(3);
  });

  it('filters facilities by category and words', () => {
    const all = facilitiesFor('crypto-arena');
    expect(searchFacilities(all, '', 'gate').map(f => f.id)).toEqual(['kobe-bryant-entrance', 'star-plaza-entrance', 'figueroa-entrance']);
    expect(searchFacilities(all, 'figueroa', 'parking').map(f => f.id)).toEqual(['rideshare-figueroa']);
    // "Accessibility" also matches accessible gates, restrooms and so on.
    expect(all.filter(f => matchesCategory(f, 'accessible')).length).toBeGreaterThan(1);
    expect(all.filter(f => matchesCategory(f, 'accessible')).every(f => f.accessible || f.category === 'accessible')).toBe(true);
  });
});

describe('persistent report store', () => {
  const now = () => new Date('2026-11-11T12:00:00.000Z');
  const fakeStorage = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial));
    return {
      data,
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => { data.set(k, v); },
    };
  };

  it('saves only user reports, under one key, and loads them back after a reload', async () => {
    const storage = fakeStorage();
    const first = createPersistentReportStore(storage, SEED_REPORTS, { now, makeId: () => 'mine-1' });
    await first.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', draft: good });

    expect([...storage.data.keys()]).toEqual([REPORTS_STORAGE_KEY]);
    const saved = JSON.parse(storage.data.get(REPORTS_STORAGE_KEY)!);
    expect(saved.map((r: { id: string }) => r.id)).toEqual(['mine-1']);

    // A fresh store over the same storage = the app after a reload.
    const second = createPersistentReportStore(storage, SEED_REPORTS, { now });
    const list = await second.list('sofi', 'entry-4');
    expect(list.map(r => r.id)).toEqual(['mine-1', 'seed-bags']);
    expect(await second.get('mine-1')).toMatchObject({ title: 'Elevator out at Gate 2' });
  });

  it('keeps adding to what was saved before', async () => {
    const storage = fakeStorage();
    let n = 0;
    const makeId = () => `mine-${++n}`;
    await createPersistentReportStore(storage, [], { now, makeId }).add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', draft: good });
    await createPersistentReportStore(storage, [], { now, makeId }).add({ venueId: 'sofi', facilityId: 'entry-3', authorName: 'Rosa', draft: good });
    expect(JSON.parse(storage.data.get(REPORTS_STORAGE_KEY)!).map((r: { id: string }) => r.id)).toEqual(['mine-1', 'mine-2']);
  });

  it('ignores an unreadable saved value and bad rows, and still serves the seed', async () => {
    const broken = createPersistentReportStore(fakeStorage({ [REPORTS_STORAGE_KEY]: '{not json' }), SEED_REPORTS);
    expect((await broken.list('sofi', 'entry-4')).map(r => r.id)).toEqual(['seed-bags']);

    const mixed = createPersistentReportStore(fakeStorage({ [REPORTS_STORAGE_KEY]: JSON.stringify([{ id: 'x' }, SEED_REPORTS[1]]) }), SEED_REPORTS);
    expect((await mixed.list('sofi', 'entry-4')).map(r => r.id)).toEqual(['seed-bags']); // no duplicate seed
  });

  it('keeps the report for the session when saving fails', async () => {
    const storage = { getItem: async () => null, setItem: async () => { throw new Error('quota'); } };
    const s = createPersistentReportStore(storage, [], { now, makeId: () => 'mine-1' });
    await s.add({ venueId: 'sofi', facilityId: 'entry-4', authorName: 'Rosa', draft: good });
    expect((await s.list('sofi', 'entry-4')).map(r => r.id)).toEqual(['mine-1']);
  });
});
