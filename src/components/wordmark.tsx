import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

/** "VenU" with the blue "Ven" and orange "U" from the mockups. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <Text style={[styles.base, { fontSize: size, letterSpacing: size > 30 ? -1 : -0.3 }]} accessibilityRole="header" accessibilityLabel="VenU">
      Ven<Text style={styles.u}>U</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: '800', color: Colors.primary },
  u: { color: Colors.accent },
});
