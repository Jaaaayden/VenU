/** "Volunteer feedback report" (Figma 235:26589): stars, what went well, a note, Submit. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ChipGroup } from '@/components/chip-group';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { FEEDBACK_TAGS, PROBLEM_KINDS } from '@/features/volunteer/mock';
import { volunteerRequests } from '@/features/volunteer/request-store';
import type { FeedbackTag, Match, ProblemKind } from '@/features/volunteer/types';
import { friendlyError } from '@/lib/errors';

import { NoteBox } from './note-box';
import { StarRating } from './star-rating';

export function FeedbackView({ match }: { match: Match }) {
  const v = match.volunteer;
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!stars) return setError(`Tap a star to rate your help from ${v.firstName}.`);
    setBusy(true);
    setError(null);
    try {
      await volunteerRequests.submitFeedback(stars, tags, note);
    } catch (e) {
      setError(`Couldn't send your feedback. ${friendlyError(e)}`);
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.skipRow}>
        <Pressable onPress={volunteerRequests.skipFeedback} accessibilityRole="button" accessibilityLabel="Skip feedback" style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.who}>
        <Avatar name={v.firstName} uri={null} size={56} />
        <Text style={styles.name}>{v.name}</Text>
        <Text style={styles.role}>LA28 volunteer</Text>
      </View>

      <View style={styles.rate}>
        <Text style={styles.question} accessibilityRole="header">How was your help?</Text>
        <StarRating value={stars} onChange={n => { setStars(n); setError(null); }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>What went well?</Text>
        {/* Three even columns (Figma's 3 + 3); a free wrap breaks 2 + 3 + 1 on a 390pt phone. */}
        <ChipGroup multiple columns={3} options={FEEDBACK_TAGS} value={tags} onChange={setTags} accessibilityLabel="What went well?" />
      </View>

      <NoteBox value={note} onChangeText={setNote} placeholder={`e.g. ${v.firstName} found me a seat out of the sun`} />

      <View style={styles.actions}>
        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Submit" size="lg" onPress={submit} loading={busy} />
        <ReportProblem />
      </View>
    </View>
  );
}

/** "Report a problem": a short inline form (kind + what happened), sent to LA28 staff. */
function ReportProblem() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ProblemKind | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'editing' | 'sending' | 'sent'>('editing');
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!kind) return setError('Pick what went wrong.');
    setState('sending');
    setError(null);
    try {
      await volunteerRequests.reportProblem(kind, note);
      setState('sent');
    } catch (e) {
      setError(`Couldn't send the report. ${friendlyError(e)}`);
      setState('editing');
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.reportLink}>
        <Text style={styles.reportLinkText}>Report a problem</Text>
      </Pressable>
    );
  }
  if (state === 'sent') {
    return (
      <View style={styles.report} accessibilityLiveRegion="polite">
        <Text style={styles.reportTitle}>Report sent</Text>
        <Text style={Type.body}>LA28 staff will look into it today. In danger right now? Call 911.</Text>
      </View>
    );
  }
  return (
    <View style={styles.report}>
      <Text style={styles.reportTitle} accessibilityRole="header">Report a problem</Text>
      <ChipGroup options={PROBLEM_KINDS} value={kind} onChange={k => { setKind(k); setError(null); }} accessibilityLabel="What went wrong?" />
      <TextField value={note} onChangeText={setNote} multiline placeholder="What happened? (optional)" accessibilityLabel="What happened? (optional)" maxLength={1000} />
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <View style={styles.reportButtons}>
        <Button label="Not now" variant="neutral" onPress={() => setOpen(false)} style={styles.flex} />
        <Button label="Send report" variant="danger" onPress={send} loading={state === 'sending'} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Spacing.xl },
  flex: { flex: 1 },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -Spacing.xl },
  skip: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { ...Type.bodyStrong, color: Colors.primary },
  who: { alignItems: 'center', gap: 6 },
  name: { ...Type.title, marginTop: Spacing.sm },
  role: { fontFamily: Fonts.text, fontSize: 13, color: Colors.textFaint },
  rate: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  question: { ...Type.title, textAlign: 'center' },
  section: { gap: Spacing.lg },
  label: { ...Type.body },
  actions: { gap: Spacing.md, marginTop: Spacing.md },
  error: { ...Type.caption, color: Colors.danger, textAlign: 'center' },
  reportLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  reportLinkText: { ...Type.body, color: Colors.danger, textDecorationLine: 'underline' },
  report: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
  reportTitle: { ...Type.heading },
  reportButtons: { flexDirection: 'row', gap: Spacing.md },
});
