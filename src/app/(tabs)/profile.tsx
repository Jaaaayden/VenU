import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { FigmaIcon, type FigmaIconName } from '@/components/icons/figma-icon';
import { NAV_BAR_CLEARANCE } from '@/components/tab-bar';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { SummaryTags } from '@/features/profile/summary-tags';
import { friendlyError } from '@/lib/errors';

interface MenuItem {
  icon: FigmaIconName;
  label: string;
  href: Href;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Account',
    items: [
      { icon: 'person', label: 'Edit profile', href: '/edit-profile' },
      { icon: 'volume', label: 'Notifications', href: '/notifications' },
      { icon: 'check-circle', label: 'Privacy & data', href: '/privacy' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'message-unread', label: 'Help & feedback', href: '/help' },
      { icon: 'attachment', label: 'Terms of use', href: '/terms' },
    ],
  },
];

export default function ProfileScreen() {
  const { profile, avatarUrl, signOut, deleteAll } = useProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      router.replace('/welcome');
    } catch (e) {
      setSignOutError(`Couldn't sign out. ${friendlyError(e)}`);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteAll(); // also signs out
      router.replace('/welcome');
    } catch (e) {
      // Photos go first, so a failure can be partial (the context has already reloaded what's left).
      setDeleteError(`Couldn't finish deleting your data. ${friendlyError(e)}`);
      setBusy(false);
    }
  }

  // The tabs layout only renders tabs for a signed-in user with a profile.
  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Opening the delete confirmation grows the page; bring its buttons out from under the tab bar.
        onContentSizeChange={() => confirmDelete && scrollRef.current?.scrollToEnd({ animated: true })}>
        <Text style={styles.pageTitle} accessibilityRole="header">Profile</Text>

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar name={profile.firstName} uri={avatarUrl} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{profile.firstName}</Text>
              <View style={styles.badges}>
                <Text style={[styles.badge, styles.badgeRole]}>{profile.role === 'visitor' ? 'Visitor' : 'Volunteer'}</Text>
                {profile.role === 'volunteer' && (
                  <Text style={[styles.badge, profile.verified ? styles.badgeOk : styles.badgePending]}>
                    {profile.verified ? '✓ Verified LA28' : 'Unverified'}
                  </Text>
                )}
              </View>
            </View>
            <Button label="Edit" variant="secondary" onPress={() => router.push('/edit-profile')} style={styles.editBtn} />
          </View>

          <Text style={styles.shareTitle}>
            {profile.role === 'visitor' ? 'Shared with your helper' : 'Shown to visitors'}
          </Text>
          <SummaryTags draft={profile} />
        </View>

        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <Pressable
                    onPress={() => router.push(item.href)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                    <View style={styles.menuIconBox}>
                      <FigmaIcon name={item.icon} size={20} color={Colors.ink} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuChevron}>›</Text>
                  </Pressable>
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Button label="Sign out" variant="secondary" onPress={handleSignOut} />
        {signOutError && (
          <Text style={[Type.caption, styles.errorText, styles.gapSm]} accessibilityLiveRegion="polite">
            {signOutError}
          </Text>
        )}

        <View style={styles.deleteBox}>
          {confirmDelete ? (
            <>
              <Text style={Type.caption}>This removes your profile and photo for good. You can make a new one later.</Text>
              {deleteError && <Text style={[Type.caption, styles.errorText]}>{deleteError}</Text>}
              <View style={styles.deleteRow}>
                <Button label="Cancel" variant="neutral" onPress={() => setConfirmDelete(false)} style={styles.flex} />
                <Button label="Delete" variant="danger" onPress={handleDelete} loading={busy} style={styles.flex} />
              </View>
            </>
          ) : (
            <Button label="Delete my data" variant="link" onPress={() => setConfirmDelete(true)} />
          )}
        </View>

        <View style={{ height: NAV_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.xl },
  flex: { flex: 1 },
  gapSm: { marginTop: Spacing.xs },

  pageTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, color: Colors.text, marginBottom: Spacing.xl },

  // Figma info tile: #F5F5F5, radius 10.
  card: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xxl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1, gap: Spacing.xs },
  name: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26, color: Colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { ...Type.caption, fontFamily: Fonts.textSemiBold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgeRole: { backgroundColor: Colors.primarySoft, color: Colors.primary },
  badgeOk: { backgroundColor: Colors.successSoft, color: Colors.success },
  badgePending: { backgroundColor: Colors.accentSoft, color: Colors.accent },
  editBtn: { paddingHorizontal: 18 },
  shareTitle: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 16, lineHeight: 22, color: Colors.text, marginBottom: Spacing.sm },
  menuCard: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.controlBorder, backgroundColor: Colors.surface, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.md },
  menuRowPressed: { backgroundColor: Colors.surfaceAlt },
  menuIconBox: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20, color: Colors.text, flex: 1 },
  menuChevron: { fontSize: 22, color: Colors.textFaint },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 64 },

  deleteBox: { marginTop: Spacing.md, gap: Spacing.sm, alignItems: 'stretch' },
  deleteRow: { flexDirection: 'row', gap: Spacing.md },
  errorText: { color: Colors.danger },
});
