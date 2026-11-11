import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';

interface FormSectionProps {
  title: string;
  /** Short helper line under the title. */
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}

/** A titled block in a form, with an optional hint and an error line. */
export function FormSection({ title, hint, optional, error, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={styles.body}>{children}</View>
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

/** "STEP 1 OF 2" overline + title + subtitle, as in the mockups' setup screens. */
export function StepHeader({ step, total, title, subtitle }: { step?: number; total?: number; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      {step != null && total != null && <Text style={styles.step}>{`Step ${step} of ${total}`}</Text>}
      <Text style={Type.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.xs, marginBottom: Spacing.xl },
  title: { ...Type.bodyStrong, fontWeight: '700' },
  optional: { fontWeight: '400', color: Colors.textMuted },
  hint: Type.caption,
  body: { marginTop: Spacing.sm },
  error: { ...Type.caption, color: Colors.danger, marginTop: Spacing.xs },

  header: { gap: Spacing.xs, marginBottom: Spacing.xl },
  step: { ...Type.overline, color: Colors.accent },
  subtitle: { ...Type.body, color: Colors.textMuted },
});
