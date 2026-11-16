import { describe, expect, it } from '@jest/globals';

import { pinLabelPosition } from '../stadium-map';

describe('pinLabelPosition', () => {
  it('centres the name under a pin in the middle of the map', () => {
    expect(pinLabelPosition(195, 100, 150, 390)).toEqual({ left: 125, top: 123, alignItems: 'center' });
  });

  it('keeps a pin on the east edge from pushing its name off the map', () => {
    const { left, alignItems } = pinLabelPosition(380, 100, 200, 390);
    expect(left + 140).toBeLessThanOrEqual(390);
    expect(alignItems).toBe('flex-end');
  });

  it('keeps a pin on the west edge from pushing its name off the map', () => {
    expect(pinLabelPosition(20, 100, 200, 390)).toMatchObject({ left: 4, alignItems: 'flex-start' });
  });

  it('labels southern pins above them, where the sheet does not cover', () => {
    const north = pinLabelPosition(195, 100, 150, 390);
    const south = pinLabelPosition(195, 100, 360, 390);
    expect(north.top).toBeGreaterThan(100);
    expect(south.top + 21).toBeLessThan(100);
  });
});
