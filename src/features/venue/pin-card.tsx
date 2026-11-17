/**
 * The small card a tapped pin shows over the map: the facility's photo (or its category icon when
 * there's none), name, and walk and wait. Tapping it opens the facility in the sheet, where the one
 * Directions action lives; × closes it.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useLayoutRtl, useT } from '@/i18n';

import { FacilityIcon } from './categories';
import { categoryLabel, facilityMeta, facilityName } from './labels';
import type { Facility } from './types';

const PHOTO = 56;

export function PinCard({ facility, onOpen, onClose }: { facility: Facility; onOpen: () => void; onClose: () => void }) {
  const t = useT('venue');
  const tc = useT('common');
  const rtl = useLayoutRtl();
  const name = facilityName(facility, t);
  const meta = facilityMeta(facility, t);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${categoryLabel(facility.category, t)}, ${meta}`}
        accessibilityHint={t('map.cardHint')}>
        <Photo facility={facility} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        </View>
        <View style={rtl && styles.flip}>
          <FigmaIcon name="group-2-af556f" size={28} color={Colors.ink} />
        </View>
      </Pressable>
      <Pressable onPress={onClose} hitSlop={6} style={styles.close} accessibilityRole="button" accessibilityLabel={tc('actions.close')}>
        <FigmaIcon name="icon-button-c1cfb2" size={28} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** The facility's photo, or a tinted tile with its category icon (also while a photo fails). */
function Photo({ facility }: { facility: Facility }) {
  const [failed, setFailed] = useState(false);
  if (facility.photo && !failed) {
    return <Image source={{ uri: facility.photo }} style={styles.photo} contentFit="cover" onError={() => setFailed(true)} accessible={false} />;
  }
  return (
    <View style={[styles.photo, styles.placeholder]}>
      <FacilityIcon category={facility.category} size={30} color={Colors.primary} background={Colors.primarySoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    ...Shadow.float,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, paddingEnd: 0, borderRadius: Radius.md },
  pressed: { opacity: 0.7 },
  photo: { width: PHOTO, height: PHOTO, borderRadius: Radius.sm, overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, color: Colors.text },
  meta: { fontFamily: Fonts.text, fontSize: 13, lineHeight: 17, color: Colors.textMuted },
  flip: { transform: [{ scaleX: -1 }] },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});
