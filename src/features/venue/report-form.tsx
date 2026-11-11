/** Sheet content: "Add report" for a facility. Title and topic required; errors show inline. */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ChipGroup } from '@/components/chip-group';
import { MediaActions } from '@/components/media-actions';
import { TextField } from '@/components/text-field';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { goBack } from '@/lib/navigation';

import {
  emptyReportDraft,
  REPORT_TITLE_MAX,
  REPORT_TOPICS,
  ReportValidationError,
  submitReport,
  validateReport,
  type ReportDraft,
  type ReportErrors,
} from './reports';
import { SheetScroll, useVenueScreen } from './venue-map-screen';
import { BackArrow, InlineNote, venueText } from './ui';

export function ReportForm() {
  const { venue, facilities, setSnap } = useVenueScreen();
  const { profile } = useProfile();
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const facility = facilities.find(f => f.id === facilityId);
  const [draft, setDraft] = useState<ReportDraft>(emptyReportDraft);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [soon, setSoon] = useState<string | null>(null);

  useEffect(() => { setSnap('up'); }, [setSnap]);

  const facilityHref = { pathname: '/venue/[venueId]/[facilityId]' as const, params: { venueId: venue.id, facilityId } };

  function update(patch: Partial<ReportDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (tried) setErrors(validateReport(next)); // after the first try, errors clear as they're fixed
  }

  async function submit() {
    setTried(true);
    const found = validateReport(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const saved = await submitReport({ venueId: venue.id, facilityId, authorName: profile?.firstName ?? '', draft });
      router.dismissTo({ ...facilityHref, params: { ...facilityHref.params, submitted: saved.id } });
    } catch (e) {
      if (e instanceof ReportValidationError) setErrors(e.errors);
      else setErrors({ body: 'Couldn’t send the report. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetScroll contentContainerStyle={styles.content}>
      <BackArrow onPress={() => goBack(facilityHref)} label="Back to facility" />
      <View style={styles.heading}>
        <Text style={venueText.title} accessibilityRole="header">Add report</Text>
        <Text style={venueText.caption}>{facility ? `Share what you found at ${facility.name} to help the next visitor` : 'Share what you found to help the next visitor'}</Text>
      </View>

      <TextField
        label="Report title"
        placeholder="What should people know?"
        value={draft.title}
        onChangeText={title => update({ title })}
        maxLength={REPORT_TITLE_MAX + 20}
        error={errors.title}
        returnKeyType="next"
      />
      <TextField
        label="Your report"
        placeholder="Enter text"
        value={draft.body}
        onChangeText={body => update({ body })}
        multiline
        error={errors.body}
        hint="Optional. What happened, where, and when?"
      />

      <MediaActions
        onAddPicture={() => setSoon('Adding pictures is coming soon.')}
        onSpeak={() => setSoon('Voice reports are coming soon. Type your report for now.')}
      />
      {soon ? <InlineNote>{soon}</InlineNote> : null}

      <View style={styles.topic}>
        <Text style={Type.label}>Topic</Text>
        <ChipGroup options={REPORT_TOPICS} value={draft.topic} onChange={topic => update({ topic })} accessibilityLabel="Topic" />
        {errors.topic ? <Text style={styles.error} accessibilityLiveRegion="polite">{errors.topic}</Text> : null}
      </View>

      <Button label="Submit Report" size="lg" onPress={submit} loading={saving} style={styles.submit} />
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  heading: { gap: 8, marginTop: Spacing.sm },
  topic: { gap: 10 },
  error: { ...Type.caption, color: Colors.danger },
  submit: { marginTop: Spacing.xs },
});
