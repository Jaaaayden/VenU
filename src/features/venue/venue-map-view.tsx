/**
 * The venue map: the venue's published map image (or the schematic drawing) in a pan/zoom view the
 * app controls, with a pin per facility, the visitor's spot and a dashed route line on top.
 * Phones: drag, pinch, double-tap. Web: drag, mouse wheel, double-click, and the +/− buttons.
 * Pins keep their size at any zoom. The map is geographic, so it never mirrors in RTL.
 */
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

import { FacilityIcon } from './categories';
import type { Route } from './directions';
import { facilityName } from './labels';
import {
  centreOn,
  clampView,
  contentSize,
  fitRect,
  isVisible,
  toMap,
  zoomAt,
  type Box,
  type MapRect,
  type MapView,
} from './map-geometry';
import { VenueDrawing } from './stadium-map';
import type { Facility } from './types';
import { mapAspect, type VenueMap } from './venue-maps';

const PIN = 30;
const PIN_BIG = 40;
const HIT = 44;
const ZOOM_STEP = 1.6;
const DOUBLE_TAP_ZOOM = 2;
const TIMING = { duration: 320 };
/** The source bar over the map's top edge: fits keep pins below it. */
const TOP_BAR = 52;
/** Room the bottom overlays (pin card, zoom buttons) keep clear above the sheet. */
export const MAP_CARD_SPACE = 104;

// Not in a StyleSheet: react-native-web rejects the `direction` style.
const NATIVE_LTR = Platform.OS === 'web' ? null : ({ direction: 'ltr' } as const);

export interface VenueMapViewProps {
  map: VenueMap;
  venueName: string;
  /** Pins to draw (already filtered by the chip). */
  pins: Facility[];
  /** The map area. */
  width: number;
  height: number;
  /** How much of the area, from the top, the sheet leaves visible. */
  viewportHeight: number;
  /** Pins drawn large and dark: the open facility, the card's, the route's end. */
  highlightIds: (string | null | undefined)[];
  /** Pins drawn in the chip colour. */
  tinted: boolean;
  route: Route | null;
  /** A new key fits `fitRect` into view (zoomed in no further than `fitMax`). */
  fitKey: string;
  fitRect: MapRect;
  fitMax: number;
  /** A pin to bring on screen if it's hidden (e.g. a facility opened from the list). */
  revealId?: string | null;
  /** Keep this much at the bottom of the viewport clear when revealing (the pin card). */
  revealInset?: number;
  onPinPress: (f: Facility) => void;
  /** Laid over the map's bottom edge, above the sheet (the pin card). */
  children?: ReactNode;
}

export function VenueMapView(props: VenueMapViewProps) {
  const { map, venueName, pins, width, height, viewportHeight, highlightIds, tinted, route, fitKey, fitRect: rect, fitMax, revealId, revealInset = 0, onPinPress, children } = props;
  const t = useT('venue');
  const content = contentSize(mapAspect(map), width);
  const viewport: Box = { w: width, h: Math.max(viewportHeight, 1) };

  const s = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const dims = useSharedValue({ content, viewport });
  // A React copy of the scale, for line widths: updated when a gesture or animation ends.
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(map.image ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);

  const current = (): MapView => ({ s: s.get(), x: x.get(), y: y.get() });
  const go = (v: MapView, animate = true) => {
    s.set(animate ? withTiming(v.s, TIMING) : v.s);
    x.set(animate ? withTiming(v.x, TIMING) : v.x);
    y.set(animate ? withTiming(v.y, TIMING) : v.y);
    setZoom(v.s);
  };

  // Fit on a new key; follow the sheet otherwise (keep what was in the middle of the visible part
  // in the middle); bring a revealed pin on screen if it's hidden.
  const last = useRef<{ key: string; vh: number; w: number; reveal: string | null | undefined } | null>(null);
  useEffect(() => {
    dims.set({ content, viewport });
    const prev = last.current;
    last.current = { key: fitKey, vh: viewport.h, w: width, reveal: revealId };
    if (!prev || prev.key !== fitKey || prev.w !== width) {
      go(fitRect(rect, content, viewport, 24, fitMax, TOP_BAR), !!prev);
      return;
    }
    if (prev.vh !== viewport.h) {
      const mid = toMap({ x: width / 2, y: prev.vh / 2 }, content, current());
      go(centreOn(mid, { x: width / 2, y: viewport.h / 2 }, current(), content, viewport));
      return;
    }
    if (revealId && prev.reveal !== revealId) {
      const pin = pins.find(f => f.id === revealId);
      const room: Box = { w: viewport.w, h: Math.max(viewport.h - revealInset, 1) };
      if (pin && !isVisible(pin, content, current(), room, 32)) go(centreOn(pin, { x: width / 2, y: room.h / 2 }, current(), content, viewport));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on these inputs only; the rest is read fresh
  }, [fitKey, viewport.h, width, revealId]);

  const zoomBy = (factor: number) => go(zoomAt(current(), factor, { x: width / 2, y: viewport.h / 2 }, content, viewport));

  const pan = usePanGesture({
    minDistance: 6,
    onUpdate: e => {
      'worklet';
      const d = dims.get();
      const v = clampView({ s: s.get(), x: x.get() + e.changeX, y: y.get() + e.changeY }, d.content, d.viewport);
      x.set(v.x);
      y.set(v.y);
    },
  });

  const pinch = usePinchGesture({
    onUpdate: e => {
      'worklet';
      const d = dims.get();
      const v = zoomAt({ s: s.get(), x: x.get(), y: y.get() }, e.scaleChange, { x: e.focalX, y: e.focalY }, d.content, d.viewport);
      s.set(v.s);
      x.set(v.x);
      y.set(v.y);
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(setZoom, s.get());
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: e => {
      'worklet';
      const d = dims.get();
      const v = zoomAt({ s: s.get(), x: x.get(), y: y.get() }, DOUBLE_TAP_ZOOM, { x: e.x, y: e.y }, d.content, d.viewport);
      s.set(withTiming(v.s, TIMING));
      x.set(withTiming(v.x, TIMING));
      y.set(withTiming(v.y, TIMING));
      scheduleOnRN(setZoom, v.s);
    },
  });

  const gestures = useSimultaneousGestures(pan, pinch, doubleTap);

  // Web: the mouse wheel (and a trackpad pinch, which arrives as ctrl+wheel) zooms at the pointer.
  const frame = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = frame.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = node.getBoundingClientRect();
      const d = dims.get();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const v = zoomAt({ s: s.get(), x: x.get(), y: y.get() }, factor, { x: e.clientX - box.left, y: e.clientY - box.top }, d.content, d.viewport);
      s.set(v.s);
      x.set(v.x);
      y.set(v.y);
      clearTimeout(settle);
      settle = setTimeout(() => setZoom(v.s), 120);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      clearTimeout(settle);
    };
  }, [dims, s, x, y]);

  const contentStyle = useAnimatedStyle(() => {
    const { w, h } = dims.get().content;
    const k = s.get();
    return { transform: [{ translateX: x.get() + ((k - 1) * w) / 2 }, { translateY: y.get() + ((k - 1) * h) / 2 }, { scale: k }] };
  });
  // Undoes the map's zoom on each pin, so pins stay one size.
  const counterScale = useAnimatedStyle(() => ({ transform: [{ scale: 1 / s.get() }] }));

  const highlighted = new Set(highlightIds.filter(Boolean));
  const fromId = route && !route.here ? route.from.id : null;
  const scaleLine = (n: number) => n / Math.max(zoom, 0.1);
  // The dashed line from the visitor's spot to the facility, in content px.
  const line = route && !route.here
    ? { x1: route.from.x * content.w, y1: route.from.y * content.h, x2: route.to.x * content.w, y2: route.to.y * content.h }
    : null;

  return (
    <View style={[styles.root, NATIVE_LTR, { width, height }]}>
      <GestureDetector gesture={gestures}>
        <View ref={frame} style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={t('map.label', { venue: venueName })}>
          <Animated.View style={[styles.content, { width: content.w, height: content.h }, contentStyle]}>
            {map.image ? (
              <Image
                key={attempt}
                source={{ uri: map.image.url, width: map.image.width, height: map.image.height }}
                style={{ width: content.w, height: content.h }}
                contentFit="fill"
                transition={150}
                onLoad={() => setStatus('ready')}
                onError={() => setStatus('error')}
                accessible={false}
              />
            ) : (
              <VenueDrawing shape={map.shape} width={content.w} height={content.h} />
            )}
            {line ? (
              <Svg width={content.w} height={content.h} style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
                <Line {...line} stroke={Colors.surface} strokeWidth={scaleLine(9)} strokeLinecap="round" />
                <Line {...line} stroke={Colors.primary} strokeWidth={scaleLine(5)} strokeDasharray={`${scaleLine(10)} ${scaleLine(7)}`} />
              </Svg>
            ) : null}
            {pins.map(f => (
              <Pin
                key={f.id}
                facility={f}
                left={f.x * content.w}
                top={f.y * content.h}
                counterScale={counterScale}
                big={highlighted.has(f.id)}
                tinted={tinted}
                hidden={f.id === fromId}
                onPress={onPinPress}
              />
            ))}
            {route && fromId ? <YouMarker left={route.from.x * content.w} top={route.from.y * content.h} counterScale={counterScale} label={t('map.you')} /> : null}
          </Animated.View>
        </View>
      </GestureDetector>

      {status !== 'ready' ? (
        <View style={[styles.cover, { height: viewport.h }]} pointerEvents={status === 'error' ? 'auto' : 'none'} accessibilityLiveRegion="polite">
          {status === 'loading' ? <ActivityIndicator size="large" color={Colors.primary} /> : (
            <>
              <Text style={styles.coverText} accessibilityRole="alert">{t('officialMap.error')}</Text>
              <Button label={t('officialMap.retry')} onPress={() => { setStatus('loading'); setAttempt(a => a + 1); }} />
            </>
          )}
        </View>
      ) : null}

      <SourceBar map={map} />

      <View style={[styles.zoomButtons, { top: Math.max(viewport.h - MAP_CARD_SPACE - 2 * HIT - Spacing.sm, 52) }]} pointerEvents="box-none">
        <ZoomButton glyph="+" label={t('officialMap.zoomIn')} onPress={() => zoomBy(ZOOM_STEP)} />
        <ZoomButton glyph="−" label={t('officialMap.zoomOut')} onPress={() => zoomBy(1 / ZOOM_STEP)} />
      </View>


      <View style={[styles.bottom, { top: Math.max(viewport.h - MAP_CARD_SPACE, 0), height: MAP_CARD_SPACE }]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

function Pin({ facility, left, top, counterScale, big, tinted, hidden, onPress }: {
  facility: Facility;
  left: number;
  top: number;
  counterScale: ReturnType<typeof useAnimatedStyle>;
  big: boolean;
  tinted: boolean;
  hidden: boolean;
  onPress: (f: Facility) => void;
}) {
  const t = useT('venue');
  if (hidden) return null;
  const size = big ? PIN_BIG : PIN;
  const fill = big ? Colors.inkDeep : tinted ? Colors.primary : Colors.surface;
  return (
    <Animated.View style={[styles.pinBox, { left: left - HIT / 2, top: top - HIT / 2 }, big && styles.onTop, counterScale]}>
      <Pressable
        onPress={() => onPress(facility)}
        style={styles.hit}
        accessibilityRole="button"
        accessibilityLabel={t('map.pin', { name: facilityName(facility, t) })}
        accessibilityState={{ selected: big }}>
        <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }, (big || tinted) && styles.pinFilled, big && styles.pinBig]}>
          <FacilityIcon category={facility.category} size={big ? 22 : 17} color={big || tinted ? Colors.onPrimary : Colors.ink} background={fill} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function YouMarker({ left, top, counterScale, label }: { left: number; top: number; counterScale: ReturnType<typeof useAnimatedStyle>; label: string }) {
  return (
    <Animated.View style={[styles.pinBox, styles.onTop, { left: left - HIT / 2, top: top - HIT / 2 }, counterScale]} pointerEvents="none">
      <View style={styles.youHalo} />
      <View style={styles.youDot} />
      <Text style={styles.youLabel} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
}

/** "Map: SoFi Stadium · Open interactive map" over the top of the map. */
function SourceBar({ map }: { map: VenueMap }) {
  const t = useT('venue');
  const pageUrl = map.pageUrl;
  return (
    <View style={styles.sourceBar} pointerEvents="box-none">
      <Text style={styles.source} numberOfLines={1}>
        {map.image ? t('officialMap.attribution', { source: map.source }) : t('officialMap.schematic')}
      </Text>
      {pageUrl ? (
        <Pressable
          onPress={() => { WebBrowser.openBrowserAsync(pageUrl).catch(() => {}); }}
          hitSlop={8}
          style={({ pressed }) => [styles.openLink, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={t('officialMap.openLabel', { source: map.source })}>
          <Text style={styles.openText} numberOfLines={1}>{t('officialMap.openInteractive')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ZoomButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.zoom, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.zoomGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  content: { position: 'absolute', left: 0, top: 0 },
  pinBox: { position: 'absolute', width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  hit: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  onTop: { zIndex: 2 },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.ink, ...Shadow.card },
  pinFilled: { borderColor: Colors.surface, borderWidth: 2 },
  pinBig: { borderWidth: 3 },
  youHalo: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, opacity: 0.22 },
  youDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, borderWidth: 3, borderColor: Colors.surface, ...Shadow.card },
  youLabel: {
    position: 'absolute',
    top: HIT - 6,
    fontFamily: Fonts.textBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onPrimary,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sourceBar: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...Shadow.card,
  },
  source: { flex: 1, fontFamily: Fonts.text, fontSize: 13, lineHeight: 17, color: Colors.textMuted },
  openLink: { minHeight: 36, justifyContent: 'center' },
  openText: { fontFamily: Fonts.textBold, fontSize: 13, lineHeight: 17, color: Colors.primary, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
  zoomButtons: { position: 'absolute', right: Spacing.sm, gap: Spacing.sm },
  zoom: {
    width: HIT,
    height: HIT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  zoomGlyph: { fontFamily: Fonts.displayMedium, fontSize: 24, lineHeight: 28, color: Colors.ink },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, backgroundColor: Colors.surfaceAlt },
  coverText: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, textAlign: 'center', color: Colors.textMuted },
  bottom: { position: 'absolute', left: 0, right: 0, justifyContent: 'flex-end', paddingHorizontal: Spacing.gutter, paddingBottom: Spacing.md },
});
