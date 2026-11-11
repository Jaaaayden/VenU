/**
 * Figma "Frame 2241" (235:26768): "Add a note (optional)", the multiline box, and (with
 * `onAddPicture` / `onSpeak`) the "Add picture" and "Or hold to speak" buttons under it.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaActions } from '@/components/media-actions';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';

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

      <MediaActions onAddPicture={onAddPicture} hasPicture={!!photoUri} onSpeak={onSpeak} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  field: { gap: 7 },
  label: { ...Type.body },
  optional: { color: Colors.textFaint },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  photo: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  remove: { minHeight: 44, justifyContent: 'center' },
  removeText: { ...Type.body, color: Colors.danger, textDecorationLine: 'underline' },
});
