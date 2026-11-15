import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { setCurrentVenue } from '@/features/venue/current';
import { getVenue } from '@/features/venue/mock';
import { VenueMapScreen } from '@/features/venue/venue-map-screen';

/** Map + bottom sheet; the child routes below render inside the sheet. Opening a venue makes it current. */
export default function VenueLayout() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const venue = getVenue(venueId);
  useEffect(() => {
    if (venue) setCurrentVenue(venue.id);
  }, [venue]);
  if (!venue) return <Redirect href="/venue" />;
  // Keyed so another venue mounts a fresh screen (its own sheet height, category, map).
  return <VenueMapScreen key={venue.id} venue={venue} />;
}
