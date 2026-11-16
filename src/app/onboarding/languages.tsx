import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { LanguagePicker } from '@/components/language-picker';
import { BackLink } from '@/components/top-bar';
import { AppLanguagePill } from '@/components/volunteer/app-language-pill';
import { Colors, Type } from '@/constants/theme';
import { OnboardingScreen, PrimaryAction } from '@/features/auth/onboarding-screen';
import { readPendingSetup, type PendingSetup } from '@/features/auth/pending-setup';
import { useProfile } from '@/features/profile/profile-context';
import { draftForRole, goToNextStep, stepErrors, useSetupDraft } from '@/features/profile/setup-draft';
import type { Role } from '@/features/profile/types';
import { useT, useUiLanguage } from '@/i18n';
import { pickFor, setupPrimaryLanguage } from '@/i18n/languages';

/**
 * Setup step 1, "Choose your languages" (Figma 482:32493 / 492:5984): primary, secondary
 * (optional), then "Add another language". Starts the setup draft with the role, the welcome
 * language pick as primary, and the name typed on Create Account.
 */
export default function LanguagesStep() {
  const params = useLocalSearchParams<{ role?: string }>();
  const { userId } = useProfile();
  const { draft, start, update } = useSetupDraft();
  const { language: onScreen } = useUiLanguage();
  const t = useT('onboarding');
  const tc = useT('common');
  const [pending, setPending] = useState<PendingSetup | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let live = true;
    readPendingSetup().then(p => live && setPending(p));
    return () => { live = false; };
  }, []);

  const paramRole: Role | null = params.role === 'visitor' || params.role === 'volunteer' ? params.role : null;
  const role = paramRole ?? pending?.role ?? null;

  // Start (or, after a different role was picked on the role step, restart) the draft.
  useEffect(() => {
    if (!pending || !role || (draft && draft.role === role)) return;
    // Only a welcome pick seeds setup: pending.language may be the last account's language on a shared device.
    const pick = pickFor({ language: pending.language, picked: pending.languagePicked === true, pickedBy: pending.languagePickedBy }, userId);
    start(draftForRole(role, draft, setupPrimaryLanguage(pick, onScreen), pending.firstName ?? ''));
  }, [pending, role, draft, start, userId, onScreen]);

  if (!pending) return null; // one storage read
  if (!role) return <Redirect href="/onboarding/role" />;
  if (!draft || draft.role !== role) return null;

  const errors = submitted ? stepErrors('languages', draft) : {};

  function next() {
    setSubmitted(true);
    goToNextStep('languages', draft!);
  }

  return (
    <OnboardingScreen
      pill={<AppLanguagePill />}
      // The screens before this one (welcome, Create Account) only redirect a signed-in user back
      // here, so Back opens the role question instead: the way to switch visitor/volunteer.
      back={<BackLink to={{ pathname: '/onboarding/role', params: { change: '1' } }} />}
      title={t('steps.languagesTitle')}
      subtitle={role === 'volunteer' ? t('steps.languagesSubtitleVolunteer') : t('steps.languagesSubtitle')}
      actions={<PrimaryAction label={tc('actions.continue')} onPress={next} />}>
      <LanguagePicker
        languages={draft.languages}
        main={draft.mainLanguage}
        // Spoken languages only: the app language belongs to the language pills.
        onChange={(languages, mainLanguage) => update({ languages, mainLanguage })}
      />
      {errors.languages ? <Text style={styles.error} accessibilityLiveRegion="polite">{errors.languages}</Text> : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  error: { ...Type.caption, color: Colors.danger, marginTop: 12 },
});
