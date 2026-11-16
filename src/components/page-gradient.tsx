/**
 * The Figma page background (Find a Volunteer 492:8829, Onboarding 2.0): cream at the top fading
 * to light blue at the bottom. Fills its parent behind the content, e.g.
 * <SafeAreaView style={{ flex: 1 }}><PageGradient /><ScrollView>…</ScrollView></SafeAreaView>
 */
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export function PageGradient() {
  // Each gradient needs a page-unique id on web, where every SVG shares one id namespace.
  const id = `page-gradient-${useId().replace(/:/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
        <Defs>
          <LinearGradient id={id} x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor={Colors.gradientTop} />
            <Stop offset={0.66} stopColor={Colors.gradientMid} />
            <Stop offset={0.91} stopColor={Colors.gradientBottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
