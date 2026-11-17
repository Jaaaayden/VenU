/**
 * A horizontal ScrollView that also scrolls by mouse on web: drag it, turn the wheel, or shift-wheel.
 * A drag past DRAG_THRESHOLD doesn't count as a tap on the chip it started on. Phones keep the
 * plain ScrollView, so touch scrolling is unchanged.
 * e.g. <DragScrollView contentContainerStyle={styles.row}>{chips}</DragScrollView>
 */
import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

import { createDragTracker, wheelScrollLeft } from './drag-scroll';

export function DragScrollView(props: Omit<ScrollViewProps, 'horizontal'>) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  useWebDragScroll(ref);
  return <ScrollView ref={ref} horizontal {...props} />;
}

function useWebDragScroll(ref: RefObject<ComponentRef<typeof ScrollView> | null>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (ref.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node) return;
    const tracker = createDragTracker();
    let swallowTimer: ReturnType<typeof setTimeout> | undefined;

    const swallowClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      const left = tracker.move(e.clientX, e.clientY);
      if (left === null) return;
      node.style.cursor = 'grabbing';
      node.style.userSelect = 'none';
      node.scrollLeft = left;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      node.style.cursor = '';
      node.style.userSelect = '';
      if (!tracker.end()) return;
      // The click that follows this mouseup would press the chip under the pointer: drop it.
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      clearTimeout(swallowTimer);
      swallowTimer = setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 100);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || node.scrollWidth <= node.clientWidth) return;
      tracker.start(e.clientX, e.clientY, node.scrollLeft);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
    const onWheel = (e: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return;
      const rtl = getComputedStyle(node).direction === 'rtl';
      const delta = wheelScrollLeft(e.deltaX, e.deltaY, e.deltaMode, node.clientWidth, rtl);
      if (!delta) return;
      e.preventDefault(); // the row scrolls instead of the page
      node.scrollLeft += delta;
    };

    node.addEventListener('pointerdown', onDown);
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('wheel', onWheel);
      onUp();
      clearTimeout(swallowTimer);
      window.removeEventListener('click', swallowClick, { capture: true });
    };
  }, [ref]);
}
