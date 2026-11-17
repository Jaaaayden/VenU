/**
 * One-off banner on the Volunteer tab: thanks after feedback, why a search failed, or for a
 * volunteer that the visitor cancelled or someone else took the request.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { volunteerDesk, type DeskNotice } from '@/features/volunteer/desk-store';
import { useT } from '@/i18n';

export function NoteBanner({ tone, text, onDismiss }: { tone: 'success' | 'error'; text: string; onDismiss: () => void }) {
  const ok = tone === 'success';
  const t = useT('volunteer');
  // Thanks fade on their own; errors stay until dismissed or the next request.
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [ok, onDismiss]);

  return (
    <View style={[styles.box, ok ? styles.ok : styles.bad]} accessibilityLiveRegion="polite" role="status">
      <Text style={[styles.text, { color: ok ? Colors.success : Colors.danger }]}>{text}</Text>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('dismiss')} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

/** A volunteer's notice: "Rosa cancelled the request.", "Someone else already took this request.", … */
export function DeskBanner({ notice }: { notice: DeskNotice }) {
  const t = useT('volunteer');
  return <NoteBanner tone={notice.tone} text={t(`desk.${notice.key}`, { name: notice.params?.name ?? '' })} onDismiss={volunteerDesk.dismissNotice} />;
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingStart: Spacing.lg },
  ok: { backgroundColor: Colors.successSoft },
  bad: { backgroundColor: Colors.dangerSoft },
  text: { ...Type.bodyStrong, flex: 1, paddingVertical: Spacing.md },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, lineHeight: 24, color: Colors.textMuted },
});
