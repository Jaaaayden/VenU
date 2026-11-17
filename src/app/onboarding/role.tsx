import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon, type FigmaIconName } from '@/components/icons/figma-icon';
import { AppLanguagePill } from '@/components/volunteer/app-language-pill';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { OnboardingScreen, PrimaryAction } from '@/features/auth/onboarding-screen';
import { readPendingSetup, rememberPendingRole } from '@/features/auth/pending-setup';
import type { Role } from '@/features/profile/types';
import { useT } from '@/i18n';

// Text: onboarding:role.<value>Title / <value>Body.
const ROLES: { value: Role; icon: FigmaIconName }[] = [
  { value: 'visitor', icon: 'person' },
  { value: 'volunteer', icon: 'volunteer' },
];

/**
 * Visitor or volunteer, since the two get different questions. Usually answered on the first
 * screen (/welcome) already, which skips this; it's asked here when that choice isn't on this
 * device (e.g. signed in from a link), and when Back on the languages step comes here to switch
 * (`?change=1`, the earlier choice ticked).
 */
export default function RoleStep() {
  const { change } = useLocalSearchParams<{ change?: string }>();
  const switching = change === '1';
  const [role, setRole] = useState<Role | null>(null);
  // undefined while reading; null when the first screen's choice isn't stored.
  const [chosen, setChosen] = useState<Role | null | undefined>(undefined);
  const t = useT('onboarding');
  const tc = useT('common');

  useEffect(() => {
    let live = true;
    readPendingSetup().then(p => {
      if (!live) return;
      setChosen(p.role ?? null);
      if (p.role) setRole(r => r ?? p.role!);
    });
    return () => { live = false; };
  }, []);

  if (chosen === undefined) return null;
  if (chosen && !switching) return <Redirect href={{ pathname: '/onboarding/languages', params: { role: chosen } }} />;

  async function next() {
    if (!role) return;
    // Stored, so the languages step (and a reload there) starts with this role, not the earlier one.
    await rememberPendingRole(role);
    router.replace({ pathname: '/onboarding/languages', params: { role } });
  }

  return (
    <OnboardingScreen
      pill={<AppLanguagePill look="onboarding" />}
      title={t('role.title')}
      subtitle={t('role.subtitle')}
      actions={<PrimaryAction label={tc('actions.continue')} disabled={!role} onPress={() => void next()} />}>
      <View style={styles.cards} accessibilityRole="radiogroup">
        {ROLES.map(r => {
          const on = role === r.value;
          const title = t(`role.${r.value}Title`);
          const body = t(`role.${r.value}Body`);
          return (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && !on && styles.cardPressed]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              // react-native-web reads only aria-* for state.
              aria-checked={on}
              accessibilityLabel={`${title}. ${body}`}>
              <View style={[styles.iconTile, on && styles.iconTileOn]}>
                <FigmaIcon name={r.icon} size={26} color={on ? Colors.onPrimary : Colors.ink} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, on && styles.textOn]}>{title}</Text>
                <Text style={Type.caption}>{body}</Text>
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: Spacing.lg },
  // Same outline as the Figma text inputs: 2px gray, radius 10.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
  },
  cardOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  cardPressed: { backgroundColor: Colors.surfaceAlt },
  iconTile: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconTileOn: { backgroundColor: Colors.primary },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, color: Colors.text },
  textOn: { color: Colors.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
