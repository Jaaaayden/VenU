/**
 * Figma "Volunteer Cards" (152:16995, compact in 492:8829): white tile with an icon and a label;
 * Selected is filled blue so it stands out on the tinted panel. Figma puts the icon beside the
 * label, but at 390pt a card is ~99pt wide and words like "linguistique" wouldn't fit, so the
 * label stays under the icon.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import type { HelpTypeId } from '@/features/volunteer/types';
import { useT } from '@/i18n';

import { HelpIcon } from './help-icon';

/** Padding plus border on each side of a card's label, for the grid's "does this word fit" check. */
export const HELP_CARD_INSET = 11;

/**
 * 3 cards a row when every label's widest word fits a card, else 2, so no word splits. 3 until measured.
 * e.g. helpGridColumns(326, 12, 60) → 3 (cards ~101pt, ~79pt for text); helpGridColumns(256, 12, 60) → 2
 */
export function helpGridColumns(gridWidth: number, gap: number, widestWord: number | null): 2 | 3 {
  if (!gridWidth || widestWord === null) return 3;
  const textWidth = (gridWidth - 2 * gap) / 3 - 2 * HELP_CARD_INSET;
  return widestWord <= textWidth ? 3 : 2;
}

export function HelpCard({ type, selected, onPress }: { type: HelpTypeId; selected: boolean; onPress: () => void }) {
  const t = useT('volunteer');
  const label = t(`helpTypes.${type}`);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      // react-native-web reads only aria-* for state.
      aria-checked={selected}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}>
      <HelpIcon type={type} size={26} color={selected ? Colors.onPrimary : Colors.ink} />
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** The label's type, also used to measure its widest word. */
export const HELP_LABEL = { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.text } as const;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 74,
    padding: 10,
    gap: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceAlt,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressed: { opacity: 0.8 },
  label: HELP_LABEL,
  labelSelected: { color: Colors.onPrimary },
});
