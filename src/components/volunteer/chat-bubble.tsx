/**
 * Figma "chat-bubble" (231:25791): incoming white with a gray outline and a tail at the bottom left,
 * outgoing blue with the tail at the bottom right. The time sits beside a short message and drops
 * under a long one. Incoming bubbles carry the "listen" link (Frame 2271). In a right-to-left
 * layout the sides swap: incoming on the right with its tail at the bottom right, yours on the left.
 *
 * Translation: an incoming message in another language shows in the reader's language, with
 * "Translated from English · Show original" under it (a button that flips between the two). While it
 * translates, or if it can't, the original shows with a short note. Yours show what you typed, and
 * the last one can carry a hint such as "Daniel reads this in English".
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { uiLanguageName } from '@/features/profile/summary';
import { useMessageTranslation, type MessageTranslation } from '@/features/translate';
import { formatClock } from '@/features/volunteer/format';
import type { ChatMessage } from '@/features/volunteer/types';
import { useLayoutRtl, useT } from '@/i18n';

const TAIL = 7;
const INCOMING_EDGE = Colors.controlBorder;
const MUTED_TIME = Colors.textFaint; // Figma #7E919A is 3.3:1 on white; this is 4.5:1

/** Bubble outline with the tail on the left; `mirror` flips it for outgoing. */
function bubblePath(w: number, h: number, mirror: boolean): string {
  const r = Math.min(20, h / 2);
  const t = TAIL;
  const pts: [string, ...number[]][] = [
    ['M', t + r, 0.5],
    ['H', w - r],
    ['Q', w - 0.5, 0.5, w - 0.5, r],
    ['V', h - r],
    ['Q', w - 0.5, h - 0.5, w - r, h - 0.5],
    ['H', t + 10],
    ['C', t + 5, h - 0.5, 3, h - 0.5, 0.5, h - 1.5],
    ['C', t - 2, h - 4, t, h - 8, t, h - 14],
    ['V', r],
    ['Q', t, 0.5, t + r, 0.5],
  ];
  const isX = (cmd: string, i: number) => cmd === 'H' || (cmd !== 'V' && i % 2 === 0);
  return pts
    .map(([cmd, ...n]) => cmd + n.map((v, i) => (mirror && isX(cmd, i) ? w - v : v).toFixed(1)).join(' '))
    .join(' ') + ' Z';
}

interface Props {
  message: ChatMessage;
  /** Language the reader reads, e.g. 'es'; incoming messages in another language are translated into it. */
  reader: string;
  /** Under one of yours, e.g. "Daniel reads this in English". */
  hint?: string | null;
  onListen?: () => void;
}

export function ChatBubble({ message, reader, hint, onListen }: Props) {
  const mine = message.from === 'me';
  const t = useT('volunteer');
  const rtl = useLayoutRtl();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.round(width), h: Math.round(height) });
  };
  const time = formatClock(message.sentAt);
  const translation = useMessageTranslation(message, reader);
  const [original, setOriginal] = useState(false);
  const translated = translation.kind === 'translated' && !original ? translation : null;
  const text = translated ? translated.text : message.text;
  const source = translated?.source ? uiLanguageName(translated.source) : null;
  // Screen readers get the text on screen, then where it was translated from.
  const label = mine
    ? t('bubble.mine', { time, text })
    : source
      ? t('bubble.theirsTranslated', { time, text, language: source })
      : t('bubble.theirs', { time, text });

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View
        onLayout={onLayout}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
        accessible
        accessibilityLabel={label}>
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} aria-hidden>
            <Path
              d={bubblePath(size.w, size.h, mine !== rtl)}
              fill={mine ? Colors.primary : Colors.surface}
              stroke={mine ? Colors.primary : INCOMING_EDGE}
              strokeWidth={1}
            />
          </Svg>
        )}
        <View style={styles.content}>
          <Text style={[styles.text, mine && styles.textMine]}>{text}</Text>
          <View style={styles.meta}>
            <Text style={[styles.time, mine && styles.timeMine]}>{time}</Text>
            {mine ? <FigmaIcon name="read" size={16} color={Colors.onPrimary} /> : null}
          </View>
        </View>
      </View>
      {mine && hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {!mine ? (
        <View style={styles.footer}>
          <TranslationNote translation={translation} reader={reader} original={original} onToggle={() => setOriginal(o => !o)} />
          {onListen ? (
            <Pressable onPress={onListen} accessibilityRole="button" accessibilityLabel={t('bubble.listenLabel')} style={styles.listen}>
              <FigmaIcon name="volume" size={16} color={Colors.primary} />
              <Text style={styles.listenText}>{t('bubble.listen')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** The line under an incoming bubble: the translation toggle, or why the original is showing. */
function TranslationNote({ translation, reader, original, onToggle }: { translation: MessageTranslation; reader: string; original: boolean; onToggle: () => void }) {
  const t = useT('volunteer');
  switch (translation.kind) {
    case 'original':
      return null;
    case 'loading':
      return <Text style={styles.note}>{t('translation.translating')}</Text>;
    case 'failed':
      return <Text style={styles.note}>{t('translation.failed')}</Text>;
    case 'unsupported':
      return <Text style={styles.note}>{t('translation.unsupported', { language: uiLanguageName(reader) })}</Text>;
    case 'unavailable':
      return <Text style={styles.note}>{t('translation.localMode')}</Text>;
    case 'translated': {
      const language = translation.source ? uiLanguageName(translation.source) : null;
      const status = original
        ? language ? t('translation.originalIn', { language }) : t('translation.original')
        : language ? t('translation.translatedFrom', { language }) : t('translation.translated');
      return (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={original ? t('translation.showTranslationLabel') : t('translation.showOriginalLabel')}
          hitSlop={6}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <Text style={styles.note}>
            {status}
            {' · '}
            <Text style={styles.noteLink}>{original ? t('translation.showTranslation') : t('translation.showOriginal')}</Text>
          </Text>
        </Pressable>
      );
    }
  }
}

const styles = StyleSheet.create({
  row: { maxWidth: '88%' },
  rowTheirs: { alignSelf: 'flex-start' },
  rowMine: { alignSelf: 'flex-end' },
  bubble: { minHeight: 44 },
  // The tail sits on the start side of incoming bubbles and the end side of yours.
  bubbleTheirs: { paddingStart: TAIL + 16, paddingEnd: 16 },
  bubbleMine: { paddingStart: 16, paddingEnd: TAIL + 16 },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: 10,
    rowGap: 6,
    paddingVertical: 12,
  },
  text: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, color: Colors.text, flexShrink: 1 },
  textMine: { color: Colors.onPrimary },
  meta: { marginStart: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: MUTED_TIME },
  timeMine: { color: Colors.onPrimary },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingEnd: Spacing.sm },
  listenText: { fontFamily: Fonts.text, fontSize: 13, color: Colors.primary },
  // Starts in line with the incoming bubbles' text, like "Daniel is typing…".
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.md, paddingStart: TAIL + 2 },
  toggle: { minHeight: 32, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  note: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.textMuted },
  noteLink: { fontFamily: Fonts.textSemiBold, color: Colors.primary },
  hint: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 16, color: Colors.textMuted, alignSelf: 'flex-end', marginTop: 6, paddingEnd: TAIL + 2 },
});
