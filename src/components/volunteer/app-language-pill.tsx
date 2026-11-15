/**
 * The corner "🌐 English" pill, as on Choose Your Venue: switches the app now and saves it to the
 * profile through <LanguageSync /> (which retries offline), offering only translated languages.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { LanguageSearchModal } from '@/components/language-picker';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { isolatedLanguageName } from '@/features/profile/options';
import { useProfile } from '@/features/profile/profile-context';
import { UNTRANSLATED, useT, useUiLanguage } from '@/i18n';
import { choosePendingLanguage, usePendingLanguage } from '@/i18n/pending-language';
import { errorText } from '@/lib/errors';

export function AppLanguagePill() {
  const t = useT('volunteer');
  const tc = useT('common');
  // The language on screen: an untranslated profile language shows in English, an unsaved pick over the profile's.
  const { language } = useUiLanguage();
  const pending = usePendingLanguage();
  const { userId } = useProfile();
  const [picking, setPicking] = useState(false);
  const note = pending.picked && pending.saveError ? errorText(pending.saveError, tc) : null;

  function pick(code: string) {
    setPicking(false);
    // Same language again only retries a failed save; the pick belongs to this account, never the next.
    if (code !== language || pending.saveError) choosePendingLanguage(code, userId ?? undefined);
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setPicking(true)}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('home.languageLabel', { language: isolatedLanguageName(language) })}
        accessibilityHint={t('home.languageHint')}>
        <FigmaIcon name="icon-c513eb" size={20} color={Colors.ink} />
        <Text style={styles.text}>{isolatedLanguageName(language)}</Text>
      </Pressable>
      {note ? <Text style={styles.note} accessibilityLiveRegion="polite">{note}</Text> : null}

      <LanguageSearchModal
        visible={picking}
        title={t('home.languageTitle')}
        exclude={UNTRANSLATED}
        appLanguage
        onSelect={pick}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: Spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  pressed: { opacity: 0.75 },
  text: { fontFamily: Fonts.text, fontSize: 14, color: Colors.ink },
  note: { ...Type.caption, alignSelf: 'stretch' },
});
