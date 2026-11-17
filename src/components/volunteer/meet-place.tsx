/** The meet point as one line in the language on screen, e.g. "Near Entry 4 · SoFi Stadium". */
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { meetPlaceLine } from '@/features/volunteer/meet-point';
import type { MeetPoint } from '@/features/volunteer/types';
import { useT } from '@/i18n';

export function MeetPlaceText({ point, style }: { point: MeetPoint; style?: StyleProp<TextStyle> }) {
  const t = useT('volunteer');
  const tv = useT('venue');
  return <Text style={style}>{meetPlaceLine(point, tv, t)}</Text>;
}
