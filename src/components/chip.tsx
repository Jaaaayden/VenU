import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

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
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={removeLabel ?? `Remove ${label}`}>
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
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  chipDashed: { borderStyle: 'dashed', borderColor: Colors.primary },
  main: { paddingVertical: Spacing.sm },
  // LTR paragraph so "العربية · main" doesn't flip to "main · العربية".
  label: { ...Type.label, fontWeight: '500', writingDirection: 'ltr' },
  labelSelected: { color: Colors.primary, fontWeight: '700' },
  remove: { fontSize: 18, lineHeight: 20, color: Colors.textMuted },
});
