// What a chat bubble shows for one message, in the reader's language.
import { useEffect, useSyncExternalStore } from 'react';

import { useProfile } from '@/features/profile/profile-context';
import type { ChatMessage } from '@/features/volunteer/types';
import { useUiLanguage } from '@/i18n';

import type { Entry, TranslationCache } from './cache';
import { translationCache } from './service';

/**
 * original: show the message as written (yours, or already in the reader's language).
 * loading: show the original with "Translating…". translated: show `text`, "Translated from <source>".
 * failed / unsupported / unavailable: show the original with a note saying why.
 */
export type MessageTranslation =
  | { kind: 'original' }
  | { kind: 'loading' }
  | { kind: 'translated'; text: string; source: string | null }
  | { kind: 'failed' }
  | { kind: 'unsupported' }
  | { kind: 'unavailable' };

const base = (code: string) => code.split(/[-_]/)[0]!.toLowerCase();

/** The written language someone reads: ASL users read English text. e.g. 'pt-BR' → 'pt', 'ase' → 'en'. */
export function readingLanguage(code: string): string {
  const b = base(code);
  return b === 'ase' ? 'en' : b;
}

/** The profile's main language (even one the UI isn't translated into, e.g. Hindi), else the UI language. */
export function useReaderLanguage(): string {
  const { profile } = useProfile();
  const { language } = useUiLanguage();
  return readingLanguage(profile?.mainLanguage || language);
}

/** Messages that never need a request: yours, empty ones, ones already in the reader's language. */
export function needsTranslation(message: ChatMessage, reader: string): boolean {
  if (message.from === 'me' || !message.text.trim()) return false;
  return !message.lang || readingLanguage(message.lang) !== reader;
}

export function viewOf(entry: Entry | undefined, message: ChatMessage, reader: string): MessageTranslation {
  if (!needsTranslation(message, reader)) return { kind: 'original' };
  if (!entry || entry.status === 'loading') return { kind: 'loading' };
  if (entry.status === 'error') return { kind: 'failed' };
  const r = entry.result;
  if (r.refused) return { kind: 'failed' };
  if (r.unsupported) return { kind: 'unsupported' };
  if (r.unavailable) return { kind: 'unavailable' };
  const source = r.detectedSource ?? (message.lang ? base(message.lang) : null);
  if (source === reader || r.text.trim() === message.text.trim()) return { kind: 'original' };
  return { kind: 'translated', text: r.text, source };
}

export function useMessageTranslation(message: ChatMessage, reader: string, cache: TranslationCache = translationCache): MessageTranslation {
  const needed = needsTranslation(message, reader);
  const entry = useSyncExternalStore(
    cache.subscribe,
    () => (needed ? cache.get(message.id, reader) : undefined),
    () => (needed ? cache.get(message.id, reader) : undefined),
  );
  const { id, text, lang } = message;
  useEffect(() => {
    if (needed) cache.request(id, { text, target: reader, ...(lang ? { source: lang } : {}) });
  }, [cache, needed, id, text, lang, reader]);
  return viewOf(entry, message, reader);
}
