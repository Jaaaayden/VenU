/**
 * The map strip on "Volunteer found". Figma has a placeholder image here; this draws a simple
 * stylized corner of the stadium: the bowl, the concourse, Gate 2, you, and the volunteer's route.
 */
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Colors, Fonts } from '@/constants/theme';

const H = 200;
const GRASS = Colors.successSoft;
const BOWL = Colors.border;
const CONCOURSE = Colors.surface;
const LINE = Colors.controlBorder;

export function MeetMap({ volunteerName, distanceLabel }: { volunteerName: string; distanceLabel: string }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));

  // You stand at the ramp near the left; the volunteer walks in along the concourse from the right.
  const you = { x: w * 0.26, y: H * 0.64 };
  const vol = { x: w * 0.8, y: H * 0.36 };
  const route = `M${vol.x} ${vol.y} C${w * 0.62} ${H * 0.3} ${w * 0.5} ${H * 0.72} ${you.x + 14} ${you.y}`;

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      role="img"
      aria-label={`Map: ${volunteerName} is ${distanceLabel} away, walking to you at Gate 2.`}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Rect x={0} y={0} width={w} height={H} fill={Colors.surfaceAlt} />
          {/* Stadium bowl, seen from above, cut by the strip */}
          <Circle cx={w * 0.58} cy={-H * 0.95} r={H * 1.55} fill={BOWL} stroke={LINE} strokeWidth={1.5} />
          <Circle cx={w * 0.58} cy={-H * 0.95} r={H * 1.3} fill={GRASS} stroke={LINE} strokeWidth={1} />
          {/* Concourse ring */}
          <Path
            d={`M-10 ${H * 0.55} Q${w * 0.55} ${H * 0.98} ${w + 10} ${H * 0.45}`}
            stroke={CONCOURSE}
            strokeWidth={34}
            fill="none"
          />
          <Path d={`M-10 ${H * 0.55} Q${w * 0.55} ${H * 0.98} ${w + 10} ${H * 0.45}`} stroke={LINE} strokeWidth={1} fill="none" strokeDasharray="6 6" />
          {/* Gate 2 */}
          <G>
            <Rect x={w * 0.1} y={H * 0.78} width={64} height={24} rx={6} fill={Colors.ink} />
            <SvgText x={w * 0.1 + 32} y={H * 0.78 + 16} fontSize={12} fontFamily={Fonts.textBold} fill={Colors.onPrimary} textAnchor="middle">
              Gate 2
            </SvgText>
          </G>
          {/* Route */}
          <Path d={route} stroke={Colors.primary} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
          {/* Volunteer */}
          <Circle cx={vol.x} cy={vol.y} r={17} fill={Colors.success} stroke={Colors.surface} strokeWidth={3} />
          <SvgText x={vol.x} y={vol.y + 5} fontSize={14} fontFamily={Fonts.textBold} fill={Colors.onPrimary} textAnchor="middle">
            {volunteerName.charAt(0)}
          </SvgText>
          <Rect x={vol.x - 34} y={vol.y + 22} width={68} height={20} rx={10} fill={Colors.surface} />
          <SvgText x={vol.x} y={vol.y + 36} fontSize={12} fontFamily={Fonts.textSemiBold} fill={Colors.text} textAnchor="middle">
            {volunteerName.split(' ')[0]}
          </SvgText>
          {/* You */}
          <Circle cx={you.x} cy={you.y} r={22} fill={Colors.primary} opacity={0.18} />
          <Circle cx={you.x} cy={you.y} r={10} fill={Colors.primary} stroke={Colors.surface} strokeWidth={3} />
          <Rect x={you.x - 20} y={you.y - 44} width={40} height={20} rx={10} fill={Colors.surface} />
          <SvgText x={you.x} y={you.y - 30} fontSize={12} fontFamily={Fonts.textSemiBold} fill={Colors.primary} textAnchor="middle">
            You
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: H, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.surfaceAlt },
});
