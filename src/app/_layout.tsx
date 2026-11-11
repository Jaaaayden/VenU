import { AlbertSans_400Regular, AlbertSans_500Medium, AlbertSans_600SemiBold, AlbertSans_700Bold } from '@expo-google-fonts/albert-sans';
import { Alexandria_400Regular, Alexandria_500Medium, Alexandria_600SemiBold } from '@expo-google-fonts/alexandria';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { WEB_COLUMN_MAX } from '@/constants/theme';
import { ProfileProvider } from '@/features/profile/profile-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Names must match Fonts in constants/theme.ts.
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_400Regular, Alexandria_500Medium, Alexandria_600SemiBold,
    AlbertSans_400Regular, AlbertSans_500Medium, AlbertSans_600SemiBold, AlbertSans_700Bold,
  });
  const ready = fontsLoaded || !!fontError; // a font that fails to load falls back to the system font

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ProfileProvider>
      {/* Web only: keep the phone layout in a centred column instead of stretching across a desktop screen. */}
      <View style={styles.backdrop}>
        <View style={styles.column}>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            {/* index decides: sign-in → onboarding (no profile yet) → (tabs) */}
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </View>
      </View>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: Platform.select({
    web: { flex: 1, backgroundColor: '#E6E8EC', alignItems: 'center' },
    default: { flex: 1 },
  }),
  column: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      maxWidth: WEB_COLUMN_MAX,
      overflow: 'hidden',
      // Hairline edges so the column reads as "the app" on a wide screen.
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: '#D5D8DE',
    },
    default: { flex: 1 },
  }),
});
