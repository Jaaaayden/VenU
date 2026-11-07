import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigmaColors } from '@/constants/theme';

const OPPORTUNITIES = [
  {
    id: '1',
    title: 'City Music Festival',
    venue: 'Meridian Arena',
    date: 'Nov 15, 2026',
    time: '8:00 AM – 6:00 PM',
    roles: ['Crowd Management', 'Info Desk', 'Stage Crew'],
    spots: 12,
    emoji: '🎵',
  },
  {
    id: '2',
    title: 'Charity 5K Run',
    venue: 'Riverside Amphitheater',
    date: 'Nov 22, 2026',
    time: '6:30 AM – 12:00 PM',
    roles: ['Registration', 'Water Station', 'Finish Line'],
    spots: 8,
    emoji: '🏃',
  },
  {
    id: '3',
    title: 'Tech Summit 2026',
    venue: 'Grand Hall East',
    date: 'Dec 4, 2026',
    time: '9:00 AM – 5:00 PM',
    roles: ['Check-in', 'AV Support', 'Hospitality'],
    spots: 20,
    emoji: '💻',
  },
  {
    id: '4',
    title: 'Holiday Market',
    venue: 'The Garden Pavilion',
    date: 'Dec 12, 2026',
    time: '10:00 AM – 8:00 PM',
    roles: ['Vendor Assist', 'Greeter', 'Setup/Teardown'],
    spots: 5,
    emoji: '🎄',
  },
];

const STATS = [
  { label: 'Hours logged', value: '0' },
  { label: 'Events', value: '0' },
  { label: 'Badges', value: '0' },
];

export default function VolunteerScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.title}>Volunteer</Text>
        <Text style={styles.subtitle}>Make an impact at events near you</Text>

        {/* My stats */}
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Opportunities</Text>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {OPPORTUNITIES.map(op => (
            <View key={op.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.emojiBox}>
                  <Text style={styles.emoji}>{op.emoji}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardTitle}>{op.title}</Text>
                  <Text style={styles.cardVenue}>📍 {op.venue}</Text>
                </View>
                <View style={[styles.spotsBadge, op.spots <= 5 && styles.spotsBadgeUrgent]}>
                  <Text style={[styles.spotsText, op.spots <= 5 && styles.spotsTextUrgent]}>
                    {op.spots} spots
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.cardDate}>📅 {op.date} · {op.time}</Text>
                <View style={styles.rolesRow}>
                  {op.roles.map(r => (
                    <View key={r} style={styles.roleChip}>
                      <Text style={styles.roleChipLabel}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable style={styles.signUpBtn}>
                <Text style={styles.signUpLabel}>Sign Up to Volunteer</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.navSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  title: { fontSize: 28, fontWeight: '700', color: FigmaColors.darkGray, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 20 },

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

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: FigmaColors.darkGray },
  seeAll: { fontSize: 13, color: '#3c87f7', fontWeight: '500' },

  cards: { gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: '#fff',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: FigmaColors.darkGray },
  cardVenue: { fontSize: 12, color: '#666' },
  spotsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  spotsBadgeUrgent: { backgroundColor: '#fff0e8' },
  spotsText: { fontSize: 11, fontWeight: '600', color: '#666' },
  spotsTextUrgent: { color: '#e07020' },
  cardDetails: { gap: 8 },
  cardDate: { fontSize: 12, color: '#888' },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: FigmaColors.lightBlue,
  },
  roleChipLabel: { fontSize: 11, fontWeight: '500', color: FigmaColors.darkGray },

  signUpBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: FigmaColors.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },

  navSpacer: { height: 100 },
});
