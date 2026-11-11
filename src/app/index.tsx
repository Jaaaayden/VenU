import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { homeFor } from '@/features/profile/types';
import { OFFLINE } from '@/lib/errors';

/** Entry gate: signed out → sign-in, signed in without a profile → onboarding, else the role's home tab. */
export default function Index() {
  const { status, loadError, profile, refresh, signOut } = useProfile();
  const [busy, setBusy] = useState<'retry' | 'signout' | null>(null);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status === 'error') {
    const offline = loadError === OFFLINE;
    return (
      <View style={styles.center}>
        <Text style={Type.heading} accessibilityRole="header">
          {offline ? "Can't reach VenU" : "Couldn't load your profile"}
        </Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {offline ? "Check your connection and try again. You're still signed in." : loadError}
        </Text>
        <Button
          label="Try again"
          loading={busy === 'retry'}
          onPress={() => {
            setBusy('retry');
            refresh().catch(() => {}).finally(() => setBusy(null));
          }}
        />
        {/* A way out when retrying keeps failing (e.g. a broken saved profile). */}
        <Button
          label="Sign out"
          variant="secondary"
          loading={busy === 'signout'}
          onPress={() => {
            setBusy('signout');
            signOut().catch(() => {}).finally(() => setBusy(null));
          }}
        />
      </View>
    );
  }
  return <Redirect href={profile ? homeFor(profile) : '/onboarding/role'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl, backgroundColor: Colors.bg },
  body: { ...Type.body, color: Colors.textMuted, marginBottom: Spacing.md },
});
