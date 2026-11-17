import { describe, expect, it } from '@jest/globals';

import { createDragTracker, DRAG_THRESHOLD, wheelScrollLeft } from '../drag-scroll';

describe('createDragTracker', () => {
  it('treats a press that barely moves as a tap: no scrolling, and its click goes through', () => {
    const t = createDragTracker();
    t.start(100, 20, 0);
    expect(t.move(100 - DRAG_THRESHOLD, 20)).toBeNull();
    expect(t.move(103, 24)).toBeNull();
    expect(t.dragging).toBe(false);
    expect(t.end()).toBe(false);
  });

  it('scrolls with the pointer once past the threshold, and swallows the click after', () => {
    const t = createDragTracker();
    t.start(300, 20, 50);
    expect(t.move(292, 20)).toBe(58); // 8px left: a drag, the row scrolls 8px on
    expect(t.dragging).toBe(true);
    expect(t.move(100, 25)).toBe(250);
    expect(t.move(310, 20)).toBe(40); // back past the start: scrolls back
    expect(t.end()).toBe(true);
    expect(t.dragging).toBe(false);
  });

  it('counts a diagonal move past the threshold as a drag too', () => {
    const t = createDragTracker(6);
    t.start(0, 0, 0);
    expect(t.move(5, 5)).toBe(-5); // hypot ≈ 7 > 6
    expect(t.end()).toBe(true);
  });

  it('keeps the threshold once dragging, so wobbling back near the start still scrolls', () => {
    const t = createDragTracker();
    t.start(100, 0, 10);
    t.move(80, 0);
    expect(t.move(99, 0)).toBe(11);
  });

  it('ignores moves without a press, and starts each press fresh', () => {
    const t = createDragTracker();
    expect(t.move(50, 0)).toBeNull();
    t.start(0, 0, 0);
    t.move(40, 0);
    t.end();
    t.start(0, 0, 0);
    expect(t.move(2, 0)).toBeNull();
    expect(t.end()).toBe(false);
  });
});

describe('wheelScrollLeft', () => {
  it('turns a plain wheel into scrolling toward the row end, mirrored in RTL', () => {
    expect(wheelScrollLeft(0, 120, 0, 300, false)).toBe(120);
    expect(wheelScrollLeft(0, 120, 0, 300, true)).toBe(-120);
  });

  it('follows shift-wheel and trackpad swipes the way they point', () => {
    expect(wheelScrollLeft(-40, 5, 0, 300, false)).toBe(-40);
    expect(wheelScrollLeft(-40, 5, 0, 300, true)).toBe(-40);
  });

  it('converts line and page modes to px', () => {
    expect(wheelScrollLeft(0, 3, 1, 300, false)).toBe(48);
    expect(wheelScrollLeft(0, 1, 2, 300, false)).toBe(300);
  });
});
