import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AvatarPicker } from '@/components/avatar-picker';
import { Button } from '@/components/button';
import { ChipGroup } from '@/components/chip-group';
import { FormSection } from '@/components/form-section';
import { LanguagePicker } from '@/components/language-picker';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/errors';

import { ACCESS_NEEDS, AGE_BANDS, COMMUNICATION, GENDERS, HELPER_AGE, HELPER_GENDER, TRAININGS } from './options';
import type { AvatarChange } from './profile-context';
import { SummaryTags } from './summary-tags';
import type { ProfileDraft } from './types';
import { FIRST_NAME_MAX, isValid, NOTE_MAX, validateDraft } from './validate';

interface ProfileFormProps {
  initial: ProfileDraft;
  /** Currently saved photo URL, if any. */
  savedAvatarUrl: string | null;
  submitLabel: string;
  onSubmit: (draft: ProfileDraft, avatar: AvatarChange) => Promise<void>;
  /** Rendered above the form (step header, title…). */
  header?: ReactNode;
}

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

  async function submit() {
    setSubmitted(true);
    setSaveError(null);
    if (!isValid(validateDraft(d))) return;
    setSaving(true);
    try {
      await onSubmit(d, avatar);
    } catch (e) {
      setSaveError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {header}

        <FormSection title="Profile photo" optional>
          <AvatarPicker name={d.firstName} uri={shownAvatar} onPick={setAvatar} onRemove={() => setAvatar('remove')} />
        </FormSection>

        <FormSection title="Your first name" hint="Only your first name is shown to the people you meet." error={errors.firstName}>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={d.firstName}
            onChangeText={v => set('firstName', v)}
            placeholder={visitor ? 'e.g. Rosa' : 'e.g. Daniel'}
            placeholderTextColor={Colors.textFaint}
            maxLength={FIRST_NAME_MAX}
            autoComplete="given-name"
            textContentType="givenName"
            accessibilityLabel="First name"
          />
        </FormSection>

        <FormSection
          title={visitor ? 'Languages you speak' : "Languages you're fluent in"}
          hint={visitor ? 'Add every language you’re comfortable in. Tap one to make it your main.' : 'Only languages you can help someone in.'}
          error={errors.languages}>
          <LanguagePicker
            languages={d.languages}
            main={d.mainLanguage}
            onChange={(languages, main) => setD(prev => ({ ...prev, languages, mainLanguage: main }))}
          />
        </FormSection>

        {visitor ? (
          <>
            <FormSection title="Anything we should know?" optional hint="Share only what helps. You can change it any time." error={errors.accessNeedsNote}>
              <ChipGroup multiple options={ACCESS_NEEDS} value={d.accessNeeds} onChange={v => set('accessNeeds', v)} accessibilityLabel="Access needs" />
              {d.accessNeeds.includes('other') && (
                <TextInput
                  style={[styles.input, styles.note, errors.accessNeedsNote && styles.inputError]}
                  value={d.accessNeedsNote}
                  onChangeText={v => set('accessNeedsNote', v)}
                  placeholder="e.g. I use a service dog"
                  placeholderTextColor={Colors.textFaint}
                  maxLength={NOTE_MAX}
                  multiline
                  accessibilityLabel="Other access needs"
                />
              )}
            </FormSection>

            <FormSection title="How do you like to communicate?" optional>
              <ChipGroup multiple options={COMMUNICATION} value={d.communication} onChange={v => set('communication', v)} accessibilityLabel="Communication" />
            </FormSection>

            <FormSection title="I'd prefer help from">
              <LabeledRow label="Helper">
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

            <FormSection title="Your age range" hint="Same rule: only for matching, never shown." error={errors.ageBand}>
              <ChipGroup options={AGE_BANDS} value={d.ageBand} onChange={v => set('ageBand', v)} accessibilityLabel="Age range" />
            </FormSection>
          </>
        )}

        <View style={styles.preview}>
          <Text style={Type.overline}>{visitor ? 'Your helper will see' : 'Visitors will see'}</Text>
          <View style={styles.previewRow}>
            <Avatar name={d.firstName} uri={shownAvatar} size={40} />
            <Text style={Type.bodyStrong}>{d.firstName.trim() || 'Your name'}</Text>
          </View>
          <SummaryTags draft={d} />
        </View>

        <Pressable
          style={styles.consent}
          onPress={() => set('privacyAccepted', !d.privacyAccepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: d.privacyAccepted }}>
          <View style={[styles.box, d.privacyAccepted && styles.boxOn]}>
            {d.privacyAccepted && <Text style={styles.tick}>✓</Text>}
          </View>
          <Text style={[Type.body, styles.flex]}>
            I agree to how VenU uses my info, as set out in the{' '}
            <Text style={styles.link} onPress={() => router.push('/privacy')} accessibilityRole="link">
              privacy policy
            </Text>
            .
          </Text>
        </Pressable>
        {errors.privacyAccepted && <Text style={styles.error}>{errors.privacyAccepted}</Text>}

        {Object.keys(errors).some(k => k !== 'privacyAccepted') && (
          <Text style={styles.error} accessibilityLiveRegion="polite">Some answers above need a fix (marked in red).</Text>
        )}
        {saveError && <Text style={styles.error}>{saveError}</Text>}
        <Button label={submitLabel} onPress={submit} loading={saving} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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

  input: {
    ...Type.body,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.danger },
  note: { marginTop: Spacing.md, minHeight: 72, paddingTop: Spacing.md, textAlignVertical: 'top' },

  labeledRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  rowLabel: { ...Type.caption, width: 48, paddingTop: 12 },

  preview: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: Colors.surface,
  },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tick: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
  link: { color: Colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
  error: { ...Type.caption, color: Colors.danger, marginTop: Spacing.sm },
  submit: { marginTop: Spacing.xl },
});
