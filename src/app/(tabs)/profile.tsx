import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { NAV_BAR_CLEARANCE } from '@/components/xr-navigation-bar';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { SummaryTags } from '@/features/profile/summary-tags';

interface MenuItem {
  icon: string;
  label: string;
  href?: Href;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Account',
    items: [
      { icon: '👤', label: 'Edit profile', href: '/edit-profile' },
      { icon: '🔔', label: 'Notifications' },
      { icon: '🔒', label: 'Privacy & data', href: '/privacy' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '💬', label: 'Help & feedback' },
      // Placeholder until there's a terms doc; the privacy policy lives under Account → Privacy & data.
      { icon: '📄', label: 'Terms of use' },
    ],
  },
];

export default function ProfileScreen() {
  const { profile, avatarUrl, signOut, deleteAll } = useProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteAll();
    } catch (e) {
      // Photos go first, so a failure can be partial; don't claim nothing changed.
      setDeleteError(`Couldn't finish deleting your data: ${e instanceof Error ? e.message : 'unknown error'}. Try again.`);
      setBusy(false);
      return;
    }
    // Data is gone at this point; a sign-out hiccup shouldn't strand them on this screen.
    await signOut().catch(() => {});
    router.replace('/sign-in');
  }

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

        {profile ? (
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Avatar name={profile.firstName} uri={avatarUrl} size={60} />
              <View style={styles.profileInfo}>
                <Text style={Type.heading}>{profile.firstName}</Text>
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

            <Text style={[Type.overline, styles.shareTitle]}>
              {profile.role === 'visitor' ? 'Shared with your helper' : 'Shown to visitors'}
            </Text>
            <SummaryTags draft={profile} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={Type.bodyStrong}>No profile yet</Text>
            <Text style={[Type.caption, styles.gapSm]}>Set one up so helpers know your language and needs.</Text>
            <Button label="Set up profile" onPress={() => router.push('/onboarding/role')} style={styles.gapMd} />
          </View>
        )}

        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[Type.overline, styles.sectionTitle]}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <Pressable
                    onPress={item.href ? () => router.push(item.href!) : undefined}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                    <View style={styles.menuIconBox}>
                      <Text style={styles.menuIcon}>{item.icon}</Text>
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

        {profile && (
          <View style={styles.deleteBox}>
            {confirmDelete ? (
              <>
                <Text style={Type.caption}>This removes your profile and photo for good. You can make a new one later.</Text>
                {deleteError && <Text style={[Type.caption, styles.errorText]}>{deleteError}</Text>}
                <View style={styles.deleteRow}>
                  <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} style={styles.flex} />
                  <Button label="Delete" variant="danger" onPress={handleDelete} loading={busy} style={styles.flex} />
                </View>
              </>
            ) : (
              <Button label="Delete my data" variant="link" onPress={() => setConfirmDelete(true)} />
            )}
          </View>
        )}

        <View style={{ height: NAV_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg },
  flex: { flex: 1 },
  gapSm: { marginTop: Spacing.xs },
  gapMd: { marginTop: Spacing.md },

  pageTitle: { ...Type.title, marginBottom: Spacing.gutter },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1, gap: Spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { ...Type.caption, fontWeight: '700', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgeRole: { backgroundColor: Colors.primarySoft, color: Colors.primary },
  badgeOk: { backgroundColor: Colors.successSoft, color: Colors.success },
  badgePending: { backgroundColor: Colors.accentSoft, color: Colors.accent },
  editBtn: { minHeight: 36, paddingHorizontal: 14 },
  shareTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.sm },
  menuCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: Spacing.md },
  menuRowPressed: { backgroundColor: Colors.bg },
  menuIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 16 },
  menuLabel: { ...Type.body, flex: 1, fontWeight: '500' },
  menuChevron: { fontSize: 20, color: Colors.textFaint },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 60 },

  deleteBox: { marginTop: Spacing.md, gap: Spacing.sm, alignItems: 'stretch' },
  deleteRow: { flexDirection: 'row', gap: Spacing.md },
  errorText: { color: Colors.danger },
});
