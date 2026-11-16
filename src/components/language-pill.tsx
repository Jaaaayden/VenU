/**
 * The corner "🌐 English" pill on every onboarding screen (welcome, landing, Create Account, Sign In
 * and the setup steps), so it keeps one look and position from the first screen to the last.
 * The caller decides what a tap does and words the screen-reader label.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';

import { Colors, Radius, Shadow, Type } from '@/constants/theme';

/** Globe outline (no globe in the Figma SVG export). */
function Globe({ size = 22, color = Colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={1.6} />
      <Ellipse cx={12} cy={12} rx={4.2} ry={9.5} stroke={color} strokeWidth={1.6} />
      <Line x1={2.5} y1={12} x2={21.5} y2={12} stroke={color} strokeWidth={1.6} />
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={1.3} />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}

export function LanguagePill({ label, onPress, accessibilityLabel, accessibilityHint }: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.target}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      {({ pressed }) => (
        <View style={[styles.pill, pressed && styles.pressed]}>
          <Globe />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: 44, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
    ...Shadow.card,
    shadowOpacity: 0.12,
  },
  pressed: { opacity: 0.7 },
  label: { ...Type.body, writingDirection: 'ltr' },
});
