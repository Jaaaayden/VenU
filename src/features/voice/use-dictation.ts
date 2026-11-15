// Speech-to-text for a text field, on the device where it can be (no API key; VenU never gets audio).
// Listens in the profile's main language, else the UI language. Stops on unmount and when the app
// goes to the background; call abort() before sending so late words don't refill the field.
// e.g. const dictation = useDictation({ onText: setText, onNote: show });
//      <Pressable onPress={() => dictation.toggle(text)}>{dictation.listening ? 'Stop' : 'Speak'}</Pressable>

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isolatedLanguageName } from '@/features/profile/options';
import { useProfile } from '@/features/profile/profile-context';
import { useT, useUiLanguage } from '@/i18n';

import { announce } from './announce';
import { IDLE, isActive, type DictationError, type DictationState } from './dictation-state';
import { speechEngine } from './engine';
import { pickSpeechLanguage } from './languages';
import { DictationSession } from './session';

interface Options {
  /** The field's new text (what was typed plus what was heard), as the words come in. */
  onText: (text: string) => void;
  /** A one-line note for the user: voice unavailable, permission off, listening in English. */
  onNote: (text: string) => void;
}

export interface Dictation {
  status: DictationState['status'];
  /** True from the tap until the recogniser has stopped. */
  listening: boolean;
  interim: string;
  finalText: string;
  error: DictationError | null;
  start: (currentText: string) => void;
  stop: () => void;
  /** Stop and drop words still being recognised (on send). */
  abort: () => void;
  toggle: (currentText: string) => void;
}

export function useDictation({ onText, onNote }: Options): Dictation {
  const t = useT('common');
  const { profile } = useProfile();
  const { language: ui } = useUiLanguage();
  const speech = pickSpeechLanguage({ profile: profile?.mainLanguage, ui });
  const [state, setState] = useState<DictationState>(IDLE);

  // The session outlives renders; it reads the latest callbacks and strings through this ref.
  const latest = useRef({ onText, onNote, t, speech });
  useLayoutEffect(() => {
    latest.current = { onText, onNote, t, speech };
  });

  // One session per mounted field, made in an effect (refs can't be handed out during render).
  // It ends when the field unmounts and stops when the app goes to the background.
  const session = useRef<DictationSession | null>(null);
  useEffect(() => {
    const s = new DictationSession(
      {
        onState: setState,
        onText: text => latest.current.onText(text),
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
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') s.stop();
    });
    return () => {
      sub.remove();
      s.abort();
      session.current = null;
    };
  }, []);

  const start = (currentText: string) => void session.current?.start(currentText, speech.locale);
  const stop = () => session.current?.stop();
  return {
    status: state.status,
    listening: isActive(state),
    interim: state.interim,
    finalText: state.committed,
    error: state.error,
    start,
    stop,
    abort: () => session.current?.abort(),
    toggle: currentText => (session.current && isActive(session.current.snapshot) ? stop() : start(currentText)),
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
