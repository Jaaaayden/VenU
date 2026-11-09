import { Redirect, Stack } from 'expo-router';

import { useProfile } from '@/features/profile/profile-context';

export default function OnboardingLayout() {
  const { status } = useProfile();
  if (status === 'loading') return null;
  // Signed out (or session ended mid-setup) / load error: let the entry gate decide.
  if (status !== 'ready') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
