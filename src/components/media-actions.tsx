/**
 * The "Add picture" and "Or hold to speak" buttons under a note (Figma 2225 195:24894 and
 * 2224 168:17065; Variant2 is the pressed look). Used by the volunteer request note and the venue
 * report form. Each button shows only when its handler is set. With `speakLabel`, speak is a tap
 * toggle and `listening` shows its on state (filled, a stop square, "Listening… tap to stop").
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { toggleState } from '@/features/voice/announce';
import { useT } from '@/i18n';

interface MediaActionsProps {
  onAddPicture?: () => void;
  /** Shows "Change picture" once one is attached. */
  hasPicture?: boolean;
  onSpeak?: () => void;
  /** The speak label when it isn't "Or hold to speak", e.g. "Or tap to speak". */
  speakLabel?: string;
  /** Dictation is on: the speak button turns into its stop state. */
  listening?: boolean;
}

export function MediaActions({ onAddPicture, hasPicture = false, onSpeak, speakLabel, listening = false }: MediaActionsProps) {
  const t = useT('common');
  if (!onAddPicture && !onSpeak) return null;
  const pictureLabel = hasPicture ? t('media.changePicture') : t('media.addPicture');
  const speak = listening ? t('media.listening') : speakLabel ?? t('media.holdToSpeak');
  return (
    <View style={styles.row}>
      {onAddPicture ? (
        <Pressable
          onPress={onAddPicture}
          accessibilityRole="button"
          accessibilityLabel={pictureLabel}
          style={({ pressed }) => [styles.action, styles.picture, pressed && styles.picturePressed]}>
          <FigmaIcon name="add-circle" size={22} color={Colors.ink} />
          <Text style={styles.text}>{pictureLabel}</Text>
        </Pressable>
      ) : null}
      {onSpeak ? (
        <Pressable
          onPress={onSpeak}
          accessibilityRole="button"
          accessibilityLabel={speak}
          {...toggleState(listening)}
          style={({ pressed }) => [styles.action, styles.speak, pressed && styles.speakPressed, listening && styles.listening]}>
          {listening ? <View style={styles.stop} /> : <FigmaIcon name="icon-c230e9" size={14} color={Colors.primary} />}
          <Text style={[styles.text, styles.speakText, listening && styles.listeningText]} numberOfLines={2}>{speak}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  picture: { flex: 1, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.controlBorder },
  picturePressed: Shadow.pressed,
  speak: { flex: 1.25, backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary },
  speakPressed: { backgroundColor: Colors.primarySoft },
  text: { fontFamily: Fonts.display, fontSize: 14, lineHeight: 18, color: Colors.ink },
  speakText: { color: Colors.primary, flexShrink: 1 },
  listening: { backgroundColor: Colors.primary },
  listeningText: { color: Colors.onPrimary },
  stop: { width: 12, height: 12, borderRadius: 2, backgroundColor: Colors.onPrimary },
});
