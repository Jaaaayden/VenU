import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigmaColors } from '@/constants/theme';

const STATS = [
  { label: 'Events', value: '0' },
  { label: 'Volunteered', value: '0' },
  { label: 'Saved', value: '2' },
];

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: '👤', label: 'Edit Profile' },
      { icon: '🔔', label: 'Notifications' },
      { icon: '🔒', label: 'Privacy & Security' },
    ],
  },
  {
    title: 'Activity',
    items: [
      { icon: '📅', label: 'My Events' },
      { icon: '🤝', label: 'Volunteer History' },
      { icon: '❤️', label: 'Saved Venues' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '💬', label: 'Help & Feedback' },
      { icon: '⭐', label: 'Rate the App' },
      { icon: '📄', label: 'Terms & Privacy' },
    ],
  },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>KR</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Krish R.</Text>
            <Text style={styles.profileEmail}>krish@example.com</Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeLabel}>🌟 New Member</Text>
            </View>
          </View>
          <Pressable style={styles.editBtn}>
            <Text style={styles.editBtnLabel}>Edit</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu sections */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <Pressable
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

        {/* Sign out */}
        <Pressable style={styles.signOutBtn}>
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </Pressable>

        <View style={styles.navSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  pageTitle: { fontSize: 28, fontWeight: '700', color: FigmaColors.darkGray, letterSpacing: -0.5, marginBottom: 20 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fafafa',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: FigmaColors.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: '700', color: FigmaColors.darkGray },
  profileEmail: { fontSize: 13, color: '#888' },
  memberBadge: {
    alignSelf: 'flex-start',
    backgroundColor: FigmaColors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  memberBadgeLabel: { fontSize: 11, fontWeight: '600', color: FigmaColors.darkGray },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  editBtnLabel: { fontSize: 13, fontWeight: '600', color: FigmaColors.darkGray },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: FigmaColors.lightBlue,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: FigmaColors.darkGray },
  statLabel: { fontSize: 11, color: '#555', textAlign: 'center' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowPressed: { backgroundColor: '#f8f8f8' },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: FigmaColors.darkGray },
  menuChevron: { fontSize: 20, color: '#ccc', fontWeight: '300' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 60 },

  signOutBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ffcdd2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  signOutLabel: { fontSize: 15, fontWeight: '600', color: '#e53935' },

  navSpacer: { height: 100 },
});
