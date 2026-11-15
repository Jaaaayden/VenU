// One dictation session against the recogniser, without React: asks for the microphone, picks a
// locale plan, listens, and reports state and text through callbacks. useDictation wraps it; tests
// drive it with a fake engine.
// e.g. const s = new DictationSession({ onState, onText }, { platform: 'ios', engine: speechEngine });
//      await s.start('Near gate 2', 'es-US'); … s.stop();

import { dictatedText, composedText, dictationReducer, errorFromCode, IDLE, isActive, type DictationAction, type DictationError, type DictationState } from './dictation-state';
import { isEngineAvailable, type SpeechEngine } from './engine';
import { startPlans, type LocaleSupport, type StartPlan } from './languages';

export interface SessionCallbacks {
  onState: (state: DictationState) => void;
  /** The field's new text: what was typed plus what was heard. Called only when the words change. */
  onText: (text: string) => void;
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
const STOP_TIMEOUT_MS = 3000;
type Subscription = ReturnType<SpeechEngine['addListener']>;
const NO_SUPPORT: LocaleSupport = { locales: [], installed: [] };

/** The recogniser is shared by the whole app; starting one session cancels another. */
let current: DictationSession | null = null;

export class DictationSession {
  private state: DictationState = IDLE;
  private engine: SpeechEngine | null = null;
  private subs: Subscription[] = [];
  private plans: StartPlan[] = [];
  private plan = 0;
  private retrying = false;
  private listened = false;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped when a session ends, so a start still awaiting permission knows it was cancelled. */
  private generation = 0;

  constructor(private cb: SessionCallbacks, private env: SessionEnv) {}

  get snapshot(): DictationState {
    return this.state;
  }

  async start(base: string, locale: string): Promise<void> {
    if (isActive(this.state)) return;
    const engine = this.env.engine();
    this.apply({ type: 'start', base });
    if (!engine || !isEngineAvailable(engine)) return this.finish({ type: 'error', error: 'unsupported' });
    if (current && current !== this) current.abort();
    current = this;
    this.engine = engine;
    this.listened = false;
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
    this.subscribe(engine);
    this.launch();
  }

  /** Stop listening and keep what was heard (a final result may still arrive). */
  stop(): void {
    if (!isActive(this.state)) return;
    if (!this.subs.length) return this.abort(); // still waiting on the permission prompt
    this.apply({ type: 'stop' });
    try {
      this.engine?.stop();
    } catch {}
    this.stopTimer ??= setTimeout(() => this.finish({ type: 'end' }), STOP_TIMEOUT_MS);
  }

  /** Stop now and ignore anything still being recognised (on send, or when the screen closes). */
  abort(): void {
    if (!isActive(this.state)) return;
    try {
      if (this.subs.length) this.engine?.abort();
    } catch {}
    this.finish({ type: 'end' });
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
    this.cb.onState(next);
    if (dictatedText(next) !== dictatedText(prev)) this.cb.onText(composedText(next));
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
    if (current === this) current = null;
    if (wasActive) this.cb.onEnd?.(this.listened);
  }
}
