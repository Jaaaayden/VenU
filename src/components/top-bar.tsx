import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/wordmark';
import { Colors, Spacing, Type } from '@/constants/theme';
import { goBack } from '@/lib/navigation';

/** White bar at the top of a screen: back link (when `back`) or the VenU wordmark. */
export function TopBar({ back, backLabel = 'Back', fallback = '/', right }: {
  back?: boolean;
  backLabel?: string;
  /** Where Back goes when there's no history (web reload, deep link). */
  fallback?: Href;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.bar}>
      {back ? (
        <Pressable onPress={() => goBack(fallback)} hitSlop={10} style={styles.target} accessibilityRole="button" accessibilityLabel={backLabel}>
          <Text style={styles.back}>‹ {backLabel}</Text>
        </Pressable>
      ) : (
        <Wordmark />
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: Spacing.gutter,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  // Real padding, not just hitSlop: hitSlop doesn't enlarge the target on web.
  target: { minHeight: 44, justifyContent: 'center', paddingRight: Spacing.md },
  back: { ...Type.bodyStrong, color: Colors.primary },
});
