import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { goBack } from '@/lib/navigation';

// Plain-language terms for a student project. DRAFT, not legal text: the team reviews it before launch.
const TERMS_VERSION = '2026-11-draft-1';

const TERMS_SECTIONS: { title: string; points: string[] }[] = [
  {
    title: 'What VenU is',
    points: [
      'A student project that connects LA28 visitors who need a hand with volunteers at the venue.',
      'It’s free, and still being tested, so some things may not work yet.',
    ],
  },
  {
    title: 'Not for emergencies',
    points: [
      'In an emergency, call 911 or tell the nearest venue staff member.',
      'Volunteers can guide and translate, but they aren’t medical or security staff.',
    ],
  },
  {
    title: 'Be kind and honest',
    points: [
      'Treat visitors and volunteers with respect, and only ask for help you need.',
      'Use your real first name, and only add a photo of yourself.',
      'Reports about facilities should describe what you actually saw.',
    ],
  },
  {
    title: 'What we can remove',
    points: [
      'We can remove reports or accounts that are abusive, false or unsafe.',
      'You can delete your account and data any time from Profile.',
    ],
  },
  {
    title: 'No guarantees',
    points: [
      'We can’t promise a volunteer will always be free, or that venue info is always up to date.',
      'Volunteers help in good faith; VenU isn’t responsible for what happens at the venue.',
    ],
  },
];

/** Terms of use, from Profile → Terms of use and Create Account's "Terms & Conditions" link. */
export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/')} style={styles.closeTarget} accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StepHeader title="Terms of use" subtitle="The short version of the rules for using VenU." />

        {TERMS_SECTIONS.map(section => (
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

        <Text style={styles.privacy}>
          How we use your info is in the{' '}
          <Text style={styles.link} onPress={() => router.push('/privacy')} accessibilityRole="link">
            privacy policy
          </Text>
          .
        </Text>
        <Text style={styles.version}>Version {TERMS_VERSION}. Draft for team review.</Text>
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
  // Same info tiles as the privacy policy: #F5F5F5, radius 10, no outline.
  card: { gap: Spacing.sm, padding: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, color: Colors.text, marginBottom: 2 },
  point: { flexDirection: 'row', gap: Spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ink, marginTop: 8 },
  pointText: { fontFamily: Fonts.text, fontSize: 15, lineHeight: 21, color: Colors.text, flex: 1 },
  privacy: { ...Type.body, marginTop: Spacing.sm },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
  version: { ...Type.caption, textAlign: 'center', marginTop: Spacing.lg },
});
