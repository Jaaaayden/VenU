import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

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
  const t = useT('common');
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
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeTarget} accessibilityRole="button" accessibilityLabel={removeLabel ?? t('chip.remove', { label })}>
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
  // Follows the UI direction (an Arabic label reads right to left, ✓ first); wrap a name from the
  // other direction in isolatedLanguageName() so it doesn't reorder the label.
  label: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20, color: Colors.text },
  labelSelected: { color: Colors.primary },
  // 28px box (WCAG 2.2 asks >= 24) that tucks into the chip's end padding (right, or left in RTL).
  removeTarget: { minWidth: 28, minHeight: 28, marginEnd: -8, alignItems: 'center', justifyContent: 'center' },
  remove: { fontSize: 18, lineHeight: 20, color: Colors.textMuted },
});
