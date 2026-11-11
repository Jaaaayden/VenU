/** "2:00pm", as in the Figma chat bubbles. Device-locale formats vary too much across platforms. */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m}${h < 12 ? 'am' : 'pm'}`;
}

/** "180 ft", "0.3 mi". */
export function formatDistance(feet: number): string {
  return feet < 1000 ? `${Math.round(feet / 10) * 10} ft` : `${(feet / 5280).toFixed(1)} mi`;
}

/** Messages further apart than this get a day/time line between them. */
export const SEPARATOR_GAP_MS = 10 * 60 * 1000;

/** True when `next` came more than 10 minutes after `prev`. */
export function needsSeparator(prevSentAt: number, nextSentAt: number): boolean {
  return nextSentAt - prevSentAt > SEPARATOR_GAP_MS;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today 2:14pm", "Yesterday 9:05am", "Mon, Jul 14 2:14pm": the chat's day/time separator. */
export function formatDayTime(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const startOfDay = (t: number) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${day} ${formatClock(ms)}`;
}
