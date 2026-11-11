import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { Button } from '@/components/button';
import { ChipGroup } from '@/components/chip-group';
import { FormSection } from '@/components/form-section';
import { LanguagePicker } from '@/components/language-picker';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Spacing, Type } from '@/constants/theme';
import { Checkbox } from '@/features/auth/auth-ui';
import { friendlyError } from '@/lib/errors';

import { ACCESS_NEEDS, AGE_BANDS, COMMUNICATION, GENDERS, HELPER_AGE, HELPER_GENDER, TRAININGS } from './options';
import type { AvatarChange } from './profile-context';
import type { ProfileDraft } from './types';
import { FIRST_NAME_MAX, isValid, NOTE_MAX, validateDraft } from './validate';

interface ProfileFormProps {
  initial: ProfileDraft;
  /** Currently saved photo URL, if any. */
  savedAvatarUrl: string | null;
  submitLabel: string;
  onSubmit: (draft: ProfileDraft, avatar: AvatarChange) => Promise<void>;
  /** Rendered above the form (title, subtitle…). */
  header?: ReactNode;
}

/** Figma onboarding__profile-setup, also used by Edit profile. Volunteers get their own questions. */
export function ProfileForm({ initial, savedAvatarUrl, submitLabel, onSubmit, header }: ProfileFormProps) {
  const [d, setD] = useState<ProfileDraft>(initial);
  const [avatar, setAvatar] = useState<AvatarChange>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const visitor = d.role === 'visitor';
  const errors = submitted ? validateDraft(d) : {};
  const shownAvatar = avatar === 'remove' ? null : avatar ? avatar.uri : savedAvatarUrl;

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setD(prev => ({ ...prev, [key]: value }));
  }

  // A ref, not `saving`: state only disables the button after a re-render, so a quick double
  // tap (or Enter plus a tap on web) could otherwise start two saves and two photo uploads.
  const inFlight = useRef(false);

  async function submit() {
    if (inFlight.current) return;
    setSubmitted(true);
    setSaveError(null);
    if (!isValid(validateDraft(d))) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await onSubmit(d, avatar);
    } catch (e) {
      setSaveError(friendlyError(e));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {header}

        <FormSection title="About you">
          <View style={styles.about}>
            <AvatarPicker name={d.firstName} uri={shownAvatar} onPick={setAvatar} onRemove={() => setAvatar('remove')} />
            <TextField
              label="First name"
              value={d.firstName}
              onChangeText={v => set('firstName', v)}
              placeholder={visitor ? 'e.g. Rosa' : 'e.g. Daniel'}
              maxLength={FIRST_NAME_MAX}
              autoComplete="given-name"
              textContentType="givenName"
              error={errors.firstName}
              hint="Only your first name is shown to the people you meet."
            />
          </View>
        </FormSection>

        <FormSection title={visitor ? 'Languages you speak' : 'Languages you’re fluent in'} error={errors.languages}>
          <LanguagePicker
            languages={d.languages}
            main={d.mainLanguage}
            // The app's UI language follows the primary language (there's no separate setting yet).
            onChange={(languages, main) => setD(prev => ({ ...prev, languages, mainLanguage: main, appLanguage: main || prev.appLanguage }))}
          />
        </FormSection>

        {visitor ? (
          <>
            <FormSection title="Anything we should know?" optional error={errors.accessNeedsNote}>
              <ChipGroup multiple options={ACCESS_NEEDS} value={d.accessNeeds} onChange={v => set('accessNeeds', v)} accessibilityLabel="Access needs" />
              {d.accessNeeds.includes('other') && (
                <View style={styles.note}>
                  <TextField
                    value={d.accessNeedsNote}
                    onChangeText={v => set('accessNeedsNote', v)}
                    placeholder="e.g. I use a service dog"
                    maxLength={NOTE_MAX}
                    multiline
                    accessibilityLabel="Other access needs"
                    error={errors.accessNeedsNote}
                  />
                </View>
              )}
            </FormSection>

            {/* Not in Figma, but helpers see it ("Prefers sign language"), so it has to stay editable. */}
            <FormSection title="How do you like to communicate?" optional hint="Your helper sees this before they reach you.">
              <ChipGroup multiple options={COMMUNICATION} value={d.communication} onChange={v => set('communication', v)} accessibilityLabel="Communication" />
            </FormSection>

            <FormSection title="I’d prefer help from">
              <LabeledRow label="Gender">
                <ChipGroup options={HELPER_GENDER} value={d.helperGenderPref} onChange={v => set('helperGenderPref', v)} accessibilityLabel="Helper gender" />
              </LabeledRow>
              <LabeledRow label="Age">
                <ChipGroup options={HELPER_AGE} value={d.helperAgePref} onChange={v => set('helperAgePref', v)} accessibilityLabel="Helper age" />
              </LabeledRow>
            </FormSection>
          </>
        ) : (
          <>
            <FormSection title="Training" optional hint="LA28 checks these when verifying you.">
              <ChipGroup multiple options={TRAININGS} value={d.trainings} onChange={v => set('trainings', v)} accessibilityLabel="Training" />
            </FormSection>

            <FormSection title="Your gender" hint="Only used when a visitor asks for a woman or man helper. Never shown." error={errors.gender}>
              <ChipGroup options={GENDERS} value={d.gender} onChange={v => set('gender', v)} accessibilityLabel="Gender" />
            </FormSection>

            <FormSection title="Your age range" hint="Only for matching, never shown." error={errors.ageBand}>
              <ChipGroup options={AGE_BANDS} value={d.ageBand} onChange={v => set('ageBand', v)} accessibilityLabel="Age range" />
            </FormSection>
          </>
        )}

        <Checkbox
          checked={d.privacyAccepted}
          onToggle={() => set('privacyAccepted', !d.privacyAccepted)}
          error={errors.privacyAccepted}
          accessibilityLabel="I agree to how VenU uses my info, as set out in the privacy policy">
          <Text style={Type.body}>
            I agree to how VenU uses my info, as set out in the{' '}
            <Text style={styles.link} onPress={() => router.push('/privacy')} accessibilityRole="link">
              privacy policy
            </Text>
            .
          </Text>
        </Checkbox>

        {Object.keys(errors).some(k => k !== 'privacyAccepted') && (
          <Text style={styles.error} accessibilityLiveRegion="polite">Some answers above need a fix (marked in red).</Text>
        )}
        {saveError && <Text style={styles.error}>{saveError}</Text>}
        <Button label={submitLabel} size="lg" onPress={submit} loading={saving} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Figma "Gender  [No preference] [Male] [Female]": a label, then the chips. */
function LabeledRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.labeledRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg, paddingBottom: 48 },
  about: { gap: Spacing.lg },
  note: { marginTop: Spacing.md },

  // Label at its own width, as in Figma (Age's chips start further left than Gender's), so
  // "No preference / Male / Female" fits on one line at 390pt.
  labeledRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: Spacing.md },
  rowLabel: { fontFamily: Fonts.display, fontSize: 14, lineHeight: 20, color: Colors.text, paddingTop: 8 },

  link: { color: Colors.primary, textDecorationLine: 'underline' },
  error: { ...Type.caption, color: Colors.danger, marginTop: Spacing.sm },
  submit: { marginTop: Spacing.xl },
});
