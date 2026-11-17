/** "Text venue staff" (when the venue has an event-day text line) and "Call venue staff"; nothing when no number is known. */
import { Button } from '@/components/button';
import { dial, textMessage, venueContact } from '@/features/venue/contacts';
import { useT } from '@/i18n';

export function VenueStaffButtons({ venueId }: { venueId: string }) {
  const t = useT('volunteer');
  const staff = venueContact(venueId);
  if (!staff) return null;
  const { text, phone } = staff;
  return (
    <>
      {text ? <Button label={t('emergency.textStaff')} variant="outline" size="lg" onPress={() => textMessage(text)} /> : null}
      <Button label={t('emergency.callStaff')} variant="outline" size="lg" onPress={() => dial(phone)} />
    </>
  );
}
