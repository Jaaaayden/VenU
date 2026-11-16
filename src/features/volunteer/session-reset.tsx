// Ties the volunteer request to the signed-in user. Mounted once inside ProfileProvider (root
// layout), so it sees every sign-out and user switch, whichever screen is showing. Also tells the
// store the user's chat language, which sent messages are tagged with.
import { useEffect } from 'react';

import { useProfile } from '@/features/profile/profile-context';
import { profileChatLanguage } from '@/features/translate/languages';
import { setWhereAmIOwner } from '@/features/venue/current';

import { volunteerRequests } from './request-store';

export function VolunteerSessionReset() {
  const { status, userId, profile } = useProfile();
  const language = profile ? profileChatLanguage(profile) : null;
  useEffect(() => {
    // 'loading' and 'error' keep the session (and the request) as it was.
    // The venue and spot belong to the account too, so the next person on this phone starts fresh.
    if (status === 'signedOut') {
      void volunteerRequests.setUser(null);
      setWhereAmIOwner(null);
    } else if (status === 'ready') {
      void volunteerRequests.setUser(userId);
      setWhereAmIOwner(userId);
    }
  }, [status, userId]);
  useEffect(() => {
    volunteerRequests.setLanguage(language);
  }, [language]);
  return null;
}
