/**
 * Facility categories: the header chips and each pin's icon. Icons are cut out of the Figma
 * "Icons" sheet (131:3653, one 213x88 SVG holding all eight glyphs).
 */
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { FIGMA_ICONS } from '@/components/icons/figma-icons';
import { Colors } from '@/constants/theme';

import type { FacilityCategory } from './types';

export const CATEGORIES: { value: FacilityCategory; label: string }[] = [
  { value: 'gate', label: 'Gates' },
  { value: 'restroom', label: 'Restrooms' },
  { value: 'food', label: 'Food & Drinks' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'lost_found', label: 'Lost & Found' },
  { value: 'info', label: 'Info Desk' },
  { value: 'accessible', label: 'Accessibility' },
  { value: 'parking', label: 'Parking' },
];

/** Square crops (x y size) of each glyph in the icon sheet. */
const CROPS: Record<FacilityCategory, [number, number, number]> = {
  restroom: [0, 1.5, 33],
  gate: [135.5, 1.5, 32],
  accessible: [179.5, 0, 33],
  first_aid: [0, 54.5, 33],
  lost_found: [45, 54.5, 33],
  food: [89, 53.5, 36],
  parking: [134, 54, 35],
  info: [179.5, 54.5, 34],
};

// The sheet mixes #242222 and black for the glyphs, with white details (the first-aid cross) on top:
// glyphs take `color`, details take `background` so they read on any pin.
const SHEET = FIGMA_ICONS['icons-82d19f'].replace(/(fill|stroke)="(#242222|black)"/g, '$1="currentColor"');

// One cropped copy of the sheet per (category, background), built on first use: the map and list
// draw ~26 of these, and re-running the replaces on every render was wasted work.
const cropCache = new Map<string, string>();

/** The icon sheet cropped to one glyph, with its white details painted `background`. */
export function facilityIconXml(category: FacilityCategory, background: string): string {
  const key = `${category}|${background}`;
  let xml = cropCache.get(key);
  if (!xml) {
    const [x, y, s] = CROPS[category];
    xml = SHEET.replace(/(fill|stroke)="white"/g, `$1="${background}"`).replace(/width="213" height="88" viewBox="0 0 213 88"/, `width="${s}" height="${s}" viewBox="${x} ${y} ${s} ${s}"`);
    cropCache.set(key, xml);
  }
  return xml;
}

export function FacilityIcon({ category, size = 24, color = Colors.ink, background = Colors.surface }: {
  category: FacilityCategory;
  size?: number;
  color?: string;
  /** Colour behind the icon, for its cut-out details. */
  background?: string;
}) {
  const xml = facilityIconXml(category, background);
  return (
    <View style={{ width: size, height: size }} aria-hidden>
      <SvgXml xml={xml} width={size} height={size} color={color} />
    </View>
  );
}
