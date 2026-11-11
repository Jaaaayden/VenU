import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** `checkbox` for multi-select groups, `radio` for single-select. */
  role?: 'checkbox' | 'radio' | 'button';
  /** Dashed outline for "+ Add …" actions. */
  dashed?: boolean;
  /** Extra action on the right, e.g. remove (×). */
  onRemove?: () => void;
  removeLabel?: string;
}

export function Chip({ label, selected = false, onPress, role = 'checkbox', dashed, onRemove, removeLabel }: ChipProps) {
  return (
    <View style={[styles.chip, selected && styles.chipSelected, dashed && styles.chipDashed]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={6}
        style={styles.main}
        accessibilityRole={role}
        accessibilityState={role === 'button' ? undefined : { checked: selected }}
        accessibilityLabel={label}>
        <Text style={[styles.label, (selected || dashed) && styles.labelSelected]}>
          {selected ? '✓ ' : ''}
          {label}
        </Text>
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeTarget} accessibilityRole="button" accessibilityLabel={removeLabel ?? `Remove ${label}`}>
          <Text style={[styles.remove, selected && styles.labelSelected]}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    // Figma "Filter chip": 32 tall, radius 8, 1px outline; 36 here for an easier tap.
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  chipDashed: { borderStyle: 'dashed', borderColor: Colors.primary },
  main: { paddingVertical: 6 },
  // LTR paragraph so "العربية · main" doesn't flip to "main · العربية".
  label: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20, color: Colors.text, writingDirection: 'ltr' },
  labelSelected: { color: Colors.primary },
  // 28px box (WCAG 2.2 asks >= 24) that tucks into the chip's right padding.
  removeTarget: { minWidth: 28, minHeight: 28, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  remove: { fontSize: 18, lineHeight: 20, color: Colors.textMuted },
});
