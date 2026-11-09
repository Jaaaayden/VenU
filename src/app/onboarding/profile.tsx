import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { ProfileForm } from '@/features/profile/profile-form';
import { emptyDraft, type Role } from '@/features/profile/types';

/** Step 2 of 2: the role-specific questions (mockup 01). */
export default function ProfileStep() {
  const params = useLocalSearchParams<{ role?: string; lang?: string }>();
  const { save } = useProfile();

  const role: Role | null = params.role === 'visitor' || params.role === 'volunteer' ? params.role : null;
  if (!role) return <Redirect href="/onboarding/role" />;

  const visitor = role === 'visitor';
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar back />
      <ProfileForm
        initial={emptyDraft(role, params.lang || 'en')}
        savedAvatarUrl={null}
        submitLabel="Save and continue"
        onSubmit={async (draft, avatar) => {
          await save(draft, avatar);
          router.replace(visitor ? '/venue' : '/volunteer');
        }}
        header={
          <StepHeader
            step={2}
            total={2}
            title={visitor ? 'Set up your profile' : 'Your volunteer profile'}
            subtitle={visitor ? 'So we can find the right helper for you. Change it any time.' : 'So we can send you the visitors you can help most.'}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
});
