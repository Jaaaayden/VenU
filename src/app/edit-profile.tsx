import { Redirect, router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '@/components/form-section';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { ProfileForm } from '@/features/profile/profile-form';
import { draftFromProfile } from '@/features/profile/types';

export default function EditProfileScreen() {
  const { status, profile, avatarUrl, save } = useProfile();
  if (status === 'loading') return null; // e.g. a web reload straight onto /edit-profile
  if (!profile) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar back backLabel="Profile" />
      <ProfileForm
        initial={draftFromProfile(profile)}
        savedAvatarUrl={avatarUrl}
        submitLabel="Save changes"
        onSubmit={async (draft, avatar) => {
          await save(draft, avatar);
          router.back();
        }}
        header={<StepHeader title="Edit profile" subtitle="Changes apply to your next help request." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
});
