/**
 * Measures the widest single word among some labels, as rendered in `style`, so a layout can
 * choose a column count or text size that never splits a word ("Directio/ns", "Ֆիզիկակա/ն").
 * A label without spaces (Japanese, Chinese) counts as one word.
 *
 * const { widest, probe } = useWidestWord(labels, styles.label);
 * // render {probe} anywhere inside the layout; `widest` is null until measured.
 */
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

// Still laid out (so measurable) but left out of find-in-page and the page's text on web.
const webHidden = Platform.OS === 'web' ? ({ visibility: 'hidden' } as unknown as ViewStyle) : null;

export function useWidestWord(labels: readonly string[], style: StyleProp<TextStyle>) {
  const joined = labels.join('\n');
  const words = useMemo(() => [...new Set(joined.split(/\s+/).filter(Boolean))], [joined]);
  const key = words.join('\n');
  const [measured, setMeasured] = useState<{ key: string; widths: Record<string, number> }>({ key, widths: {} });

  const record = useCallback((word: string, e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setMeasured(prev => {
      const widths = prev.key === key ? prev.widths : {};
      return widths[word] === width ? prev : { key, widths: { ...widths, [word]: width } };
    });
  }, [key]);

  const widths = measured.key === key ? measured.widths : {};
  const widest = words.length && words.every(w => widths[w] !== undefined) ? Math.max(...words.map(w => widths[w])) : null;

  // Off-screen and clipped: no scrollbars, no taps, hidden from screen readers.
  const probe = (
    <View style={[styles.clip, webHidden]} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.row}>
        {/* Keyed by the whole word set too: when the labels change, every probe mounts again and
            reports its width, including a word both sets share (es → fr keeps "Libre"). */}
        {words.map(w => (
          <Text key={`${key}|${w}`} style={[style, styles.word]} numberOfLines={1} onLayout={e => record(w, e)}>{w}</Text>
        ))}
      </View>
    </View>
  );
  return { widest, probe };
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // Wide enough that no word wraps; each word sizes to its own text.
  row: { position: 'absolute', top: 0, left: 0, width: 4000, alignItems: 'flex-start' },
  word: { flexShrink: 0, alignSelf: 'flex-start' },
});
