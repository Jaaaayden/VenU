import { Redirect, useLocalSearchParams } from 'expo-router';

/** The old one-page setup; setup is now steps (languages → preferences → photo). Kept so old links land there. */
export default function ProfileStep() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <Redirect href={role === 'visitor' || role === 'volunteer' ? { pathname: '/onboarding/languages', params: { role } } : '/onboarding/role'} />;
}
