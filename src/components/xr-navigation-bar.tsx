/**
 * XR Navigation Bar — Figma component: "XR/XR Navigation bar"
 *
 * Floating pill-shaped bottom nav with 3 tabs.
 * Uses emoji icons — works in Expo Go on iOS and Android with no native build.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaColors, FigmaTypography } from '@/constants/theme';

export type XrTab = 'volunteer' | 'venue' | 'profile';

interface XrNavigationBarProps {
  activeTab?: XrTab;
  onTabPress?: (tab: XrTab) => void;
}

const TABS: { key: XrTab; label: string; emoji: string }[] = [
  { key: 'volunteer', label: 'Volunteer', emoji: '🤝' },
  { key: 'venue',     label: 'Venue',     emoji: '📍' },
  { key: 'profile',   label: 'Profile',   emoji: '👤' },
];

export function XrNavigationBar({ activeTab = 'venue', onTabPress }: XrNavigationBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        {TABS.map(({ key, label, emoji }) => {
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              style={styles.item}
              onPress={() => onTabPress?.(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}>
              <View style={[styles.iconPill, active && styles.iconPillActive]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FigmaColors.white,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 64,
    width: '100%',
    maxWidth: 352,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconPill: {
    width: 64,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: FigmaColors.lightBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  emoji: { fontSize: 18 },
  label: {
    letterSpacing: 0,
    textAlign: 'center',
  },
  labelActive: {
    fontSize: FigmaTypography.label.fontSize,
    lineHeight: FigmaTypography.label.fontSize,
    fontWeight: FigmaTypography.label.fontWeight,
    color: FigmaColors.darkGray,
  },
  labelInactive: {
    fontSize: FigmaTypography.subtitle.fontSize,
    lineHeight: FigmaTypography.subtitle.fontSize,
    fontWeight: FigmaTypography.subtitle.fontWeight,
    color: FigmaColors.darkGray,
  },
});
