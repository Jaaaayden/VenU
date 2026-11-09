import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/wordmark';
import { Colors, Spacing, Type } from '@/constants/theme';

/** White bar at the top of a screen: back link (when `back`) or the VenU wordmark. */
export function TopBar({ back, backLabel = 'Back', right }: { back?: boolean; backLabel?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.bar}>
      {back ? (
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={backLabel}>
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
  back: { ...Type.bodyStrong, color: Colors.primary },
});
