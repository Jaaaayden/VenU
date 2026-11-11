import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { PRIVACY_SECTIONS, PRIVACY_SUMMARY, PRIVACY_VERSION } from '@/features/profile/privacy';
import { goBack } from '@/lib/navigation';

/** The privacy policy; Create Account's "Terms & Conditions" link opens it too (no separate terms yet). */
export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/')} style={styles.closeTarget} accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StepHeader title="Your privacy" subtitle={PRIVACY_SUMMARY} />

        {PRIVACY_SECTIONS.map(section => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">{section.title}</Text>
            {section.points.map(point => (
              <View key={point} style={styles.point}>
                <View style={styles.bullet} />
                <Text style={styles.pointText}>{point}</Text>
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
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.gutter, paddingTop: Spacing.xs },
  closeTarget: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  close: { ...Type.body, color: Colors.primary, textDecorationLine: 'underline' },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.sm, paddingBottom: 48 },
  // Figma info tiles: #F5F5F5, radius 10, no outline.
  card: { gap: Spacing.sm, padding: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, color: Colors.text, marginBottom: 2 },
  point: { flexDirection: 'row', gap: Spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ink, marginTop: 8 },
  pointText: { fontFamily: Fonts.text, fontSize: 15, lineHeight: 21, color: Colors.text, flex: 1 },
  version: { ...Type.caption, textAlign: 'center', marginTop: Spacing.md },
});
