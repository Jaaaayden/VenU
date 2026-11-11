/** Sheet content: one facility report in full ("Gate 2 Ramp Outdated", by Rosa W.). */
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';

import { formatReportDate, topicLabel, useReport } from './reports';
import { SheetScroll, useVenueScreen } from './venue-map-screen';
import { BackArrow, TagRow, venueText } from './ui';

export function ReportDetail() {
  const { venue, setSnap } = useVenueScreen();
  const { facilityId, reportId } = useLocalSearchParams<{ facilityId: string; reportId: string }>();
  const report = useReport(reportId);

  useEffect(() => { setSnap('up'); }, [setSnap]);

  const back = () => goBack({ pathname: '/venue/[venueId]/[facilityId]', params: { venueId: venue.id, facilityId } });

  return (
    <SheetScroll contentContainerStyle={styles.content}>
      <BackArrow onPress={back} label="Back to facility" />
      {report === undefined ? null : report === null ? (
        <Text style={venueText.title}>Report not found</Text>
      ) : (
        <>
          <View style={styles.heading}>
            <Text style={venueText.title} accessibilityRole="header">{report.title}</Text>
            <Text style={styles.kind}>Report</Text>
          </View>
          <TagRow tags={[{ label: topicLabel(report.topic), tone: report.topic === 'accessibility' ? 'good' : 'note' }]} />
          <View style={styles.author}>
            <Avatar name={report.authorName} uri={null} size={44} />
            <View style={styles.authorText}>
              <Text style={venueText.label}>{report.authorName}</Text>
              <Text style={venueText.caption}>{`Submitted ${formatReportDate(report.createdAt)}`}</Text>
            </View>
          </View>
          {report.body ? <Text style={styles.body}>{report.body}</Text> : <Text style={styles.noBody}>No details added.</Text>}
        </>
      )}
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg },
  heading: { gap: 8, marginTop: Spacing.sm },
  kind: { fontFamily: Fonts.displayMedium, fontSize: 15, lineHeight: 20, color: Colors.text },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginHorizontal: Spacing.sm,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  authorText: { gap: 4 },
  body: { fontFamily: Fonts.text, fontSize: 15, lineHeight: 21, color: Colors.text, marginHorizontal: Spacing.sm },
  noBody: { ...venueText.caption, color: Colors.textMuted, marginHorizontal: Spacing.sm },
});
