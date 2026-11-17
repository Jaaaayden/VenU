import { Redirect } from 'expo-router';

/**
 * Any unknown path (a stale link, a typo, /does-not-exist): back to the entry gate, which sends the
 * user to welcome, onboarding or their home tab. Without this, Expo Router shows its dev
 * "Unmatched Route" page.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
