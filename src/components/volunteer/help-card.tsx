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

export function HelpCard({ type, selected, onPress }: { type: HelpTypeId; selected: boolean; onPress: () => void }) {
  const t = useT('volunteer');
  const label = t(`helpTypes.${type}`);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}>
      <HelpIcon type={type} size={26} color={selected ? Colors.onPrimary : Colors.ink} />
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

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
  label: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.text },
  labelSelected: { color: Colors.onPrimary },
});
