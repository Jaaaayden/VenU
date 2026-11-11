/** A volunteer's Volunteer tab until matching is live: example requests nearby. */
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';
import { languageName } from '@/features/profile/options';
import { formatDistance } from '@/features/volunteer/format';
import { HELP_TYPES, MOCK_INCOMING } from '@/features/volunteer/mock';

import { HelpIcon } from './help-icon';
import { Hint, useHint } from './hint';

export function IncomingRequests() {
  const { hint, show } = useHint();
  return (
    <View style={styles.page}>
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">Incoming requests</Text>
        <Text style={styles.subtitle}>Visitors near you who asked for help</Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewText}>Preview: matching isn’t live yet, so these are examples.</Text>
      </View>
      <Hint text={hint} />

      {MOCK_INCOMING.map(r => {
        const label = HELP_TYPES.find(h => h.id === r.helpType)?.label ?? 'Help';
        return (
          <View key={r.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.iconTile}>
                <HelpIcon type={r.helpType} size={28} color={Colors.primary} />
              </View>
              <View style={styles.text}>
                <Text style={Type.bodyStrong}>{label} · {r.visitorName}</Text>
                <Text style={styles.where}>{r.spot} · {r.venue}</Text>
                <Text style={styles.meta}>
                  {formatDistance(r.distanceFeet)} away · {r.minutesAgo} min ago · {languageName(r.language)}
                </Text>
              </View>
            </View>
            <Button label="Accept" variant="outline" onPress={() => show('Accepting requests opens when matching goes live.')} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Spacing.lg },
  titles: { gap: 5, paddingTop: 18, marginBottom: Spacing.sm },
  title: { ...Type.title, fontSize: 26, lineHeight: 32 },
  subtitle: { fontFamily: Fonts.text, fontSize: 14, lineHeight: 18, color: Colors.text },
  preview: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  previewText: { ...Type.caption, color: Colors.text },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceAlt,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  top: { flexDirection: 'row', gap: Spacing.md },
  iconTile: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  where: { ...Type.caption, color: Colors.text },
  meta: { ...Type.caption },
});
