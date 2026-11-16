import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/chip-group';
import { TextField } from '@/components/text-field';
import { BackLink } from '@/components/top-bar';
import { AppLanguagePill } from '@/components/volunteer/app-language-pill';
import { Spacing } from '@/constants/theme';
import { OnboardingScreen, PrimaryAction } from '@/features/auth/onboarding-screen';
import { ACCESS_NEEDS, HELPER_AGE, HELPER_GENDER, labeled } from '@/features/profile/options';
import { goToNextStep, stepErrors, useSetupDraft } from '@/features/profile/setup-draft';
import { LabeledRow, SetupGroup } from '@/features/profile/setup-ui';
import { NOTE_MAX } from '@/features/profile/validate';
import { useT } from '@/i18n';

/**
 * Setup step 2 for visitors, "Volunteer preferences" (Figma 492:6216): the helper they'd prefer
 * (gender, age) and anything a helper should know (access needs). Volunteers get /onboarding/volunteer.
 */
export default function PreferencesStep() {
  const { ready, draft, update } = useSetupDraft();
  const t = useT('onboarding');
  const tp = useT('profile');
  const tc = useT('common');
  const [submitted, setSubmitted] = useState(false);

  // No draft (a web reload mid-setup) or a volunteer's draft: back to the first step.
  if (!ready) return null; // reading the answers saved before a reload
  if (!draft || draft.role !== 'visitor') return <Redirect href="/onboarding/languages" />;
  const errors = submitted ? stepErrors('preferences', draft) : {};

  function next() {
    setSubmitted(true);
    goToNextStep('preferences', draft!);
  }

  return (
    <OnboardingScreen
      pill={<AppLanguagePill look="onboarding" />}
      back={<BackLink fallback="/onboarding/languages" />}
      title={t('steps.preferencesTitle')}
      subtitle={t('steps.preferencesSubtitle')}
      actions={<PrimaryAction label={tc('actions.continue')} onPress={next} />}>
      <SetupGroup title={tp('form.helperPref')}>
        <LabeledRow label={tp('form.gender')}>
          <ChipGroup options={labeled(HELPER_GENDER, tp)} value={draft.helperGenderPref} onChange={v => update({ helperGenderPref: v })} accessibilityLabel={tp('form.helperGenderLabel')} />
        </LabeledRow>
        <LabeledRow label={tp('form.age')}>
          <ChipGroup options={labeled(HELPER_AGE, tp)} value={draft.helperAgePref} onChange={v => update({ helperAgePref: v })} accessibilityLabel={tp('form.helperAgeLabel')} />
        </LabeledRow>
      </SetupGroup>

      <SetupGroup title={tp('form.accessNeeds')} error={errors.accessNeedsNote}>
        <ChipGroup multiple options={labeled(ACCESS_NEEDS, tp)} value={draft.accessNeeds} onChange={v => update({ accessNeeds: v })} accessibilityLabel={tp('form.accessNeedsLabel')} />
        {draft.accessNeeds.includes('other') && (
          <View style={styles.note}>
            <TextField
              value={draft.accessNeedsNote}
              onChangeText={v => update({ accessNeedsNote: v })}
              placeholder={tp('form.otherNeedsPlaceholder')}
              maxLength={NOTE_MAX}
              multiline
              accessibilityLabel={tp('form.otherNeedsLabel')}
            />
          </View>
        )}
      </SetupGroup>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: Spacing.xs },
});
