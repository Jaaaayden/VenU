import { Redirect } from 'expo-router';
import { useState } from 'react';

import { ChipGroup } from '@/components/chip-group';
import { BackLink } from '@/components/top-bar';
import { AppLanguagePill } from '@/components/volunteer/app-language-pill';
import { OnboardingScreen, PrimaryAction } from '@/features/auth/onboarding-screen';
import { AGE_BANDS, GENDERS, labeled, TRAININGS } from '@/features/profile/options';
import { goToNextStep, stepErrors, useSetupDraft } from '@/features/profile/setup-draft';
import { SetupGroup } from '@/features/profile/setup-ui';
import { useT } from '@/i18n';

/**
 * Setup step 2 for volunteers (no Figma frame yet; styled like "Volunteer preferences"): training,
 * and their own gender and age range, which visitors' "I'd prefer help from" choices match against.
 */
export default function VolunteerStep() {
  const { draft, update } = useSetupDraft();
  const t = useT('onboarding');
  const tp = useT('profile');
  const tc = useT('common');
  const [submitted, setSubmitted] = useState(false);

  if (!draft || draft.role !== 'volunteer') return <Redirect href="/onboarding/languages" />;
  const errors = submitted ? stepErrors('volunteer', draft) : {};

  function next() {
    setSubmitted(true);
    goToNextStep('volunteer', draft!);
  }

  return (
    <OnboardingScreen
      pill={<AppLanguagePill />}
      back={<BackLink fallback="/onboarding/languages" />}
      title={t('setup.volunteerTitle')}
      subtitle={t('setup.volunteerSubtitle')}
      actions={<PrimaryAction label={tc('actions.continue')} onPress={next} />}>
      <SetupGroup title={tp('form.training')} hint={tp('form.trainingHint')}>
        <ChipGroup multiple options={labeled(TRAININGS, tp)} value={draft.trainings} onChange={v => update({ trainings: v })} accessibilityLabel={tp('form.training')} />
      </SetupGroup>
      <SetupGroup title={tp('form.yourGender')} hint={tp('form.yourGenderHint')} error={errors.gender}>
        <ChipGroup options={labeled(GENDERS, tp)} value={draft.gender} onChange={v => update({ gender: v })} accessibilityLabel={tp('form.yourGender')} />
      </SetupGroup>
      <SetupGroup title={tp('form.yourAge')} hint={tp('form.yourAgeHint')} error={errors.ageBand}>
        <ChipGroup options={labeled(AGE_BANDS, tp)} value={draft.ageBand} onChange={v => update({ ageBand: v })} accessibilityLabel={tp('form.yourAge')} />
      </SetupGroup>
    </OnboardingScreen>
  );
}
