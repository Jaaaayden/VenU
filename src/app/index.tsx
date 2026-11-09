import { Redirect } from 'expo-router';

import { useProfile } from '@/features/profile/profile-context';

/** Entry gate: signed out → sign-in, signed in without a profile → onboarding, else the app. */
export default function Index() {
  const { status, profile } = useProfile();
  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  return <Redirect href={profile ? '/venue' : '/onboarding/role'} />;
}
