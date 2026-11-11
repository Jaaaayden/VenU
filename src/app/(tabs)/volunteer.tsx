import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NAV_BAR_CLEARANCE } from '@/components/tab-bar';
import { FeedbackView } from '@/components/volunteer/feedback-view';
import { IncomingRequests } from '@/components/volunteer/incoming-requests';
import { MatchView } from '@/components/volunteer/match-view';
import { RequestForm } from '@/components/volunteer/request-form';
import { SearchingView } from '@/components/volunteer/searching-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { useVolunteerRequest } from '@/features/volunteer/request-store';

/**
 * The Volunteer tab follows the visitor's request: form → searching → "Volunteer found" →
 * feedback. One route, so switching tabs and coming back lands on the current step.
 */
export default function VolunteerScreen() {
  const { profile } = useProfile();
  const state = useVolunteerRequest();
  // The tabs layout only renders tabs for a signed-in user with a profile.
  if (!profile) return null;

  const { status, request, match } = state;
  const isVolunteer = profile.role === 'volunteer';
  let body: React.ReactNode;
  if (isVolunteer) body = <IncomingRequests />;
  else if (status === 'searching' && request) body = <SearchingView request={request} />;
  else if (status === 'matched' && request && match) body = <MatchView request={request} match={match} unread={state.unread} />;
  else if (status === 'done' && match) body = <FeedbackView match={match} />;
  else body = <RequestForm visitorName={profile.firstName} defaultLanguage={profile.mainLanguage || 'en'} notice={state.notice} />;
  const bleed = !isVolunteer && status === 'matched'; // the map runs edge to edge

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        key={isVolunteer ? 'volunteer' : status} // each step starts at the top
        style={styles.scroll}
        contentContainerStyle={[styles.content, bleed && styles.bleed]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.sm, paddingBottom: NAV_BAR_CLEARANCE },
  bleed: { paddingHorizontal: 0 },
});
