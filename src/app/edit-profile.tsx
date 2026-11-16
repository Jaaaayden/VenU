import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StepHeader } from '@/components/form-section';
import { BackLink } from '@/components/top-bar';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { ProfileForm } from '@/features/profile/profile-form';
import { draftFromProfile } from '@/features/profile/types';
import { useT } from '@/i18n';
import { goBack } from '@/lib/navigation';

export default function EditProfileScreen() {
  const { status, profile, avatarUrl, save } = useProfile();
  const t = useT('profile');
  const [dirty, setDirty] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  // One object per saved profile, so the form's "changed?" check compares against the same draft.
  const initial = useMemo(() => (profile ? draftFromProfile(profile) : null), [profile]);
  if (status === 'loading') return null; // e.g. a web reload straight onto /edit-profile
  if (!profile || !initial) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Back asks first when there are unsaved edits (name typed, a chip changed, a photo picked). */}
      <BackLink label={t('tab.title')} fallback="/profile" onPress={dirty ? () => setAskDiscard(true) : undefined} />
      {askDiscard ? (
        <View style={styles.confirm} accessibilityLiveRegion="polite">
          <Text style={styles.confirmText}>{t('edit.discardTitle')}</Text>
          <View style={styles.confirmButtons}>
            <Button label={t('edit.keepEditing')} variant="neutral" onPress={() => setAskDiscard(false)} style={styles.flex} />
            <Button label={t('edit.discard')} variant="danger" onPress={() => goBack('/profile')} style={styles.flex} />
          </View>
        </View>
      ) : null}
      <ProfileForm
        initial={initial}
        savedAvatarUrl={avatarUrl}
        submitLabel={t('edit.submit')}
        onDirtyChange={setDirty}
        onSubmit={async (draft, avatar) => {
          // Saving never changes the app language (the store leaves it as stored; the pills own it).
          await save(draft, avatar);
          goBack('/profile');
        }}
        header={<StepHeader title={t('edit.title')} subtitle={t('edit.subtitle')} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  confirm: { gap: Spacing.md, marginHorizontal: Spacing.gutter, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
  confirmText: { ...Type.body },
  confirmButtons: { flexDirection: 'row', gap: Spacing.md },
});
