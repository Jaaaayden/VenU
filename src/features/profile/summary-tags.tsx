import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';
import { useT } from '@/i18n';

import { helperSummary } from './summary';

/**
 * The tags the other side of a help request sees, e.g. [Speaks Spanish, English] [Wheelchair user].
 * Used by both the setup preview and the Profile tab so the two can't drift apart.
 */
export function SummaryTags({ draft }: { draft: Parameters<typeof helperSummary>[0] }) {
  const t = useT('profile'); // re-renders on a language switch even when the profile doesn't change
  return (
    <View style={styles.tags}>
      {helperSummary(draft, t).map(tag => (
        <Text key={tag} style={styles.tag}>{tag}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    ...Type.caption,
    color: Colors.text,
    backgroundColor: Colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
});
