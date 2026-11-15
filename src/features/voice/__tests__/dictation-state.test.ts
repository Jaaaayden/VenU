import { describe, expect, it } from '@jest/globals';

import { appendDictation, composedText, dictatedText, dictationReducer, errorFromCode, IDLE, type DictationAction, type DictationState } from '../dictation-state';

const run = (actions: DictationAction[], from: DictationState = IDLE) => actions.reduce(dictationReducer, from);

describe('dictation state', () => {
  it('goes start → interim → final → stop → end, appending to the typed text', () => {
    let s = run([{ type: 'start', base: 'Near ramp 2.' }]);
    expect(s.status).toBe('starting');
    s = run([{ type: 'started', fellBack: false }], s);
    expect(s.status).toBe('listening');
    s = run([{ type: 'result', transcript: 'I use a', isFinal: false }], s);
    expect(s.interim).toBe('I use a');
    expect(composedText(s)).toBe('Near ramp 2. I use a');
    s = run([{ type: 'result', transcript: 'I use a wheelchair', isFinal: true }], s);
    expect(s).toMatchObject({ committed: 'I use a wheelchair', interim: '' });
    s = run([{ type: 'stop' }], s);
    expect(s.status).toBe('stopping');
    s = run([{ type: 'end' }], s);
    expect(s.status).toBe('idle');
    expect(composedText(s)).toBe('Near ramp 2. I use a wheelchair');
  });

  it('joins segmented finals (Android continuous mode) and keeps a final that lands after stop()', () => {
    const s = run([
      { type: 'start', base: '' },
      { type: 'started', fellBack: false },
      { type: 'result', transcript: 'I need help', isFinal: true },
      { type: 'stop' },
      { type: 'result', transcript: 'finding the elevator', isFinal: true },
      { type: 'end' },
    ]);
    expect(dictatedText(s)).toBe('I need help finding the elevator');
  });

  it('keeps words still interim when the recogniser ends', () => {
    const s = run([{ type: 'start', base: 'Hi' }, { type: 'started', fellBack: false }, { type: 'result', transcript: 'on my way', isFinal: false }, { type: 'end' }]);
    expect(s).toMatchObject({ status: 'idle', committed: 'on my way', interim: '' });
    expect(composedText(s)).toBe('Hi on my way');
  });

  it('ignores results once idle, and a stop when idle', () => {
    expect(run([{ type: 'result', transcript: 'late', isFinal: true }])).toBe(IDLE);
    expect(run([{ type: 'stop' }])).toBe(IDLE);
  });

  it('records errors and clears them on the next start', () => {
    const failed = run([{ type: 'start', base: 'x' }, { type: 'error', error: 'denied' }]);
    expect(failed).toMatchObject({ status: 'idle', error: 'denied' });
    expect(run([{ type: 'start', base: 'x' }], failed).error).toBeNull();
    expect(run([{ type: 'start', base: '' }, { type: 'error', error: 'unsupported' }])).toMatchObject({ status: 'idle', error: 'unsupported' });
  });

  it('leaves an idle state alone on a late end or error', () => {
    const done = run([{ type: 'start', base: 'x' }, { type: 'error', error: 'no-speech' }]);
    expect(run([{ type: 'end' }], done)).toBe(done);
    expect(run([{ type: 'error', error: 'failed' }], done)).toBe(done);
    expect(run([{ type: 'end' }])).toBe(IDLE);
  });

  it('keeps text typed before the dictated words', () => {
    let s = run([{ type: 'start', base: 'Near ramp 2.' }, { type: 'started', fellBack: false }, { type: 'result', transcript: 'I use a', isFinal: false }]);
    s = run([{ type: 'edit', text: 'Near ramp 2, gate B. I use a' }], s);
    expect(s.base).toBe('Near ramp 2, gate B. ');
    s = run([{ type: 'result', transcript: 'I use a wheelchair', isFinal: true }, { type: 'end' }], s);
    expect(composedText(s)).toBe('Near ramp 2, gate B. I use a wheelchair');
  });

  it('keeps text typed after the dictated words without repeating them (iOS repeats the sentence)', () => {
    let s = run([{ type: 'start', base: '' }, { type: 'started', fellBack: false }, { type: 'result', transcript: 'I need', isFinal: false }]);
    s = run([{ type: 'edit', text: 'I need, urgently,' }], s);
    expect(composedText(s)).toBe('I need, urgently,');
    s = run([{ type: 'result', transcript: 'I need a ramp', isFinal: false }], s);
    expect(composedText(s)).toBe('I need, urgently, a ramp');
    s = run([{ type: 'result', transcript: 'I need a ramp', isFinal: true }, { type: 'end' }], s);
    expect(composedText(s)).toBe('I need, urgently, a ramp');
  });

  it('ignores an edit that matches the field, and edits when idle', () => {
    const s = run([{ type: 'start', base: 'Hi' }, { type: 'started', fellBack: false }, { type: 'result', transcript: 'there', isFinal: false }]);
    expect(run([{ type: 'edit', text: 'Hi there' }], s)).toBe(s);
    expect(run([{ type: 'edit', text: 'typed' }])).toBe(IDLE);
  });

  it('notes a retry in English as a fallback', () => {
    const s = run([{ type: 'start', base: '' }, { type: 'started', fellBack: false }, { type: 'started', fellBack: true }]);
    expect(s).toMatchObject({ status: 'listening', fellBack: true });
  });
});

describe('appending dictation', () => {
  it('puts one space between typed and dictated text', () => {
    expect(appendDictation('Stuck near ramp 2.', 'I use a wheelchair')).toBe('Stuck near ramp 2. I use a wheelchair');
    expect(appendDictation('Line one\n', ' line two ')).toBe('Line one\nline two');
    expect(appendDictation('', '  hello ')).toBe('hello');
    expect(appendDictation('  ', 'hello')).toBe('hello');
    expect(appendDictation('Typed', '   ')).toBe('Typed');
  });

  it("doesn't add spaces inside Thai or Khmer", () => {
    expect(appendDictation('ใกล้ประตู', 'สอง')).toBe('ใกล้ประตูสอง');
    expect(appendDictation('នៅជិត', 'ច្រកទ្វារ')).toBe('នៅជិតច្រកទ្វារ');
    expect(appendDictation('Gate 2', 'ใกล้')).toBe('Gate 2 ใกล้');
  });

  it("doesn't add spaces inside Chinese or Japanese", () => {
    expect(appendDictation('2号门', '附近')).toBe('2号门附近');
    expect(appendDictation('ゲート2', 'の近く')).toBe('ゲート2 の近く'); // digit before: spaced
    expect(appendDictation('入口です。', 'お願いします')).toBe('入口です。お願いします');
  });
});

describe('error codes', () => {
  it('maps recogniser codes to what the UI says', () => {
    expect(errorFromCode('aborted')).toBeNull();
    expect(errorFromCode('not-allowed')).toBe('denied');
    expect(errorFromCode('service-not-allowed')).toBe('unsupported');
    expect(errorFromCode('no-speech')).toBe('no-speech');
    expect(errorFromCode('speech-timeout')).toBe('no-speech');
    expect(errorFromCode('network')).toBe('failed');
  });
});
