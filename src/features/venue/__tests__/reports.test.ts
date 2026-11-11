import { describe, expect, it } from '@jest/globals';

import { facilitiesFor, matchesCategory, searchFacilities, searchVenues } from '../mock';
import {
  createMemoryReportStore,
  formatReportDate,
  ReportValidationError,
  SEED_REPORTS,
  validateReport,
  type ReportDraft,
} from '../reports';

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
    const store = createMemoryReportStore(SEED_REPORTS, { now, makeId });
    const list = await store.list('sofi', 'gate-2');
    expect(list.map(r => r.title)).toEqual(['Gate 2 Ramp Outdated', 'Bag check moves fast']);
    expect(await store.list('sofi', 'gate-4')).toEqual([]);
  });

  it('adds a trimmed report at the top of that facility’s list only', async () => {
    const store = createMemoryReportStore(SEED_REPORTS, { now, makeId });
    const saved = await store.add({ venueId: 'sofi', facilityId: 'gate-2', authorName: ' Rosa ', draft: good });
    expect(saved).toMatchObject({
      title: 'Elevator out at Gate 2', body: 'Use the ramp instead.', authorName: 'Rosa', topic: 'accessibility',
      createdAt: '2026-11-11T12:00:00.000Z',
    });
    expect((await store.list('sofi', 'gate-2'))[0].id).toBe(saved.id);
    expect(await store.list('coliseum', 'gate-2')).toEqual([]);
    expect(await store.get(saved.id)).toEqual(saved);
  });

  it('rejects an incomplete draft with field errors', async () => {
    const store = createMemoryReportStore([], { now, makeId });
    await expect(store.add({ venueId: 'sofi', facilityId: 'gate-2', authorName: 'Rosa', draft: { title: '', topic: null, body: '' } }))
      .rejects.toBeInstanceOf(ReportValidationError);
    expect(await store.list('sofi', 'gate-2')).toEqual([]);
  });
});

describe('formatReportDate', () => {
  it('formats as MM/DD/YYYY', () => {
    expect(formatReportDate('2026-10-24T12:00:00.000Z')).toBe('10/24/2026');
  });
});

describe('venue search', () => {
  it('matches every word against name and address', () => {
    expect(searchVenues('inglewood').map(v => v.id)).toEqual(['sofi', 'intuit-dome']);
    expect(searchVenues('rose pasadena').map(v => v.id)).toEqual(['rose-bowl']);
    expect(searchVenues('  ')).toHaveLength(5);
  });

  it('filters facilities by category and words', () => {
    const all = facilitiesFor('sofi');
    expect(searchFacilities(all, '', 'gate').map(f => f.id)).toEqual(['gate-1', 'gate-2', 'gate-3', 'gate-4']);
    expect(searchFacilities(all, 'taco', null).map(f => f.id)).toEqual(['food-south']);
    // "Accessibility" also matches accessible gates, restrooms and so on.
    expect(all.filter(f => matchesCategory(f, 'accessible')).length).toBeGreaterThan(1);
    expect(all.filter(f => matchesCategory(f, 'accessible')).every(f => f.accessible)).toBe(true);
  });
});
