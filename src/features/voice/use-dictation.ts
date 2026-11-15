// Speech-to-text for a text field, on the device where it can be (no API key; VenU never gets audio).
// Listens in the profile's main language, else the UI language. Stops on unmount and when the app
// goes to the background. Before sending, `await complete()` for the last words.
// e.g. const dictation = useDictation({ onCommit: setText, onNote: show });
//      <TextInput value={dictation.liveText ?? text} onChangeText={t => { setText(t); dictation.edit(t); }} />
//      <Pressable onPress={() => dictation.toggle(text)}>{dictation.listening ? 'Stop' : 'Speak'}</Pressable>

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isolatedLanguageName } from '@/features/profile/options';
import { useProfile } from '@/features/profile/profile-context';
import { useT, useUiLanguage } from '@/i18n';

import { announce } from './announce';
import { composedText, IDLE, isActive, type DictationError, type DictationState } from './dictation-state';
import { speechEngine } from './engine';
import { pickSpeechLanguage } from './languages';
import { DictationSession } from './session';

interface Options {
  /** The field's text (typed plus heard) on every change, interim words included. */
  onText?: (text: string) => void;
  /** The same text once it settles (final result, session end). Save here, not in onText. */
  onCommit?: (text: string) => void;
  /** A one-line note for the user: voice unavailable, permission off, listening in English. */
  onNote: (text: string) => void;
}

export interface Dictation {
  status: DictationState['status'];
  /** True from the tap until the recogniser has stopped. */
  listening: boolean;
  /** What the field should show while listening (typed plus heard); null when not listening. */
  liveText: string | null;
  error: DictationError | null;
  start: (currentText: string) => void;
  stop: () => void;
  abort: () => void;
  toggle: (currentText: string) => void;
  /** Call from the field's onChangeText: typing while listening is kept. */
  edit: (text: string) => void;
  /** Stop, wait briefly for the final words, resolve with the field's text (null if not listening). */
  complete: () => Promise<string | null>;
}

export function useDictation({ onText, onCommit, onNote }: Options): Dictation {
  const t = useT('common');
  const { profile } = useProfile();
  const { language: ui } = useUiLanguage();
  const speech = pickSpeechLanguage({ profile: profile?.mainLanguage, ui });
  const [state, setState] = useState<DictationState>(IDLE);

  // The session outlives renders; it reads the latest callbacks and strings through this ref.
  const latest = useRef({ onText, onCommit, onNote, t, speech });
  useLayoutEffect(() => {
    latest.current = { onText, onCommit, onNote, t, speech };
  });

  // One session per mounted field, made in an effect (refs can't be handed out during render).
  const session = useRef<DictationSession | null>(null);
  useEffect(() => {
    const s = new DictationSession(
      {
        onState: setState,
        onText: text => latest.current.onText?.(text),
        onCommit: text => latest.current.onCommit?.(text),
        onListening: fellBack => {
          const { t: tr, onNote: note, speech: lang } = latest.current;
          announce(tr('media.voiceStarted'));
          if (fellBack) note(tr('media.voiceEnglish', { language: isolatedLanguageName(lang.code) }));
        },
        onError: error => latest.current.onNote(errorNote(latest.current.t, error)),
        onEnd: heard => {
          if (heard) announce(latest.current.t('media.voiceStopped'));
        },
      },
      { platform: Platform.OS, engine: speechEngine },
    );
    session.current = s;
    // Only a real trip to the background stops listening. iOS also goes "inactive" while its
    // permission alert is up, and stopping then would cancel the tap that asked.
    const sub = AppState.addEventListener('change', next => {
      if (next === 'background' && !s.preparing) s.stop();
    });
    return () => {
      sub.remove();
      s.dispose(); // silent: no state updates or "Stopped listening" from a closed screen
      session.current = null;
    };
  }, []);

  const start = (currentText: string) => void session.current?.start(currentText, speech.locale);
  const stop = () => session.current?.stop();
  const active = isActive(state);
  return {
    status: state.status,
    listening: active,
    liveText: active ? composedText(state) : null,
    error: state.error,
    start,
    stop,
    abort: () => session.current?.abort(),
    toggle: currentText => (session.current && isActive(session.current.snapshot) ? stop() : start(currentText)),
    edit: text => session.current?.edit(text),
    complete: () => session.current?.complete() ?? Promise.resolve(null),
  };
}

type CommonT = ReturnType<typeof useT<'common'>>;

function errorNote(t: CommonT, error: DictationError): string {
  switch (error) {
    case 'unsupported':
      return t('media.voiceUnavailable');
    case 'denied':
      return Platform.OS === 'ios' ? t('media.voiceDeniedIos') : Platform.OS === 'android' ? t('media.voiceDeniedAndroid') : t('media.voiceDeniedWeb');
    case 'no-speech':
      return t('media.voiceNoSpeech');
    case 'failed':
      return t('media.voiceFailed');
  }
}
