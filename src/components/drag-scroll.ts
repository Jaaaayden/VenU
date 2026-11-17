/**
 * Mouse drag and wheel scrolling for a sideways row on web, where react-native-web's horizontal
 * ScrollView only scrolls by touch, trackpad or scrollbar. Pure, so it's tested without a browser;
 * <DragScrollView> wires it to the DOM.
 */

/** A press that moves further than this (CSS px) is a drag, so it doesn't count as a tap. */
export const DRAG_THRESHOLD = 6;

export interface DragTracker {
  /** Mouse down at (x, y) with the row scrolled to `scrollLeft`. */
  start(x: number, y: number, scrollLeft: number): void;
  /** Mouse moved: the row's new scrollLeft once it's a drag, else null (still a possible tap). */
  move(x: number, y: number): number | null;
  /** Mouse up: true when the press was a drag, so the click that follows must be swallowed. */
  end(): boolean;
  readonly dragging: boolean;
}

/**
 * e.g. start(100, 10, 0); move(97, 10) → null (3px: still a tap); move(40, 12) → 60 (dragged left
 * 60px, so the row scrolls 60px on); end() → true.
 */
export function createDragTracker(threshold = DRAG_THRESHOLD): DragTracker {
  let origin: { x: number; y: number; left: number } | null = null;
  let dragging = false;
  return {
    start(x, y, scrollLeft) {
      origin = { x, y, left: scrollLeft };
      dragging = false;
    },
    move(x, y) {
      if (!origin) return null;
      const dx = x - origin.x;
      if (!dragging && Math.hypot(dx, y - origin.y) <= threshold) return null;
      dragging = true;
      // The content follows the pointer, in either direction. RTL rows on web count scrollLeft
      // down from 0, and the same subtraction still moves the content with the pointer.
      return origin.left - dx;
    },
    end() {
      const was = dragging;
      origin = null;
      dragging = false;
      return was;
    },
    get dragging() {
      return dragging;
    },
  };
}

/** Px per line, for a wheel that reports lines (WheelEvent.deltaMode 1). */
const LINE_PX = 16;

/**
 * How much a wheel turn changes a sideways row's scrollLeft: a plain (vertical) wheel moves toward
 * the row's end (leftward in right-to-left rows), and shift-wheel or a trackpad swipe (horizontal)
 * moves the way it points. Line and page modes are turned into px.
 * e.g. wheelScrollLeft(0, 120, 0, 300, false) → 120; (0, 120, 0, 300, true) → -120;
 *      (-40, 5, 0, 300, false) → -40; (0, 3, 1, 300, false) → 48
 */
export function wheelScrollLeft(deltaX: number, deltaY: number, deltaMode: number, pageWidth: number, rtl: boolean): number {
  const unit = deltaMode === 1 ? LINE_PX : deltaMode === 2 ? pageWidth : 1;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX * unit;
  return deltaY * unit * (rtl ? -1 : 1);
}
