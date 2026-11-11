/** "Choose Your Venue": search LA28 venues, ask for a volunteer, or open a venue's map. */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { LanguageSearchModal } from '@/components/language-picker';
import { NAV_BAR_CLEARANCE } from '@/components/tab-bar';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { isolatedLanguageName } from '@/features/profile/options';
import { useProfile } from '@/features/profile/profile-context';

import { StadiumCard } from './cards';
import { searchVenues } from './mock';
import { InlineNote, SearchField, venueText } from './ui';

export function ChooseVenueScreen() {
  const { profile } = useProfile();
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const venues = searchVenues(query);
  const appLanguage = profile?.appLanguage || 'en';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => setPicking(true)}
            style={({ pressed }) => [styles.langButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Venue info language: ${isolatedLanguageName(language ?? appLanguage)}`}
            accessibilityHint="Choose a language">
            <FigmaIcon name="icon-c513eb" size={20} color={Colors.ink} />
            <Text style={styles.langText}>{isolatedLanguageName(language ?? appLanguage)}</Text>
          </Pressable>
        </View>
        {language && language !== appLanguage ? (
          <InlineNote>{`Venue info in ${isolatedLanguageName(language)} is coming soon. Volunteers can help in your language now.`}</InlineNote>
        ) : null}

        <View style={styles.titles}>
          <Text style={venueText.title} accessibilityRole="header">Choose Your Venue</Text>
          <Text style={venueText.caption}>Pick where you want to see map and facilities</Text>
        </View>

        <SearchField value={query} onChangeText={setQuery} placeholder="Search" accessibilityLabel="Search venues" />

        <Pressable
          onPress={() => router.replace('/volunteer')}
          style={({ pressed }) => [styles.assist, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Need Assistance? Connect with a volunteer">
          <FigmaIcon name="volunteer" size={50} color={Colors.primary} />
          <View style={styles.assistText}>
            <Text style={venueText.label}>Need Assistance?</Text>
            <Text style={venueText.caption}>Connect with a volunteer</Text>
          </View>
          <FigmaIcon name="group-2-7ecb6b" size={34} color={Colors.primary} />
        </Pressable>

        <View style={styles.list}>
          {venues.map(v => (
            <StadiumCard
              key={v.id}
              venue={v}
              onPress={() => router.push({ pathname: '/venue/[venueId]', params: { venueId: v.id } })}
            />
          ))}
          {!venues.length ? <Text style={styles.empty}>{`No venue matches “${query.trim()}”. Try a city, like Inglewood.`}</Text> : null}
        </View>
      </ScrollView>

      <LanguageSearchModal
        visible={picking}
        onSelect={code => { setLanguage(code); setPicking(false); }}
        onClose={() => setPicking(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.md, paddingBottom: NAV_BAR_CLEARANCE, gap: Spacing.lg },
  pressed: { opacity: 0.75 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -Spacing.sm },
  langButton: {
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
  langText: { fontFamily: Fonts.text, fontSize: 14, color: Colors.ink },
  titles: { gap: 6 },
  assist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 73,
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    marginBottom: Spacing.md,
  },
  assistText: { flex: 1, gap: 2 },
  list: { gap: 24 },
  empty: { ...venueText.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg },
});
