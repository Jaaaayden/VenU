import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { LogoMark } from '@/components/wordmark';
import { Colors, Fonts, Spacing, Type } from '@/constants/theme';
import { SocialButtons, WelcomeLanguagePill } from '@/features/auth/auth-ui';
import { OnboardingScreen } from '@/features/auth/onboarding-screen';
import { useSignedInHref } from '@/features/auth/use-auth-form';
import { useT } from '@/i18n';

/** After the visitor/volunteer choice (Figma Onboarding 2.0, 482:31962): Create Account or Sign In. */
export default function LandingScreen() {
  const signedInHref = useSignedInHref();
  const t = useT('onboarding');
  const [socialNote, setSocialNote] = useState(false);

  if (signedInHref) return <Redirect href={signedInHref} />;

  return (
    <OnboardingScreen pill={<WelcomeLanguagePill />}>
      <View style={styles.hero}>
        <LogoMark size={100} />
        <Text style={styles.name} accessibilityRole="header">VenU</Text>
      </View>

      <View style={styles.actions}>
        <Button label={t('welcome.createAccount')} variant="secondary" onPress={() => router.push('/sign-up')} style={styles.action} />
        <Text style={styles.or}>{t('welcome.or')}</Text>
        <Button label={t('welcome.signIn')} onPress={() => router.push('/sign-in')} style={styles.action} />
      </View>

      <View style={styles.social}>
        <Text style={styles.socialTitle}>{t('welcome.socialTitle')}</Text>
        <SocialButtons onPress={() => setSocialNote(true)} />
        {socialNote && (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {t('welcome.socialSoon')}
          </Text>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 72, gap: Spacing.lg },
  name: { fontFamily: Fonts.displaySemiBold, fontSize: 25, lineHeight: 30, color: Colors.text },
  actions: { alignItems: 'center', marginTop: 72, gap: Spacing.lg },
  // Figma's 260x93 cards, a little shorter so the social row fits a 390pt screen.
  action: { width: 260, maxWidth: '100%', minHeight: 72 },
  or: { ...Type.body },
  social: { alignItems: 'center', marginTop: 48, gap: Spacing.lg },
  socialTitle: { ...Type.body, color: Colors.textFaint },
  note: { ...Type.caption, textAlign: 'center' },
});
