import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { initials } from '@/features/profile/summary';

/** Round profile photo, falling back to initials on a soft tint (as in the mockups). */
export function Avatar({ name, uri, size = 56 }: { name: string; uri: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.base, box]} contentFit="cover" accessibilityLabel={`${name || 'Your'} profile photo`} />;
  }
  return (
    <View style={[styles.base, styles.fallback, box]} accessibilityLabel={`${name || 'No'} profile photo`}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: Colors.primarySoft },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700', color: Colors.primary },
});
