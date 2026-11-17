/**
 * Facility reports: what visitors found at a gate, restroom or stand ("Gate 2 ramp is cracked").
 *
 * Everything the screens need goes through `ReportStore`, so the in-memory mock can be swapped for
 * Supabase without touching a screen: implement `ReportStore` against a table such as
 *
 *   facility_reports(id uuid pk, venue_id text, facility_id text, author_id uuid references profiles,
 *                    author_name text, title text, topic text, body text, created_at timestamptz)
 *
 * and call `setReportStore(createSupabaseReportStore(client))` at startup.
 * Until then reports live on the device: the seed reports plus the ones this device submitted,
 * which are kept in AsyncStorage under one key so they survive a reload.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Option } from '@/features/profile/options';
import i18n from '@/i18n';
import { formatNumber } from '@/i18n/format';

import { venueT, type VenueT } from './labels';

export type ReportTopic = 'accessibility' | 'directions' | 'facility_condition' | 'security' | 'crowds' | 'other';

/** Topic chip order; labels come from venue:topic.<value>. */
export const REPORT_TOPICS: ReportTopic[] = ['accessibility', 'directions', 'facility_condition', 'security', 'crowds', 'other'];

/** "Accessibility", "Facility condition"... Components pass their useT('venue') `t`. */
export function topicLabel(topic: ReportTopic, t: VenueT = venueT()): string {
  return t(`topic.${topic}`);
}

/** The topic chips, labelled in `t`'s language. */
export function reportTopicOptions(t: VenueT = venueT()): Option<ReportTopic>[] {
  return REPORT_TOPICS.map(value => ({ value, label: topicLabel(value, t) }));
}

export interface FacilityReport {
  id: string;
  venueId: string;
  facilityId: string;
  title: string;
  topic: ReportTopic;
  body: string;
  /** Display name, e.g. "Rosa W."; empty when the author had none (shown as report.authorFallback, see reportAuthor). */
  authorName: string;
  /** The language the title and body were written in, e.g. 'en'. User text is shown as written, never translated. */
  language?: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** What the "Add report" form edits. */
export interface ReportDraft {
  title: string;
  topic: ReportTopic | null;
  body: string;
}

export const emptyReportDraft = (): ReportDraft => ({ title: '', topic: null, body: '' });

export const REPORT_TITLE_MAX = 80;
export const REPORT_BODY_MAX = 1000;

export type ReportErrors = Partial<Record<keyof ReportDraft, string>>;

/** Title and topic are required; the description is optional. Empty object = valid. */
export function validateReport(d: ReportDraft): ReportErrors {
  const errors: ReportErrors = {};
  const title = d.title.trim();
  if (!title) errors.title = i18n.t('venue:form.titleRequired');
  else if (title.length > REPORT_TITLE_MAX) errors.title = i18n.t('venue:form.titleTooLong', { max: formatNumber(REPORT_TITLE_MAX) });
  if (!d.topic) errors.topic = i18n.t('venue:form.topicRequired');
  if (d.body.trim().length > REPORT_BODY_MAX) errors.body = i18n.t('venue:form.bodyTooLong', { max: formatNumber(REPORT_BODY_MAX) });
  return errors;
}

export interface NewReport {
  venueId: string;
  facilityId: string;
  authorName: string;
  /** The UI language while it was written, our best guess at the text's language. */
  language?: string;
  draft: ReportDraft;
}

/** "Rosa W.", or "VenU visitor" in `t`'s language for a report without a name. */
export function reportAuthor(r: Pick<FacilityReport, 'authorName'>, t: VenueT = venueT()): string {
  return r.authorName.trim() || t('report.authorFallback');
}

export interface ReportStore {
  /** Newest first. */
  list(venueId: string, facilityId: string): Promise<FacilityReport[]>;
  get(id: string): Promise<FacilityReport | null>;
  /** Validates, saves and returns the report. Throws `ReportValidationError` on a bad draft. */
  add(report: NewReport): Promise<FacilityReport>;
}

export class ReportValidationError extends Error {
  errors: ReportErrors;
  constructor(errors: ReportErrors) {
    super('Report is incomplete');
    this.errors = errors;
  }
}

/** Store backed by an array; `now` and `makeId` are injectable for tests. */
export function createMemoryReportStore(
  seed: FacilityReport[] = [],
  { now = () => new Date(), makeId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` } = {},
): ReportStore {
  const reports = [...seed];
  return {
    async list(venueId, facilityId) {
      return reports
        .filter(r => r.venueId === venueId && r.facilityId === facilityId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(id) {
      return reports.find(r => r.id === id) ?? null;
    },
    async add({ venueId, facilityId, authorName, language, draft }) {
      const errors = validateReport(draft);
      if (Object.keys(errors).length) throw new ReportValidationError(errors);
      const report: FacilityReport = {
        id: makeId(),
        venueId,
        facilityId,
        title: draft.title.trim(),
        topic: draft.topic!,
        body: draft.body.trim(),
        authorName: authorName.trim(), // a missing name is worded at render (reportAuthor)
        createdAt: now().toISOString(),
        ...(language ? { language } : {}),
      };
      reports.push(report);
      return report;
    },
  };
}

/** The slice of AsyncStorage the persistent store uses; tests pass a Map-backed fake. */
export interface ReportStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const REPORTS_STORAGE_KEY = 'venu.reports.v1';

function isReport(x: unknown): x is FacilityReport {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return ['id', 'venueId', 'facilityId', 'title', 'topic', 'body', 'authorName', 'createdAt'].every(k => typeof r[k] === 'string');
}

/**
 * The memory store, plus the reports added on this device saved to `storage` under
 * `REPORTS_STORAGE_KEY` (a JSON array). Seed reports are never written; they come from `seed` on
 * every load. An unreadable saved value is ignored, and a failed save keeps the report for the session.
 */
export function createPersistentReportStore(
  storage: ReportStorage,
  seed: FacilityReport[] = [],
  options: Parameters<typeof createMemoryReportStore>[1] = {},
): ReportStore {
  let added: FacilityReport[] = [];
  let loaded: Promise<ReportStore> | null = null;
  const load = () => (loaded ??= (async () => {
    try {
      const parsed: unknown = JSON.parse((await storage.getItem(REPORTS_STORAGE_KEY)) ?? '[]');
      if (Array.isArray(parsed)) added = parsed.filter(isReport);
    } catch {}
    const seedIds = new Set(seed.map(r => r.id));
    return createMemoryReportStore([...seed, ...added.filter(r => !seedIds.has(r.id))], options);
  })());
  return {
    async list(venueId, facilityId) {
      return (await load()).list(venueId, facilityId);
    },
    async get(id) {
      return (await load()).get(id);
    },
    async add(report) {
      const saved = await (await load()).add(report);
      added = [...added, saved];
      try {
        await storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(added));
      } catch {
        // Storage full or unavailable: the report still shows until the app reloads.
      }
      return saved;
    },
  };
}

const RAMP_REPORT =
  'I arrived around 45 minutes before kickoff from the east side of the stadium. The ramp was a little hard to find from Entry 11, so give yourself extra time.\n\n' +
  'As a wheelchair user I found it long but steady. Take it slowly near the top when the crowd builds up.';

/**
 * Sample visitor reports, written in English (each carries language: 'en', so screens can say so).
 * Each points at a real facility of its venue (see mock.ts), e.g. SoFi's pedestrian-ramp.
 */
export const SEED_REPORTS: FacilityReport[] = [
  {
    id: 'seed-ramp', venueId: 'sofi', facilityId: 'pedestrian-ramp', topic: 'accessibility',
    title: 'Ramp is a long way round', body: RAMP_REPORT, authorName: 'Rosa W.', createdAt: '2026-10-24T18:30:00.000Z', language: 'en',
  },
  {
    id: 'seed-bags', venueId: 'sofi', facilityId: 'entry-4', topic: 'crowds',
    title: 'Bag check moves fast', authorName: 'Marcus T.', createdAt: '2026-10-20T17:05:00.000Z', language: 'en',
    body: 'The clear-bag lane at Entry 4 took about five minutes an hour before the event. Staff waved wheelchair users to the front.',
  },
  {
    id: 'seed-restroom', venueId: 'crypto-arena', facilityId: 'restroom-m23', topic: 'facility_condition',
    title: 'Room to turn a wheelchair', authorName: 'Ana P.', createdAt: '2026-10-18T20:12:00.000Z', language: 'en',
    body: 'The all-gender restroom has a changing table and enough space to turn a wheelchair. Soap dispenser was empty by the second half.',
  },
  {
    id: 'seed-sensory', venueId: 'intuit-dome', facilityId: 'answers-portal-main', topic: 'accessibility',
    title: 'Listening device in two minutes', authorName: 'Leila H.', createdAt: '2026-10-15T03:20:00.000Z', language: 'en',
    body: 'Picked up a free assisted listening device at the Answers Portal near Main 6. They held my photo ID until I brought it back.',
  },
  {
    id: 'seed-tacos', venueId: 'coliseum', facilityId: 'food-south', topic: 'crowds',
    title: 'Go before halftime', authorName: 'Kenji S.', createdAt: '2026-10-11T02:40:00.000Z', language: 'en',
    body: 'The line was 25 minutes at halftime and under 5 minutes in the first quarter.',
  },
];

let store: ReportStore = createPersistentReportStore(AsyncStorage, SEED_REPORTS);
const listeners = new Set<() => void>();

/** The seam for a real backend: swap the store once at startup. */
export function setReportStore(next: ReportStore): void {
  store = next;
  listeners.forEach(l => l());
}

export function getReportStore(): ReportStore {
  return store;
}

/** Adds a report through the current store and refreshes every screen showing that facility. */
export async function submitReport(report: NewReport): Promise<FacilityReport> {
  const saved = await store.add(report);
  listeners.forEach(l => l());
  return saved;
}

function useStoreVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    listeners.add(bump);
    return () => { listeners.delete(bump); };
  }, []);
  return version;
}

/** Reports for one facility, newest first; `null` while loading. */
export function useFacilityReports(venueId: string, facilityId: string): FacilityReport[] | null {
  const version = useStoreVersion();
  const [state, setState] = useState<{ key: string; reports: FacilityReport[] } | null>(null);
  const key = `${venueId}/${facilityId}/${version}`;
  useEffect(() => {
    let live = true;
    store.list(venueId, facilityId).then(reports => { if (live) setState({ key, reports }); });
    return () => { live = false; };
  }, [venueId, facilityId, key]);
  return state && state.key.startsWith(`${venueId}/${facilityId}/`) ? state.reports : null;
}

/**
 * The report only if it belongs to that facility: a hand-edited link such as
 * /venue/sofi/entry-4/reports/seed-restroom must not show Crypto.com Arena's report under Entry 4.
 * `undefined` (still loading) passes through.
 */
export function reportAt<R extends Pick<FacilityReport, 'venueId' | 'facilityId'>>(
  report: R | null | undefined,
  venueId: string,
  facilityId: string,
): R | null | undefined {
  if (!report) return report;
  return report.venueId === venueId && report.facilityId === facilityId ? report : null;
}

/** One report; `undefined` while loading, `null` if it doesn't exist. */
export function useReport(id: string | undefined): FacilityReport | null | undefined {
  const version = useStoreVersion();
  const [state, setState] = useState<{ id: string; report: FacilityReport | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    store.get(id).then(report => { if (live) setState({ id, report }); });
    return () => { live = false; };
  }, [id, version]);
  if (!id) return null;
  return state?.id === id ? state.report : undefined;
}
