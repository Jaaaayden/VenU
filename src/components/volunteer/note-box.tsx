/**
 * Figma "Frame 2241" (235:26768): "Add a note (optional)", the multiline box, and (with
 * `onAddPicture` / `onSpeak`) the "Add picture" and "Or hold to speak" buttons under it.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FigmaIcon } from '@/components/icons/figma-icon';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Radius, Shadow, Spacing, Type } from '@/constants/theme';

interface NoteBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  photoUri?: string | null;
  onAddPicture?: () => void;
  onRemovePicture?: () => void;
  onSpeak?: () => void;
}

export function NoteBox({ value, onChangeText, placeholder = 'Enter text', label = 'Add a note', photoUri, onAddPicture, onRemovePicture, onSpeak }: NoteBoxProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Text style={styles.label}>
          {label} <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
          maxLength={500}
          accessibilityLabel={`${label} (optional)`}
        />
      </View>

      {photoUri ? (
        <View style={styles.photoRow}>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Attached picture" />
          <Pressable onPress={onRemovePicture} style={styles.remove} accessibilityRole="button" accessibilityLabel="Remove picture">
            <Text style={styles.removeText}>Remove picture</Text>
          </Pressable>
        </View>
      ) : null}

      {onAddPicture || onSpeak ? (
        <View style={styles.actions}>
          {onAddPicture ? (
            <Pressable
              onPress={onAddPicture}
              accessibilityRole="button"
              accessibilityLabel={photoUri ? 'Change picture' : 'Add picture'}
              style={({ pressed }) => [styles.action, styles.picture, pressed && styles.picturePressed]}>
              <FigmaIcon name="add-circle" size={22} color={Colors.ink} />
              <Text style={styles.actionText}>{photoUri ? 'Change picture' : 'Add picture'}</Text>
            </Pressable>
          ) : null}
          {onSpeak ? (
            <Pressable
              onPress={onSpeak}
              accessibilityRole="button"
              accessibilityLabel="Or hold to speak"
              style={({ pressed }) => [styles.action, styles.speak, pressed && styles.speakPressed]}>
              <FigmaIcon name="icon-c230e9" size={14} color={Colors.primary} />
              <Text style={[styles.actionText, styles.speakText]}>Or hold to speak</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  field: { gap: 7 },
  label: { ...Type.body },
  optional: { color: Colors.textFaint },
  actions: { flexDirection: 'row', gap: Spacing.md },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  // Figma 2225 (195:24894) and 2224 (168:17065); Variant2 is the pressed look.
  picture: { flex: 1, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.controlBorder },
  picturePressed: Shadow.pressed,
  speak: { flex: 1.25, backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary },
  speakPressed: { backgroundColor: Colors.primarySoft },
  actionText: { fontFamily: Fonts.display, fontSize: 14, lineHeight: 18, color: Colors.ink },
  speakText: { color: Colors.primary },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  photo: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  remove: { minHeight: 44, justifyContent: 'center' },
  removeText: { ...Type.body, color: Colors.danger, textDecorationLine: 'underline' },
});
