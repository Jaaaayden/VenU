import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Colors, Spacing, Type } from '@/constants/theme';
import { checkPhoto, type PickedImage } from '@/features/profile/store';
import { isLocalMode } from '@/lib/auth';

interface AvatarPickerProps {
  name: string;
  /** What to show now: the new pick, the saved photo, or null. */
  uri: string | null;
  onPick: (image: PickedImage) => void;
  onRemove: () => void;
}

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
  // Web gives blob: URIs that die on reload; base64 lets the local (no-Supabase) store keep the photo.
  base64: Platform.OS === 'web' && isLocalMode,
};

/** Photo + "Choose photo" / "Take photo" / "Remove" actions. Must be launched from a tap (web rule). */
export function AvatarPicker({ name, uri, onPick, onRemove }: AvatarPickerProps) {
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'library' | 'camera') {
    setError(null);
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(source === 'camera' ? 'Camera access is off. Turn it on in Settings.' : 'Photo access is off. Turn it on in Settings.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const image: PickedImage = { uri: asset.uri, mimeType: asset.mimeType ?? null, fileSize: asset.fileSize ?? null, base64: asset.base64 ?? null };
    const problem = checkPhoto(image);
    if (problem) return setError(problem);
    onPick(image);
  }

  return (
    <View style={styles.row}>
      <Avatar name={name} uri={uri} size={72} />
      <View style={styles.actions}>
        <View style={styles.links}>
          <Action label={uri ? 'Change photo' : 'Add a photo'} onPress={() => pick('library')} />
          {Platform.OS !== 'web' && <Action label="Take photo" onPress={() => pick('camera')} />}
          {uri && <Action label="Remove" onPress={onRemove} muted />}
        </View>
        <Text style={[styles.hint, error && styles.error]} accessibilityLiveRegion="polite">
          {error ?? 'Helps your helper spot you. Optional.'}
        </Text>
      </View>
    </View>
  );
}

function Action({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.target} accessibilityRole="button">
      <Text style={[styles.action, muted && styles.actionMuted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  actions: { flex: 1, gap: Spacing.xs },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.lg, rowGap: Spacing.xs },
  target: { minHeight: 32, justifyContent: 'center' }, // >= 24px on web too, where hitSlop is ignored
  action: { ...Type.label, color: Colors.primary },
  actionMuted: { color: Colors.textMuted },
  hint: Type.caption,
  error: { color: Colors.danger },
});
