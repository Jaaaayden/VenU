import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { PRIVACY_SECTIONS, PRIVACY_SUMMARY, PRIVACY_VERSION } from '@/features/profile/privacy';
import { goBack } from '@/lib/navigation';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => goBack('/')}
          hitSlop={10}
          style={styles.closeTarget}
          accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StepHeader title="Your privacy" subtitle={PRIVACY_SUMMARY} />

        {PRIVACY_SECTIONS.map(section => (
          <View key={section.title} style={styles.card}>
            <Text style={Type.heading} accessibilityRole="header">{section.title}</Text>
            {section.points.map(point => (
              <View key={point} style={styles.point}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[Type.body, styles.pointText]}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.version}>Version {PRIVACY_VERSION}. Draft for team review.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.gutter, paddingVertical: Spacing.md },
  closeTarget: { minHeight: 44, justifyContent: 'center', paddingLeft: Spacing.md }, // real target on web
  close: { ...Type.bodyStrong, color: Colors.primary },
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: 48 },
  card: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  point: { flexDirection: 'row', gap: Spacing.sm },
  bullet: { ...Type.body, color: Colors.textMuted },
  pointText: { flex: 1, lineHeight: 21 },
  version: { ...Type.caption, textAlign: 'center', marginTop: Spacing.md },
});
