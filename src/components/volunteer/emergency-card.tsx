/** The pink "Emergency? Call 911 now" card; opens the phone dialer. */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';

export function EmergencyCard() {
  const t = useT('volunteer');
  return (
    <Pressable
      onPress={() => Linking.openURL('tel:911').catch(() => {})}
      accessibilityRole="button"
      accessibilityLabel={t('emergency.label')}
      accessibilityHint={t('emergency.hint')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <FigmaIcon name="alert-triangle" size={44} color={Colors.danger} />
      <View style={styles.text}>
        <Text style={styles.title}>{t('emergency.title')}</Text>
        <Text style={styles.sub}>{t('emergency.call')}</Text>
      </View>
      <FigmaIcon name="group-2-77b14c" size={36} color={Colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingLeft: Spacing.gutter,
    paddingRight: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.emergencySoft,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.displayMedium, fontSize: 16, lineHeight: 20, color: Colors.danger },
  sub: { fontFamily: Fonts.text, fontSize: 14, lineHeight: 18, color: Colors.danger },
});
