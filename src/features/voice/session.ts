// One dictation session against the recogniser, without React: asks for the microphone, picks a
// locale plan, listens, and reports state and text through callbacks. useDictation wraps it; tests
// drive it with a fake engine.
// e.g. const s = new DictationSession({ onState, onText }, { platform: 'ios', engine: speechEngine });
//      await s.start('Near gate 2', 'es-US'); … const text = await s.complete(); // stop, wait for the final words

import { dictatedText, composedText, dictationReducer, errorFromCode, IDLE, isActive, type DictationAction, type DictationError, type DictationState } from './dictation-state';
import { isEngineAvailable, type SpeechEngine } from './engine';
import { startPlans, type LocaleSupport, type StartPlan } from './languages';

export interface SessionCallbacks {
  onState: (state: DictationState) => void;
  /** The field's new text (typed plus heard), on every change including interim words. */
  onText?: (text: string) => void;
  /** The same text, only when it settles: on a final result and when the session ends. For saving. */
  onCommit?: (text: string) => void;
  /** The recogniser is listening; `fellBack` when it's listening in English instead. */
  onListening?: (fellBack: boolean) => void;
  onError?: (error: DictationError) => void;
  /** The session is over (stopped, aborted or failed). `heard` is false if it never started listening. */
  onEnd?: (heard: boolean) => void;
}

export interface SessionEnv {
  platform: string;
  engine: () => SpeechEngine | null;
}

/** If the recogniser never says it ended after stop(), give up waiting after this long. */
export const STOP_TIMEOUT_MS = 3000;
type Subscription = ReturnType<SpeechEngine['addListener']>;
const NO_SUPPORT: LocaleSupport = { locales: [], installed: [] };
const SILENT: SessionCallbacks = { onState: () => {} };

/**
 * idle: nothing running. preparing: awaiting the permission prompt or the locale list; the
 * recogniser hasn't been started, so stopping just cancels. running: the recogniser was started.
 */
type Phase = 'idle' | 'preparing' | 'running';

/** The recogniser is shared by the whole app; starting one session cancels another. */
let current: DictationSession | null = null;

export class DictationSession {
  private state: DictationState = IDLE;
  private phase: Phase = 'idle';
  private engine: SpeechEngine | null = null;
  private subs: Subscription[] = [];
  private plans: StartPlan[] = [];
  private plan = 0;
  private retrying = false;
  private listened = false;
  private lastCommit = '';
  private waiters: ((text: string) => void)[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped when a session ends, so a start still preparing knows it was cancelled. */
  private generation = 0;

  constructor(private cb: SessionCallbacks, private env: SessionEnv) {}

  get snapshot(): DictationState {
    return this.state;
  }

  /** True while the permission prompt or locale check is pending (the app may go inactive then). */
  get preparing(): boolean {
    return this.phase === 'preparing';
  }

  async start(base: string, locale: string): Promise<void> {
    if (this.phase !== 'idle') return;
    const engine = this.env.engine();
    this.lastCommit = base;
    this.apply({ type: 'start', base });
    if (!engine || !isEngineAvailable(engine)) return this.finish({ type: 'error', error: 'unsupported' });
    if (current && current !== this) current.abort();
    current = this;
    this.engine = engine;
    this.listened = false;
    this.phase = 'preparing';
    const gen = ++this.generation;

    // The web module has no permission API (the browser asks on start) and warns if called.
    if (this.env.platform !== 'web') {
      let granted = false;
      try {
        granted = (await engine.requestPermissionsAsync()).granted;
      } catch {}
      if (gen !== this.generation) return;
      if (!granted) return this.finish({ type: 'error', error: 'denied' });
    }

    const support = await this.localeSupport(engine);
    if (gen !== this.generation) return;
    this.plans = startPlans(locale, support);
    this.plan = 0;
    this.phase = 'running';
    this.subscribe(engine);
    this.launch();
  }

  /** Stop listening and keep what was heard (a final result may still arrive). */
  stop(): void {
    if (this.phase === 'idle') return;
    if (this.phase === 'preparing') return this.finish({ type: 'end' }); // nothing started; just cancel
    this.apply({ type: 'stop' });
    try {
      this.engine?.stop();
    } catch {}
    this.stopTimer ??= setTimeout(() => this.finish({ type: 'end' }), STOP_TIMEOUT_MS);
  }

  /** Stop now and ignore anything still being recognised. */
  abort(): void {
    if (this.phase === 'idle') return;
    if (this.phase === 'running') {
      try {
        this.engine?.abort();
      } catch {}
    }
    this.finish({ type: 'end' });
  }

  /**
   * Stop, wait for the final words (at most STOP_TIMEOUT_MS), and resolve with the field's text.
   * Resolves null when nothing was running. For send: nothing arrives after it resolves.
   */
  complete(): Promise<string | null> {
    if (this.phase === 'idle') return Promise.resolve(null);
    return new Promise(resolve => {
      this.waiters.push(resolve);
      this.stop();
    });
  }

  /** The user typed while listening: later words go after their text instead of replacing it. */
  edit(text: string): void {
    if (this.phase === 'idle') return;
    this.lastCommit = text; // the field already holds (and saved) it
    this.apply({ type: 'edit', text });
  }

  /**
   * The screen is going away: abort, and go quiet except for one last onCommit, so words still
   * showing as interim (e.g. the visitor switched tabs mid-sentence) are saved, not lost.
   */
  dispose(): void {
    const { onCommit } = this.cb;
    this.cb = onCommit ? { ...SILENT, onCommit } : SILENT;
    this.abort();
    this.cb = SILENT;
  }

  private async localeSupport(engine: SpeechEngine): Promise<LocaleSupport> {
    if (this.env.platform === 'web') return NO_SUPPORT; // not implemented there; warns if called
    try {
      const r = await engine.getSupportedLocales({});
      // Android lists only the on-device service's languages, which says nothing about the default
      // (network) recogniser, so only iOS's list can rule a language out up front.
      return { locales: this.env.platform === 'ios' ? r.locales : [], installed: r.installedLocales };
    } catch {
      return NO_SUPPORT; // Android 12 and older
    }
  }

  private launch(): void {
    const p = this.plans[this.plan];
    if (!p || !this.engine) return this.finish({ type: 'error', error: 'failed' });
    try {
      this.engine.start({
        lang: p.lang,
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: p.onDevice,
        // Android only punctuates on-device; iOS always can.
        addsPunctuation: this.env.platform === 'ios' || p.onDevice,
        iosTaskHint: 'dictation',
      });
    } catch {
      this.finish({ type: 'error', error: 'failed' });
    }
  }

  private subscribe(engine: SpeechEngine): void {
    this.subs = [
      engine.addListener('start', () => {
        this.listened = true;
        const fellBack = !!this.plans[this.plan]?.fellBack;
        this.apply({ type: 'started', fellBack });
        this.cb.onListening?.(fellBack);
      }),
      engine.addListener('result', e => {
        this.apply({ type: 'result', transcript: e.results[0]?.transcript ?? '', isFinal: e.isFinal });
      }),
      engine.addListener('error', e => {
        if (e.error === 'language-not-supported' && this.plan < this.plans.length - 1) {
          this.retrying = true; // try the next plan once this attempt ends
          return;
        }
        const error = errorFromCode(e.error);
        if (error) this.finish({ type: 'error', error }); // the "end" that follows has nothing left to do
      }),
      engine.addListener('end', () => {
        if (this.retrying && this.state.status !== 'stopping') {
          this.retrying = false;
          this.plan += 1;
          return this.launch();
        }
        this.finish({ type: 'end' });
      }),
    ];
  }

  private apply(action: DictationAction): void {
    const prev = this.state;
    const next = dictationReducer(prev, action);
    if (next === prev) return;
    this.state = next;
    const text = composedText(next);
    // Save only settled text: a final result, or the session ending (interim words kept).
    const settled = (action.type === 'result' && action.isFinal) || (isActive(prev) && !isActive(next));
    if (settled && text !== this.lastCommit) {
      this.lastCommit = text;
      this.cb.onCommit?.(text);
    }
    this.cb.onState(next);
    if (action.type !== 'edit' && dictatedText(next) !== dictatedText(prev)) this.cb.onText?.(text);
    if (action.type === 'error') this.cb.onError?.(action.error);
  }

  private finish(action: DictationAction): void {
    const wasActive = isActive(this.state);
    this.apply(action);
    for (const s of this.subs) s.remove();
    this.subs = [];
    this.retrying = false;
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    this.generation += 1;
    this.phase = 'idle';
    if (current === this) current = null;
    const text = composedText(this.state);
    for (const resolve of this.waiters.splice(0)) resolve(text);
    if (wasActive) this.cb.onEnd?.(this.listened);
  }
}
