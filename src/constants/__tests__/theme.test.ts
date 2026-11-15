import { describe, expect, it, jest } from '@jest/globals';

// outlineStyle: 'none' is a web-only value; React Native accepts only solid | dotted | dashed.
describe('webNoOutline', () => {
  function load(os: 'ios' | 'android' | 'web'): object {
    let style: object = {};
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: os } }));
      style = (jest.requireActual('../theme') as typeof import('../theme')).webNoOutline;
    });
    return style;
  }

  it('hides the focus ring on web only', () => {
    expect(load('web')).toEqual({ outlineStyle: 'none' });
    expect(load('ios')).toEqual({});
    expect(load('android')).toEqual({});
  });
});
