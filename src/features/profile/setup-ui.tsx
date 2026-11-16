/**
 * Pieces for the Onboarding 2.0 setup steps: a titled group in a soft outlined box (Figma
 * "I'd prefer help from" / "Anything we should know?") and the "Gender [chips]" label row.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';

export function SetupGroup({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.box, error ? styles.boxError : null]}>{children}</View>
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

/** Figma "Gender  [No preference] [Male] [Female]": a label at its own width, then the chips. */
export function LabeledRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm, marginBottom: Spacing.xl },
  title: { ...Type.body },
  hint: { ...Type.caption },
  // Figma's 411x133 outline (#DFEBFD): a soft frame around the chips, filled white so they read on the gradient.
  box: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  boxError: { borderColor: Colors.danger },
  error: { ...Type.caption, color: Colors.danger },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rowLabel: { fontFamily: Fonts.display, fontSize: 14, lineHeight: 20, color: Colors.text, paddingTop: 8 },
  flex: { flex: 1 },
});
