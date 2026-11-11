/** Sheet content: one facility (name, distance and wait, tags, Directions) and its reports. */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';

import { facilityMeta, Notification, ReportCard } from './cards';
import { useFacilityReports } from './reports';
import { SheetScroll, useVenueScreen } from './venue-map-screen';
import { BackArrow, InlineNote, TagRow, venueText } from './ui';

export function FacilityDetail() {
  const { venue, facilities, snap, setSnap } = useVenueScreen();
  const { facilityId, submitted } = useLocalSearchParams<{ facilityId: string; submitted?: string }>();
  const facility = facilities.find(f => f.id === facilityId);
  const reports = useFacilityReports(venue.id, facilityId);
  const [directions, setDirections] = useState(false);

  // A deep link or a tap on a pin while the sheet is lowered: bring the card into view.
  useEffect(() => {
    if (snap === 'down') setSnap('mid');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const back = () => goBack({ pathname: '/venue/[venueId]', params: { venueId: venue.id } });

  if (!facility) {
    return (
      <SheetScroll contentContainerStyle={styles.content}>
        <BackArrow onPress={back} label="Back to facilities" />
        <Text style={venueText.title}>Facility not found</Text>
      </SheetScroll>
    );
  }

  const addReport = () => {
    setSnap('up');
    router.push({ pathname: '/venue/[venueId]/[facilityId]/reports/new', params: { venueId: venue.id, facilityId: facility.id } });
  };

  return (
    <View style={styles.flex}>
      <SheetScroll contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <BackArrow onPress={back} label="Back to facilities" />
          {facility.accessible ? (
            <View style={styles.accessBadge} accessibilityRole="image" accessibilityLabel="Wheelchair accessible">
              <FigmaIcon name="wheelchair-6dc801" size={38} color={Colors.onPrimary} />
            </View>
          ) : null}
        </View>

        <View style={styles.heading}>
          <Text style={venueText.title} accessibilityRole="header">{facility.name}</Text>
          <Text style={venueText.caption}>{facility.description}</Text>
          <View style={styles.meta}>
            <FigmaIcon name="clock" size={16} color={Colors.textMuted} />
            <Text style={styles.metaText}>{`${facilityMeta(facility)} · ${facility.location}`}</Text>
          </View>
        </View>

        <TagRow tags={facility.tags} />

        <View style={styles.directions}>
          <Button
            label="Directions"
            variant="dark"
            size="lg"
            icon={<FigmaIcon name="icon-28465a" size={24} color={Colors.onPrimary} />}
            onPress={() => setDirections(true)}
            style={styles.directionsButton}
          />
          {directions ? <InlineNote>{`Step-by-step directions are coming soon. ${facility.name}: ${facility.location}.`}</InlineNote> : null}
        </View>

        <View style={styles.reportsHead}>
          <Text style={venueText.title} accessibilityRole="header">Reports</Text>
          <Text style={venueText.caption}>{reports ? `${reports.length} ${reports.length === 1 ? 'result' : 'results'}` : ''}</Text>
        </View>
        <View style={styles.reports}>
          {reports?.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              fresh={r.id === submitted}
              onPress={() => {
                setSnap('up');
                router.push({ pathname: '/venue/[venueId]/[facilityId]/reports/[reportId]', params: { venueId: venue.id, facilityId: facility.id, reportId: r.id } });
              }}
            />
          ))}
          {reports && !reports.length ? <Text style={styles.empty}>No reports yet. Be the first to share what you found.</Text> : null}
          <Button
            label="Add Your Own Report"
            variant="neutral"
            icon={<FigmaIcon name="add-circle" size={24} color={Colors.ink} />}
            onPress={addReport}
            style={styles.addButton}
          />
        </View>
      </SheetScroll>

      {submitted ? (
        <View style={styles.toastWrap} pointerEvents="box-none">
          <Notification
            title="Report Submitted"
            body="Thank you for submitting a facility report."
            actionLabel="Submit another report"
            onAction={addReport}
            onClose={() => router.setParams({ submitted: undefined })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accessBadge: { width: 88, height: 49, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 6, marginTop: -4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { ...venueText.caption, color: Colors.textMuted, flex: 1 },
  directions: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  directionsButton: { minWidth: 202, minHeight: 60, borderRadius: Radius.sm },
  reportsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  reports: { gap: 20 },
  empty: { ...venueText.caption, color: Colors.textMuted },
  addButton: { marginHorizontal: Spacing.xl, borderRadius: Radius.sm },
  toastWrap: { position: 'absolute', top: 0, left: Spacing.gutter, right: Spacing.gutter },
});
