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
