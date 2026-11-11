import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { FormSection, StepHeader } from '@/components/form-section';
import { TextField } from '@/components/text-field';
import { BackLink } from '@/components/top-bar';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How does matching work?',
    a: 'When you ask for help, we look for a nearby volunteer at your venue who speaks your language and has the training your needs call for, e.g. a wheelchair-trained volunteer who speaks Español.',
  },
  {
    q: 'What can volunteers help with?',
    a: 'Finding your seat, gate, restroom or elevator, getting around the venue, and translating. They can’t give medical care.',
  },
  {
    q: 'What if it’s an emergency?',
    a: 'Call 911, or tell the nearest venue staff member. VenU volunteers aren’t emergency responders.',
  },
  {
    q: 'Which languages are supported?',
    a: 'You can list any of 21 languages, including ASL. Add every language you speak in Edit profile so we can find more helpers for you.',
  },
  {
    q: 'Who sees my information?',
    a: 'Only the person helping you, and only while they help: your first name, photo, languages and the needs you chose to share. See Privacy & data for the rest.',
  },
  {
    q: 'How do I report a facility problem?',
    a: 'On the Venue tab, tap the facility (e.g. an elevator or restroom), then Add Your Own Report. Everyone who opens that facility sees it.',
  },
];

const FEEDBACK_MAX = 1000;

/** Profile → Help & feedback: FAQ answers that expand, and a feedback box. */
export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function send() {
    const text = feedback.trim();
    if (!text) return setError('Write a few words first.');
    // Mock: nowhere to send it yet. A backend can replace this log.
    console.log('[feedback]', text);
    setError(null);
    setFeedback('');
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackLink label="Profile" fallback="/profile" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <StepHeader title="Help & feedback" subtitle="Answers to common questions, and a way to tell us what to fix." />

          <FormSection title="Common questions">
            <View style={styles.card}>
              {FAQ.map((item, i) => {
                const expanded = open === i;
                return (
                  <View key={item.q}>
                    <Pressable
                      onPress={() => setOpen(expanded ? null : i)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      aria-expanded={expanded}
                      style={({ pressed }) => [styles.q, pressed && styles.pressed]}>
                      <Text style={styles.qText}>{item.q}</Text>
                      <Chevron up={expanded} />
                    </Pressable>
                    {expanded && <Text style={styles.a}>{item.a}</Text>}
                    {i < FAQ.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </FormSection>

          <FormSection title="Send feedback" hint="Something confusing, broken or missing? Tell us.">
            {sent ? (
              <View style={styles.thanks} accessibilityLiveRegion="polite">
                <Text style={styles.thanksTitle}>Thank you!</Text>
                <Text style={Type.body}>We read every note and use it to make VenU better.</Text>
                <Button label="Send more feedback" variant="link" onPress={() => setSent(false)} style={styles.more} />
              </View>
            ) : (
              <View style={styles.form}>
                <TextField
                  value={feedback}
                  onChangeText={v => {
                    setFeedback(v);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. The map was hard to read in the sun"
                  multiline
                  maxLength={FEEDBACK_MAX}
                  accessibilityLabel="Your feedback"
                  error={error}
                />
                <Button label="Send feedback" onPress={send} />
              </View>
            )}
          </FormSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={up ? styles.flip : undefined}>
      <Path d="M6 9l6 6 6-6" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg, paddingBottom: 48 },

  card: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.controlBorder, backgroundColor: Colors.surface, overflow: 'hidden' },
  q: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  pressed: { backgroundColor: Colors.surfaceAlt },
  qText: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, color: Colors.text, flex: 1 },
  a: { fontFamily: Fonts.text, fontSize: 15, lineHeight: 21, color: Colors.textMuted, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: Spacing.lg },
  flip: { transform: [{ rotate: '180deg' }] },

  form: { gap: Spacing.md },
  thanks: { gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  thanksTitle: { fontFamily: Fonts.displayMedium, fontSize: 17, lineHeight: 22, color: Colors.text },
  more: { alignSelf: 'flex-start' },
});
