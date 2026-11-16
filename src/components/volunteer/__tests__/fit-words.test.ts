import { describe, expect, it, jest } from '@jest/globals';

import { helpGridColumns } from '../help-card';
import { statusLabelFit } from '../status-card';

jest.mock('@/i18n', () => ({ useT: () => (k: string) => k }));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('help cards keep words whole', () => {
  it('stays 3 a row while the widest word fits a card', () => {
    // 390pt phone: the grid is ~326pt wide, ~79pt of text per card.
    expect(helpGridColumns(326, 12, 70)).toBe(3);
  });

  it('drops to 2 a row when a word would split ("Directions" on a 320pt phone, Armenian at 390)', () => {
    expect(helpGridColumns(256, 12, 63)).toBe(2);
    expect(helpGridColumns(326, 12, 92)).toBe(2);
  });

  it('keeps 3 until the grid and words are measured', () => {
    expect(helpGridColumns(0, 12, 200)).toBe(3);
    expect(helpGridColumns(326, 12, null)).toBe(3);
  });
});

describe('status tiles keep words whole', () => {
  it('keeps 15pt and roomy padding when the word fits', () => {
    expect(statusLabelFit(311, 60)).toEqual({ size: 15, padding: 12 });
    expect(statusLabelFit(0, 400)).toEqual({ size: 15, padding: 12 });
  });

  it('tightens the padding, then shrinks the text, never below 11pt', () => {
    // "Զբաղված" is ~72pt at 15pt; a 320pt phone's row is 248pt wide.
    expect(statusLabelFit(248, 72)).toEqual({ size: 11, padding: 8 });
    expect(statusLabelFit(248, 400)).toEqual({ size: 11, padding: 8 });
    expect(statusLabelFit(311, 75)).toEqual({ size: 15, padding: 8 });
  });
});
