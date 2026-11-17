/**
 * "Find a Volunteer" (Figma 192:22809): where you are, what you need, a note, Send Request.
 * Where you are = the current venue and spot (features/venue/current); tap it to pick the spot.
 */
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FigmaIcon } from '@/components/icons/figma-icon';
import { LanguageSearchModal } from '@/components/language-picker';
import { AppLanguagePill } from '@/components/volunteer/app-language-pill';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { isolatedLanguageName, languageName } from '@/features/profile/options';
import { useWhereAmI } from '@/features/venue/current';
import { meetPointFrom, meetSpotLabel, meetVenueName } from '@/features/volunteer/meet-point';
import { HELP_TYPES } from '@/features/volunteer/mock';
import { EMPTY_DRAFT, volunteerRequests } from '@/features/volunteer/request-store';
import type { HelpTypeId, RequestDraft, RequestState } from '@/features/volunteer/types';
import { useDictation } from '@/features/voice/use-dictation';
import { useLayoutRtl, useT } from '@/i18n';

import { EmergencyCard } from './emergency-card';
import { HelpCard } from './help-card';
import { Hint, useHint } from './hint';
import { LocationPicker } from './location-picker';
import { NoteBanner } from './note-banner';
import { NoteBox } from './note-box';

/** NoteBox's maxLength; dictation can run past it, so it's cut here too. */
const NOTE_MAX = 500;

interface RequestFormProps {
  visitorName: string;
  defaultLanguage: string;
  notice: RequestState['notice'];
  /** The fields as last filled in (kept in the store, so a failed search or a cancel keeps them). */
  draft: RequestDraft | null;
}

export function RequestForm({ visitorName, defaultLanguage, notice, draft }: RequestFormProps) {
  const { helpTypes, note, photoUri } = draft ?? EMPTY_DRAFT;
  const language = draft?.language ?? defaultLanguage;
  const edit = volunteerRequests.editDraft;
  const [pickingLanguage, setPickingLanguage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hint, show } = useHint();
  const t = useT('volunteer');
  const tc = useT('common');
  const tv = useT('venue');
  const rtl = useLayoutRtl();
  const [pickingSpot, setPickingSpot] = useState(false);
  const location = meetPointFrom(useWhereAmI());
  const spot = meetSpotLabel(location, tv, t);
  const venueName = meetVenueName(location);
  // Tap to dictate into the note (added after what's typed); tap again to stop. Interim words show
  // from liveText; the saved draft only changes when they settle.
  const dictation = useDictation({ onCommit: text => edit({ note: text.slice(0, NOTE_MAX) }), onNote: show });
  const [finishing, setFinishing] = useState(false);

  function toggle(id: HelpTypeId) {
    setError(null);
    edit({ helpTypes: helpTypes.includes(id) ? helpTypes.filter(x => x !== id) : [...helpTypes, id] });
  }

  async function addPicture() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return show(t('form.photoOff'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets[0]) edit({ photoUri: result.assets[0].uri });
  }

  async function send() {
    if (!helpTypes.length) return setError(t('form.pickOne'));
    if (finishing) return;
    let text = note;
    if (dictation.listening) {
      // Let the recogniser finish the last words (a few seconds at most) so they're sent too.
      setFinishing(true);
      text = ((await dictation.complete()) ?? note).slice(0, NOTE_MAX);
      setFinishing(false);
    }
    volunteerRequests.dismissNotice();
    // Ordered as on screen, so the volunteer sees the same list.
    const ordered = HELP_TYPES.filter(id => helpTypes.includes(id));
    void volunteerRequests.sendRequest({ visitorName, helpTypes: ordered, note: text.trim(), photoUri, language, location });
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {/* The app language, as on every tab. The help language is its own control below. */}
        <View style={styles.appLang}>
          <AppLanguagePill />
        </View>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">{t('form.title')}</Text>
          <Text style={styles.subtitle}>{t('form.subtitle')}</Text>
          {/* The language you want help in, sent with the request; starts as your main language. */}
          <Pressable
            onPress={() => setPickingLanguage(true)}
            accessibilityRole="button"
            accessibilityLabel={t('form.languageLabel', { language: isolatedLanguageName(language) })}
            style={({ pressed }) => [styles.langPill, pressed && styles.langPressed]}>
            <FigmaIcon name="icon-c513eb" size={16} color={Colors.primary} />
            <Text style={styles.langText} numberOfLines={1}>{t('helpIn', { language: languageName(language) })}</Text>
          </Pressable>
        </View>
      </View>

      {notice ? <NoteBanner notice={notice} onDismiss={volunteerRequests.dismissNotice} /> : null}

      <Pressable
        onPress={() => setPickingSpot(true)}
        accessibilityRole="button"
        accessibilityLabel={spot ? t('form.locationLabel', { spot, venue: venueName }) : t('form.locationUnset', { venue: venueName })}
        accessibilityHint={t('form.locationHint', { venue: venueName })}
        style={({ pressed }) => [styles.location, !spot && styles.locationUnset, pressed && styles.locationPressed]}>
        <FigmaIcon name="location-on" size={36} color={spot ? Colors.ink : Colors.primary} />
        {/* Lines start on the layout's start edge even when they begin with a Latin name ("Intuit Dome"). */}
        <View style={styles.locationText}>
          <Text style={[styles.spot, rtl ? styles.rtlText : styles.ltrText]}>{spot ?? t('form.whereAreYou')}</Text>
          <Text style={[styles.venue, rtl ? styles.rtlText : styles.ltrText]}>{spot ? venueName : `${venueName} · ${t('form.tapToChoose')}`}</Text>
        </View>
        {/* Points to the end edge: left in right-to-left languages. */}
        <View style={rtl && styles.flip}>
          <FigmaIcon name="group-2-af556f" size={28} color={Colors.ink} />
        </View>
      </Pressable>

      {/* Figma 492:8829 groups the question and the grid on a tinted panel. */}
      <View style={styles.panel}>
        <Text style={styles.question} accessibilityRole="header">{t('form.question')}</Text>
        <View style={styles.grid}>
          {[0, 3].map(start => (
            <View key={start} style={styles.gridRow}>
              {HELP_TYPES.slice(start, start + 3).map(id => (
                <HelpCard key={id} type={id} selected={helpTypes.includes(id)} onPress={() => toggle(id)} />
              ))}
            </View>
          ))}
        </View>
      </View>

      <NoteBox
        value={dictation.liveText?.slice(0, NOTE_MAX) ?? note}
        onChangeText={text => { edit({ note: text }); dictation.edit(text); }}
        placeholder={t('form.notePlaceholder')}
        photoUri={photoUri}
        onAddPicture={addPicture}
        onRemovePicture={() => edit({ photoUri: null })}
        onSpeak={() => dictation.toggle(note)}
        speakLabel={tc('media.tapToSpeak')}
        listening={dictation.listening}
      />
      <Hint text={hint} />

      <View style={styles.actions}>
        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label={t('form.send')} size="lg" onPress={() => void send()} loading={finishing} style={styles.send} />
        <EmergencyCard />
      </View>

      <LocationPicker visible={pickingSpot} onClose={() => setPickingSpot(false)} />

      <LanguageSearchModal
        visible={pickingLanguage}
        onSelect={code => { edit({ language: code }); setPickingLanguage(false); }}
        onClose={() => setPickingLanguage(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Spacing.xl },
  header: { gap: 0 },
  titles: { gap: 5, marginTop: -8 },
  title: { ...Type.title, fontFamily: Fonts.displaySemiBold, fontSize: 25, lineHeight: 30 },
  subtitle: { fontFamily: Fonts.text, fontSize: 14, lineHeight: 18, color: Colors.text },
  appLang: { alignSelf: 'flex-end' },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
  },
  langPressed: { opacity: 0.7 },
  langText: { fontFamily: Fonts.text, fontSize: 14, color: Colors.primary, flexShrink: 1 },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    minHeight: 62,
    paddingStart: 28,
    paddingEnd: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.surface,
  },
  // No spot yet: a dashed blue outline asks for a tap.
  locationUnset: { borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  locationPressed: { backgroundColor: Colors.primarySoft },
  locationText: { flex: 1, gap: 2 },
  flip: { transform: [{ scaleX: -1 }] },
  rtlText: { writingDirection: 'rtl' },
  ltrText: { writingDirection: 'ltr' },
  spot: { ...Type.body },
  venue: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.text },
  panel: {
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.controlBorder,
    backgroundColor: Colors.primarySoft,
  },
  question: { ...Type.body },
  grid: { gap: Spacing.md },
  gridRow: { flexDirection: 'row', gap: Spacing.md },
  actions: { gap: Spacing.lg, marginTop: Spacing.md },
  send: { minHeight: 52 },
  error: { ...Type.caption, color: Colors.danger, textAlign: 'center' },
});
