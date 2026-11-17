import { describe, expect, it } from '@jest/globals';

import { snapPositions, UP_GAP } from '../sheet';

describe('snapPositions', () => {
  it('starts low enough to leave most of the map visible on a phone', () => {
    // 390×844 phone: ~650 px of map area below the header, ~92 px of tab bar over the sheet.
    const p = snapPositions(650, 92);
    expect(p).toEqual({ up: UP_GAP, mid: 325, down: 426 });
    expect(p.down / 650).toBeGreaterThan(0.6);
  });

  it('keeps the stops in order, and never above the raised gap on a short screen', () => {
    for (const h of [200, 400, 650, 900]) {
      const p = snapPositions(h, 92);
      expect(p.up).toBeLessThanOrEqual(p.mid);
      expect(p.mid).toBeLessThanOrEqual(p.down);
      expect(p.down).toBeGreaterThanOrEqual(UP_GAP);
    }
  });
});
