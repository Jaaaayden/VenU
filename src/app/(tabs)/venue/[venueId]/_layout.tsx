import { Redirect, useLocalSearchParams } from 'expo-router';

import { getVenue } from '@/features/venue/mock';
import { VenueMapScreen } from '@/features/venue/venue-map-screen';

/** Map + bottom sheet; the child routes below render inside the sheet. */
export default function VenueLayout() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const venue = getVenue(venueId);
  if (!venue) return <Redirect href="/venue" />;
  // Keyed so another venue mounts a fresh screen (its own sheet height, category, map).
  return <VenueMapScreen key={venue.id} venue={venue} />;
}
