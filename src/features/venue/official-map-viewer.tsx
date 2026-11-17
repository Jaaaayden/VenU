/**
 * Full-screen view of one official map image: pinch or the +/− buttons to zoom, drag to pan,
 * double-tap to zoom in or back out. The image is geographic, so it never mirrors in RTL.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

import type { OfficialMapImage } from './official-maps';

const MAX_SCALE = 5;
const STEP = 1.6;
const DOUBLE_TAP_SCALE = 2.5;

interface ViewerProps {
  visible: boolean;
  onClose: () => void;
  image: OfficialMapImage;
  title: string;
  /** Read by screen readers for the image. */
  label: string;
}

export function OfficialMapViewer({ visible, onClose, image, title, label }: ViewerProps) {
  const t = useT('venue');
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.top}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => [styles.close, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('officialMap.close')}>
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>
          {visible ? <ZoomableImage image={image} label={label} /> : null}
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({ image, label }: { image: OfficialMapImage; label: string }) {
  const t = useT('venue');
  const [box, setBox] = useState({ w: 0, h: 0 });
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Fitted image size and frame size, read by the gesture worklets.
  const dims = useSharedValue({ fw: 0, fh: 0, cw: 0, ch: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: cw, height: ch } = e.nativeEvent.layout;
    const ratio = image.width / image.height;
    const fw = Math.min(cw, ch * ratio);
    dims.set({ fw, fh: fw / ratio, cw, ch });
    setBox({ w: cw, h: ch });
  };

  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      startScale.set(scale.get());
    },
    onUpdate: e => {
      'worklet';
      scale.set(Math.min(Math.max(startScale.get() * e.scale, 1), MAX_SCALE));
      clampPan(dims, scale.get(), x, y, x.get(), y.get());
    },
  });

  const pan = usePanGesture({
    minDistance: 2,
    onBegin: () => {
      'worklet';
      startX.set(x.get());
      startY.set(y.get());
    },
    onUpdate: e => {
      'worklet';
      clampPan(dims, scale.get(), x, y, startX.get() + e.translationX, startY.get() + e.translationY);
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const next = scale.get() > 1.05 ? 1 : DOUBLE_TAP_SCALE;
      scale.set(withTiming(next));
      clampPan(dims, next, x, y, x.get(), y.get(), true);
    },
  });

  const gestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const zoomBy = (factor: number) => {
    const next = Math.min(Math.max(scale.get() * factor, 1), MAX_SCALE);
    scale.set(withTiming(next));
    clampPan(dims, next, x, y, x.get(), y.get(), true);
  };

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <View style={styles.stage}>
      <GestureDetector gesture={gestures}>
        <View style={styles.frame} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={label}>
          {box.w > 0 ? (
            <Animated.View style={[{ width: box.w, height: box.h }, imageStyle]}>
              <Image source={{ uri: image.url, width: image.width, height: image.height }} style={styles.image} contentFit="contain" accessible={false} />
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.controls}>
        <ZoomButton glyph="−" label={t('officialMap.zoomOut')} onPress={() => zoomBy(1 / STEP)} />
        <ZoomButton glyph="+" label={t('officialMap.zoomIn')} onPress={() => zoomBy(STEP)} />
      </View>
    </View>
  );
}

/** Keeps the zoomed image covering the frame: no panning past its edges. */
function clampPan(
  dims: SharedValue<{ fw: number; fh: number; cw: number; ch: number }>,
  s: number,
  x: SharedValue<number>,
  y: SharedValue<number>,
  nx: number,
  ny: number,
  animate = false,
) {
  'worklet';
  const { fw, fh, cw, ch } = dims.get();
  const maxX = Math.max((fw * s - cw) / 2, 0);
  const maxY = Math.max((fh * s - ch) / 2, 0);
  const cx = Math.min(Math.max(nx, -maxX), maxX);
  const cy = Math.min(Math.max(ny, -maxY), maxY);
  x.set(animate ? withTiming(cx) : cx);
  y.set(animate ? withTiming(cy) : cy);
}

function ZoomButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.zoom, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.zoomGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingStart: Spacing.gutter, paddingEnd: Spacing.sm, minHeight: 56 },
  title: { flex: 1, fontFamily: Fonts.displayMedium, fontSize: 17, lineHeight: 22, color: Colors.onPrimary },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, color: Colors.onPrimary },
  pressed: { opacity: 0.6 },
  stage: { flex: 1 },
  frame: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { flex: 1 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  zoom: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  zoomGlyph: { fontFamily: Fonts.displayMedium, fontSize: 28, lineHeight: 32, color: Colors.ink },
});
