/**
 * One venue: header with category chips, the stadium map, and the "Facility Search" bottom sheet.
 * The sheet snaps to three heights (down / mid / up) by dragging or tapping its handle; its content
 * is the current child route (facility list, facility card, report, add report).
 */
import { router, Slot, useGlobalSearchParams } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Chip } from '@/components/chip';
import { NAV_BAR_CLEARANCE } from '@/components/tab-bar';
import { Colors, Shadow, Spacing } from '@/constants/theme';

import { CATEGORIES } from './categories';
import { facilitiesFor } from './mock';
import { MAP_BACKGROUND, SHEET_HANDLE, StadiumMap } from './stadium-map';
import type { Facility, FacilityCategory, Venue } from './types';
import { BackArrow, venueText } from './ui';

export type SheetSnap = 'down' | 'mid' | 'up';

interface VenueScreenState {
  venue: Venue;
  facilities: Facility[];
  category: FacilityCategory | null;
  setCategory: (c: FacilityCategory | null) => void;
  snap: SheetSnap;
  setSnap: (s: SheetSnap) => void;
  /** Bottom padding sheet content needs so its end clears the tab bar at the current height. */
  contentInset: number;
}

const VenueScreenContext = createContext<VenueScreenState | null>(null);

export function useVenueScreen(): VenueScreenState {
  const ctx = use(VenueScreenContext);
  if (!ctx) throw new Error('useVenueScreen outside VenueMapScreen');
  return ctx;
}

/** Scroll view for sheet content: pads the bottom so the last item clears the tab bar. */
export function SheetScroll({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const { contentInset } = useVenueScreen();
  return (
    <ScrollView
      {...rest}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.sheetContent, contentContainerStyle, { paddingBottom: contentInset }]}>
      {children}
    </ScrollView>
  );
}

/** Raised sheet's gap below the header, and how much of the lowered sheet shows above the tab bar. */
const UP_GAP = 48;
const PEEK = 132;
const NEXT: Record<SheetSnap, SheetSnap> = { down: 'mid', mid: 'up', up: 'down' };
const SNAP_NAMES: SheetSnap[] = ['up', 'mid', 'down'];
const SNAP_LABEL: Record<SheetSnap, string> = { down: 'lowered', mid: 'half open', up: 'raised' };
const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

export function VenueMapScreen({ venue }: { venue: Venue }) {
  const insets = useSafeAreaInsets();
  const { facilityId } = useGlobalSearchParams<{ facilityId?: string }>();
  const facilities = useMemo(() => facilitiesFor(venue.id), [venue.id]);
  const [category, setCategory] = useState<FacilityCategory | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('mid');
  const [box, setBox] = useState({ w: 0, h: 0 });

  const tabClearance = NAV_BAR_CLEARANCE - 24 + Math.max(insets.bottom, 0);
  const positions = useMemo(() => {
    const h = box.h;
    const down = Math.max(h - PEEK - tabClearance, UP_GAP);
    return { up: UP_GAP, mid: Math.min(Math.round(h * 0.5), down), down };
  }, [box.h, tabClearance]);

  // Sheet top, in the map area's coordinates.
  const top = useSharedValue(0);
  const snaps = useSharedValue([positions.up, positions.mid, positions.down]);
  const start = useSharedValue(0);

  useEffect(() => {
    snaps.set([positions.up, positions.mid, positions.down]);
    top.set(withSpring(positions[snap], SPRING));
  }, [positions, snap, snaps, top]);

  const pan = usePanGesture({
    minDistance: 4,
    onBegin: () => {
      'worklet';
      start.set(top.get());
    },
    onUpdate: e => {
      'worklet';
      const [up, , down] = snaps.get();
      top.set(Math.min(Math.max(start.get() + e.translationY, up - 20), down + 20));
    },
    onDeactivate: e => {
      'worklet';
      // Aim where a flick would carry the sheet, then take the nearest stop.
      const projected = top.get() + e.velocityY * 0.15;
      let best = 0;
      for (let i = 1; i < 3; i++) if (Math.abs(snaps.get()[i] - projected) < Math.abs(snaps.get()[best] - projected)) best = i;
      top.set(withSpring(snaps.get()[best], SPRING));
      scheduleOnRN(setSnap, SNAP_NAMES[best]);
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: top.get() }] }));
  // Keep the stadium centred in the strip of map above the sheet.
  const mapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: Math.min((top.get() - snaps.get()[2]) / 2, 0) }] }));

  const pickCategory = useCallback((c: FacilityCategory | null) => {
    setCategory(c);
    setSnap(s => (s === 'up' ? 'mid' : s)); // show the highlighted pins
  }, []);

  const openFromMap = useCallback((f: Facility) => {
    setSnap('mid');
    router.navigate({ pathname: '/venue/[venueId]/[facilityId]', params: { venueId: venue.id, facilityId: f.id } });
  }, [venue.id]);

  const sheetHeight = Math.max(box.h - positions.up, 0);
  const ctx: VenueScreenState = {
    venue,
    facilities,
    category,
    setCategory: pickCategory,
    snap,
    setSnap,
    contentInset: positions[snap] - positions.up + tabClearance + Spacing.xl,
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <VenueScreenContext value={ctx}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.titleRow}>
            <BackArrow onPress={() => router.navigate('/venue')} label="Back to venues" />
            <View style={styles.titleText}>
              <Text style={venueText.title} accessibilityRole="header" numberOfLines={2}>{venue.name}</Text>
              <Text style={venueText.caption} numberOfLines={1}>{venue.address}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Facility type">
            <Chip label="All" role="radio" selected={category === null} onPress={() => pickCategory(null)} />
            {CATEGORIES.map(c => (
              <Chip key={c.value} label={c.label} role="radio" selected={category === c.value} onPress={() => pickCategory(category === c.value ? null : c.value)} />
            ))}
          </ScrollView>
        </SafeAreaView>

        <View style={styles.area} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {box.w > 0 ? (
            <>
              <Animated.View style={[styles.map, mapStyle]}>
                <StadiumMap
                  shape={venue.shape}
                  facilities={facilities}
                  width={box.w}
                  height={positions.down}
                  category={category}
                  selectedId={facilityId}
                  onPinPress={openFromMap}
                />
              </Animated.View>

              <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
                <GestureDetector gesture={pan}>
                  <View style={styles.handleZone}>
                    <Pressable
                      onPress={() => setSnap(NEXT[snap])}
                      style={styles.handleTarget}
                      accessibilityRole="adjustable"
                      accessibilityLabel={`Facility panel, ${SNAP_LABEL[snap]}`}
                      accessibilityHint="Tap to resize, or drag up and down"
                      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                      onAccessibilityAction={e => setSnap(s => (e.nativeEvent.actionName === 'increment' ? (s === 'down' ? 'mid' : 'up') : s === 'up' ? 'mid' : 'down'))}>
                      <View style={styles.handle} />
                    </Pressable>
                  </View>
                </GestureDetector>
                <View style={styles.sheetBody}>
                  <Slot />
                </View>
              </Animated.View>
            </>
          ) : null}
        </View>
      </VenueScreenContext>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.bg, zIndex: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  titleText: { flex: 1, gap: 4 },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter, paddingVertical: Spacing.sm },
  area: { flex: 1, overflow: 'hidden', backgroundColor: MAP_BACKGROUND, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  map: { position: 'absolute', left: 0, right: 0, top: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadow.float,
    shadowOffset: { width: 0, height: -2 },
  },
  handleZone: { alignItems: 'center' },
  handleTarget: { width: '100%', height: 32, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as object,
  handle: { width: 102, height: 4, borderRadius: 2, backgroundColor: SHEET_HANDLE },
  sheetBody: { flex: 1 },
  sheetContent: { paddingHorizontal: Spacing.gutter, paddingTop: 4 },
});
