import { Redirect, Stack } from 'expo-router';

import { useProfile } from '@/features/profile/profile-context';
import { homeFor } from '@/features/profile/types';

export default function OnboardingLayout() {
  const { status, profile } = useProfile();
  if (status === 'loading') return null;
  // Signed out (or session ended mid-setup) / load error: let the entry gate decide.
  if (status !== 'ready') return <Redirect href="/" />;
  // Already set up: re-running onboarding could switch roles and wipe fields, so go home.
  // (This also handles the redirect right after step 2 saves.)
  if (profile) return <Redirect href={homeFor(profile)} />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
