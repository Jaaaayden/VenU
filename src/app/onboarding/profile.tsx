import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { BackLink } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { clearPendingName, readPendingSetup, type PendingSetup } from '@/features/auth/pending-setup';
import { useProfile } from '@/features/profile/profile-context';
import { ProfileForm } from '@/features/profile/profile-form';
import { emptyDraft, type Role } from '@/features/profile/types';
import { useT, useUiLanguage } from '@/i18n';
import { pickFor, setupAppLanguage, setupPrimaryLanguage } from '@/i18n/languages';
import { forgetLanguagePick } from '@/i18n/pending-language';

/** Figma onboarding__profile-setup ("Set up your profile"); volunteers get their own questions. */
export default function ProfileStep() {
  const params = useLocalSearchParams<{ role?: string }>();
  const { save, userId } = useProfile();
  const t = useT('onboarding');
  const { language: onScreen } = useUiLanguage();
  // The welcome pick and Create Account's name; null until read.
  const [pending, setPending] = useState<PendingSetup | null>(null);

  useEffect(() => {
    let live = true;
    readPendingSetup().then(p => live && setPending(p));
    return () => { live = false; };
  }, []);

  const role: Role | null = params.role === 'visitor' || params.role === 'volunteer' ? params.role : null;
  if (!role) return <Redirect href="/onboarding/role" />;
  if (!pending) return null; // one storage read; the form needs its starting values up front

  const visitor = role === 'visitor';
  // Only a welcome pick seeds setup. pending.language may also be the last account's remembered
  // language on a shared device, which isn't this person's.
  const pick = pickFor({ language: pending.language, picked: pending.languagePicked === true, pickedBy: pending.languagePickedBy }, userId);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackLink fallback="/onboarding/role" />
      <ProfileForm
        initial={{ ...emptyDraft(role, setupPrimaryLanguage(pick, onScreen)), firstName: pending.firstName ?? '' }}
        savedAvatarUrl={null}
        submitLabel={t('setup.submit')}
        // No navigation here: once the profile exists, the onboarding layout redirects to the home tab.
        onSubmit={async (draft, avatar) => {
          // A welcome pick stays the app language (whatever the primary language); without one, a
          // translated primary language becomes it, e.g. picked العربية + primary हिन्दी → Arabic.
          const appLanguage = setupAppLanguage(draft.mainLanguage, pick, onScreen);
          await save({ ...draft, appLanguage }, avatar);
          await forgetLanguagePick(); // saved with the profile; don't apply it to the account again
          await clearPendingName();
        }}
        header={
          <StepHeader
            title={visitor ? t('setup.visitorTitle') : t('setup.volunteerTitle')}
            subtitle={visitor ? t('setup.visitorSubtitle') : t('setup.volunteerSubtitle')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
});
