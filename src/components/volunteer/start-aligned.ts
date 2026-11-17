import { Platform, type TextStyle } from 'react-native';

import { useLayoutRtl } from '@/i18n';

/**
 * Keeps a line on the layout's start edge even when it begins with a Latin name. Without it, in
 * Arabic "SoFi Stadium" or "Daniel K." lines up left by its own script while the lines around it
 * line up right. Only the alignment changes, not the text's direction, so "Daniel K." keeps its
 * period at the end. Web aligns to the physical side; native reads 'left' as start.
 * e.g. <Text style={[styles.name, useStartAligned()]}>{v.name}</Text>
 */
export function useStartAligned(): TextStyle {
  const rtl = useLayoutRtl();
  return { textAlign: Platform.OS === 'web' && rtl ? 'right' : 'left' };
}
