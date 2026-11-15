// The dictation state machine, kept free of React and the native module so it can be unit tested.
// idle → starting → listening → (stopping) → idle; results arrive while listening or stopping.
// e.g. start('Near gate 2') → result('I need', interim) → result('I need a ramp', final) → end
//      composedText(state) === 'Near gate 2 I need a ramp'

export type DictationStatus = 'idle' | 'starting' | 'listening' | 'stopping';

/** What went wrong, as the UI explains it. */
export type DictationError =
  | 'unsupported' // no recognizer here (Expo Go, Firefox, Siri turned off)
  | 'denied' // microphone or speech permission refused
  | 'no-speech' // listened but heard nothing
  | 'failed'; // anything else (network, busy, audio)

export interface DictationState {
  status: DictationStatus;
  /** The field's text when dictation started; dictated words are appended to it. */
  base: string;
  /** Final segments heard so far this session. */
  committed: string;
  /** The words still being recognised (they can change). */
  interim: string;
  error: DictationError | null;
  /** Listening in English because the wanted language isn't supported here. */
  fellBack: boolean;
}

export type DictationAction =
  | { type: 'start'; base: string }
  | { type: 'started'; fellBack: boolean }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'stop' }
  | { type: 'end' }
  | { type: 'error'; error: DictationError };

export const IDLE: DictationState = { status: 'idle', base: '', committed: '', interim: '', error: null, fellBack: false };

export function dictationReducer(state: DictationState, action: DictationAction): DictationState {
  switch (action.type) {
    case 'start':
      return { ...IDLE, status: 'starting', base: action.base };
    case 'started':
      // From listening too: a retry in English after "language not supported" starts again.
      return state.status === 'starting' || state.status === 'listening' ? { ...state, status: 'listening', fellBack: action.fellBack } : state;
    case 'result': {
      // A final result after stop() still counts; anything after the session ended doesn't.
      if (state.status === 'idle') return state;
      return action.isFinal
        ? { ...state, committed: joinSpeech(state.committed, action.transcript), interim: '' }
        : { ...state, interim: action.transcript.trim() };
    }
    case 'stop':
      return state.status === 'idle' ? state : { ...state, status: 'stopping' };
    case 'end':
      // Words still interim when the recogniser stops are what the user saw; keep them.
      return { ...state, status: 'idle', committed: joinSpeech(state.committed, state.interim), interim: '' };
    case 'error':
      return { ...state, status: 'idle', committed: joinSpeech(state.committed, state.interim), interim: '', error: action.error };
  }
}

export const isActive = (s: DictationState) => s.status !== 'idle';

/** Everything heard this session, interim words included. */
export function dictatedText(s: DictationState): string {
  return joinSpeech(s.committed, s.interim);
}

/** What the text field should show: the starting text plus what was heard. */
export function composedText(s: DictationState): string {
  return appendDictation(s.base, dictatedText(s));
}

// Han, kana and full-width punctuation are written without spaces between words.
const NO_SPACE = /[　-ヿ㐀-䶿一-鿿＀-￯]/;

/**
 * Appends dictated words to typed text with one space between, none for Chinese or Japanese.
 * e.g. appendDictation('Stuck near ramp 2.', 'I use a wheelchair') → 'Stuck near ramp 2. I use a wheelchair'
 *      appendDictation('', '  hello ') → 'hello';  appendDictation('2号门', '附近') → '2号门附近'
 */
export function appendDictation(base: string, dictated: string): string {
  const words = dictated.trim();
  if (!words) return base;
  if (!base.trim()) return words;
  const joined = /\s$/.test(base) || (NO_SPACE.test(base.slice(-1)) && NO_SPACE.test(words[0]!)) ? '' : ' ';
  return base + joined + words;
}

function joinSpeech(a: string, b: string): string {
  return a ? appendDictation(a, b) : b.trim();
}

/** Library/Web Speech error codes → what the UI says. null means "ignore" (we aborted on purpose). */
export function errorFromCode(code: string): DictationError | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'denied';
    case 'service-not-allowed':
      return 'unsupported';
    case 'no-speech':
    case 'speech-timeout':
      return 'no-speech';
    default:
      return 'failed';
  }
}
