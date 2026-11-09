import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { FormSection, StepHeader } from '@/components/form-section';
import { LanguageSearchModal } from '@/components/language-picker';
import { TopBar } from '@/components/top-bar';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { languageName } from '@/features/profile/options';
import type { Role } from '@/features/profile/types';

// Shown as one-tap chips; everything else is behind "More languages".
const QUICK_LANGUAGES = ['en', 'es', 'zh', 'ko', 'tl', 'vi', 'ja', 'fr'];

const ROLES: { value: Role; title: string; body: string }[] = [
  { value: 'visitor', title: "I'm visiting", body: 'Get help at the venue in your language.' },
  { value: 'volunteer', title: "I'm an LA28 volunteer", body: "Help visitors near you. You'll show as unverified until LA28 confirms you." },
];

/** Step 1 of 2: main language first (the first thing someone who doesn't read English needs), then role. */
export default function RoleStep() {
  const [lang, setLang] = useState('en');
  const [role, setRole] = useState<Role | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const chips = QUICK_LANGUAGES.includes(lang) ? QUICK_LANGUAGES : [lang, ...QUICK_LANGUAGES];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <StepHeader step={1} total={2} title="Welcome to VenU" subtitle="Two quick steps so we can find the right helper for you." />

        <FormSection title="Your main language" hint="We'll use it for the app and to match you.">
          <View style={styles.chips}>
            {chips.map(code => (
              <Chip key={code} label={languageName(code)} selected={lang === code} role="radio" onPress={() => setLang(code)} />
            ))}
            <Chip label="+ More languages" dashed role="button" onPress={() => setSearchOpen(true)} />
          </View>
        </FormSection>

        <FormSection title="How will you use VenU?">
          <View style={styles.cards} accessibilityRole="radiogroup">
            {ROLES.map(r => {
              const on = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={[styles.card, on && styles.cardOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}>
                  <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                  <View style={styles.cardText}>
                    <Text style={[Type.bodyStrong, on && styles.textOn]}>{r.title}</Text>
                    <Text style={Type.caption}>{r.body}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </FormSection>

        <Button
          label="Continue"
          disabled={!role}
          onPress={() => role && router.push({ pathname: '/onboarding/profile', params: { role, lang } })}
        />
      </ScrollView>

      <LanguageSearchModal
        visible={searchOpen}
        onSelect={code => {
          setLang(code);
          setSearchOpen(false);
        }}
        onClose={() => setSearchOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.xl, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cards: { gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  cardText: { flex: 1, gap: 2 },
  textOn: { color: Colors.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
