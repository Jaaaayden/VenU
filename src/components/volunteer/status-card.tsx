/** "Your status": Free / Busy / Off as a radio group, with a line saying what the choice does. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { AVAILABILITIES, type Availability } from '@/features/volunteer/availability';
import { useT } from '@/i18n';

// Same weight as the Figma clock (2pt strokes on a 20pt grid).
const STROKE = { strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

/** Bell (Free: requests ring), clock (Busy), minus-circle (Off). */
function StatusIcon({ status, color, size = 26 }: { status: Availability; color: string; size?: number }) {
  if (status === 'busy') return <FigmaIcon name="clock" size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {status === 'free' ? (
        <>
          <Path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5z" stroke={color} {...STROKE} />
          <Path d="M13.7 20.5a2 2 0 0 1-3.4 0" stroke={color} {...STROKE} />
        </>
      ) : (
        <>
          <Circle cx="12" cy="12" r="10" stroke={color} {...STROKE} />
          <Path d="M8 12h8" stroke={color} {...STROKE} />
        </>
      )}
    </Svg>
  );
}

/** The tick on the chosen tile, so the choice reads without colour. */
function Tick() {
  return (
    <View style={styles.tick}>
      <Svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
        <Path d="M2.5 6.2l2.3 2.3 4.7-5" stroke={Colors.onPrimary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

export function StatusCard({ status, onChange }: { status: Availability; onChange: (next: Availability) => void }) {
  const t = useT('volunteer');
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">{t('home.statusTitle')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('home.statusTitle')}>
        {AVAILABILITIES.map(value => {
          const selected = value === status;
          const color = selected ? Colors.primary : Colors.ink;
          return (
            <Pressable
              key={value}
              onPress={() => onChange(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, selected }}
              // react-native-web reads only aria-* for state.
              aria-checked={selected}
              accessibilityLabel={t(`home.status.${value}`)}
              style={({ pressed }) => [styles.tile, selected && styles.selected, pressed && styles.pressed]}>
              <View style={styles.tileTop}>
                <StatusIcon status={value} color={color} />
                {selected ? <Tick /> : null}
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>{t(`home.status.${value}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.line} accessibilityLiveRegion="polite">{t(`home.statusLine.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  title: { ...Type.bodyStrong },
  row: { flexDirection: 'row', gap: Spacing.md },
  tile: {
    flex: 1,
    minHeight: 76,
    padding: Spacing.md,
    gap: 6,
    borderRadius: Radius.md,
    // Always 2pt so choosing a tile doesn't shift its content.
    borderWidth: 2,
    borderColor: Colors.surface,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  selected: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  pressed: { opacity: 0.8 },
  label: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 19, color: Colors.text },
  labelSelected: { fontFamily: Fonts.displayMedium, color: Colors.primary },
  // A row, not absolute: react-native-web ignores `end`, and a row flips in RTL on its own.
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { ...Type.caption, color: Colors.text },
});
