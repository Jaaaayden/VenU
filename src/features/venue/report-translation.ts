// A facility report in the reader's language, through the chat's translation service (one call per
// report, kept across reloads, shared by the list card and the detail). Title and body switch to the
// original together. The author's own report shows as written.
//   const r = useReportTranslation(report);  r.title, r.body, r.view ('translated', 'loading', …), r.toggle()
import { useCallback, useState } from 'react';

import { useMessageTranslation, useReaderLanguage, type MessageTranslation, type Translatable } from '@/features/translate';

import type { FacilityReport } from './reports';

export interface ReportTranslation {
  title: string;
  body: string;
  /** The body's translation (the title's when there's no body), for TranslationNote. */
  view: MessageTranslation;
  original: boolean;
  toggle: () => void;
  retry: () => void;
  reader: string;
}

function part(report: FacilityReport | null | undefined, field: 'title' | 'body'): Translatable {
  return {
    id: `report:${report?.id ?? ''}:${field}`,
    from: report?.mine ? 'me' : 'them',
    text: report?.[field] ?? '',
    ...(report?.language ? { lang: report.language } : {}),
  };
}

const shown = (view: MessageTranslation, text: string, original: boolean) =>
  view.kind === 'translated' && !original ? (view.partial ? `${view.text}…` : view.text) : text;

export function useReportTranslation(report: FacilityReport | null | undefined): ReportTranslation {
  const reader = useReaderLanguage();
  const title = useMessageTranslation(part(report, 'title'), reader);
  const body = useMessageTranslation(part(report, 'body'), reader);
  const [original, setOriginal] = useState(false);
  const toggle = useCallback(() => setOriginal(o => !o), []);
  const { retry: retryTitle } = title;
  const { retry: retryBody } = body;
  const retry = useCallback(() => { retryTitle(); retryBody(); }, [retryTitle, retryBody]);
  return {
    title: shown(title.view, report?.title ?? '', original),
    body: shown(body.view, report?.body ?? '', original),
    view: report?.body ? body.view : title.view,
    original,
    toggle,
    retry,
    reader,
  };
}
