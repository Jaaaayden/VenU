import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { homeFor } from '@/features/profile/types';

/** Entry gate: signed out → sign-in, signed in without a profile → onboarding, else the role's home tab. */
export default function Index() {
  const { status, profile, refresh } = useProfile();
  const [retrying, setRetrying] = useState(false);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={Type.heading}>Can&apos;t reach VenU</Text>
        <Text style={styles.body}>Check your connection and try again. You&apos;re still signed in.</Text>
        <Button
          label="Try again"
          loading={retrying}
          onPress={() => {
            setRetrying(true);
            refresh().catch(() => {}).finally(() => setRetrying(false));
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
