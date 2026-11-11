/** "Find a Volunteer" (Figma 192:22809): where you are, what you need, a note, Send Request. */
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FigmaIcon } from '@/components/icons/figma-icon';
import { LanguageSearchModal } from '@/components/language-picker';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { languageName } from '@/features/profile/options';
import { HELP_TYPES, MOCK_LOCATION } from '@/features/volunteer/mock';
import type { HelpTypeId, RequestState } from '@/features/volunteer/types';
import { volunteerRequests } from '@/features/volunteer/request-store';

import { EmergencyCard } from './emergency-card';
import { HelpCard } from './help-card';
import { Hint, useHint } from './hint';
import { NoteBanner } from './note-banner';
import { NoteBox } from './note-box';

export function RequestForm({ visitorName, defaultLanguage, notice }: { visitorName: string; defaultLanguage: string; notice: RequestState['notice'] }) {
  const [helpTypes, setHelpTypes] = useState<HelpTypeId[]>([]);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [language, setLanguage] = useState(defaultLanguage);
  const [pickingLanguage, setPickingLanguage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hint, show } = useHint();

  function toggle(id: HelpTypeId) {
    setError(null);
    setHelpTypes(t => (t.includes(id) ? t.filter(x => x !== id) : [...t, id]));
  }

  async function addPicture() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return show('Photo access is off. Turn it on in Settings.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  function send() {
    if (!helpTypes.length) return setError('Pick at least one thing you need help with.');
    volunteerRequests.dismissNotice();
    // Ordered as on screen, so the volunteer sees the same list.
    const ordered = HELP_TYPES.map(h => h.id).filter(id => helpTypes.includes(id));
    void volunteerRequests.sendRequest({ visitorName, helpTypes: ordered, note: note.trim(), photoUri, language, location: MOCK_LOCATION });
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {/* Figma's small segmented control: the language you want help in. */}
        <Pressable
          onPress={() => setPickingLanguage(true)}
          accessibilityRole="button"
          accessibilityLabel={`Help in ${languageName(language)}. Change language`}
          style={({ pressed }) => [styles.langPill, pressed && styles.langPressed]}>
          <FigmaIcon name="icon-c513eb" size={18} color={Colors.ink} />
          <Text style={styles.langText} numberOfLines={1}>{languageName(language)}</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">Find a Volunteer</Text>
          <Text style={styles.subtitle}>We’ll match you with someone nearby</Text>
        </View>
      </View>

      {notice ? <NoteBanner notice={notice} onDismiss={volunteerRequests.dismissNotice} /> : null}

      <View style={styles.location} accessible accessibilityLabel={`Your location: ${MOCK_LOCATION.spot}, ${MOCK_LOCATION.venue}`}>
        <FigmaIcon name="location-on" size={36} color={Colors.ink} />
        <View style={styles.locationText}>
          <Text style={styles.spot}>{MOCK_LOCATION.spot}</Text>
          <Text style={styles.venue}>{MOCK_LOCATION.venue}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.question} accessibilityRole="header">What do you need help with?</Text>
        <View style={styles.grid}>
          {[0, 3].map(start => (
            <View key={start} style={styles.gridRow}>
              {HELP_TYPES.slice(start, start + 3).map(t => (
                <HelpCard key={t.id} type={t} selected={helpTypes.includes(t.id)} onPress={() => toggle(t.id)} />
              ))}
            </View>
          ))}
        </View>
      </View>

      <NoteBox
        value={note}
        onChangeText={setNote}
        placeholder="e.g. I'm stuck near ramp 2"
        photoUri={photoUri}
        onAddPicture={addPicture}
        onRemovePicture={() => setPhotoUri(null)}
        onSpeak={() => show('Voice notes are coming soon. Type a note for now.')}
      />
      <Hint text={hint} />

      <View style={styles.actions}>
        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Send Request" size="lg" onPress={send} style={styles.send} />
        <EmergencyCard />
      </View>

      <LanguageSearchModal
        visible={pickingLanguage}
        onSelect={code => { setLanguage(code); setPickingLanguage(false); }}
        onClose={() => setPickingLanguage(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Spacing.xl },
  header: { gap: 0 },
  titles: { gap: 5, marginTop: -8 },
  title: { ...Type.title, fontSize: 26, lineHeight: 32 },
  subtitle: { fontFamily: Fonts.text, fontSize: 14, lineHeight: 18, color: Colors.text },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    maxWidth: 160,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  langPressed: { backgroundColor: Colors.primarySoft },
  langText: { fontFamily: Fonts.text, fontSize: 14, color: Colors.text, flexShrink: 1 },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    minHeight: 62,
    paddingHorizontal: 28,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  locationText: { gap: 2 },
  spot: { ...Type.body },
  venue: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.text },
  section: { gap: Spacing.lg },
  question: { ...Type.body },
  grid: { gap: Spacing.lg },
  gridRow: { flexDirection: 'row', gap: Spacing.md },
  actions: { gap: Spacing.lg, marginTop: Spacing.md },
  send: { minHeight: 52 },
  error: { ...Type.caption, color: Colors.danger, textAlign: 'center' },
});
