import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgProps } from 'react-native-svg';

import { FigmaColors, FigmaTypography } from '@/constants/theme';

interface NavItemProps {
  /** Label text shown below the icon */
  label: string;
  /** Whether this tab is currently active */
  active?: boolean;
  /** SVG icon component (from react-native-svg) */
  Icon: React.FC<SvgProps>;
  /** Called when the item is tapped */
  onPress?: () => void;
}

/**
 * A single navigation bar item matching the Figma "Building Blocks/XR/Navigation bar/Nav item"
 * component. Active state shows a light-blue pill behind the icon.
 */
export function NavItem({ label, active = false, Icon, onPress }: NavItemProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}>
      <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
        <Icon width={24} height={24} />
      </View>
      <Text
        style={[
          styles.label,
          active ? styles.labelActive : styles.labelInactive,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    gap: 3,
  },
  iconContainer: {
    width: 64,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    // drop shadow (matches Icon container/effect token)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  iconContainerActive: {
    backgroundColor: FigmaColors.lightBlue,
  },
  label: {
    fontFamily: 'Albert Sans',
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
