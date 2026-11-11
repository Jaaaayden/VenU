import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { NAV_BAR_CLEARANCE } from '@/components/tab-bar';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';

const FILTERS = ['All', 'Outdoor', 'Indoor', 'Stadium', 'Hall', 'Rooftop'];

const VENUES = [
  { id: '1', name: 'Meridian Arena', location: 'Downtown · 2.1 mi', type: 'Stadium', capacity: '18,000', saved: false },
  { id: '2', name: 'The Garden Pavilion', location: 'Midtown · 0.8 mi', type: 'Outdoor', capacity: '2,500', saved: true },
  { id: '3', name: 'Grand Hall East', location: 'East Side · 3.4 mi', type: 'Hall', capacity: '800', saved: false },
  { id: '4', name: 'Sky Deck Lounge', location: 'Uptown · 1.2 mi', type: 'Rooftop', capacity: '300', saved: false },
  { id: '5', name: 'Riverside Amphitheater', location: 'Riverside · 4.0 mi', type: 'Outdoor', capacity: '5,000', saved: true },
];

export default function VenueScreen() {
  const { profile, avatarUrl } = useProfile();
  const [activeFilter, setActiveFilter] = useState('All');
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(VENUES.map(v => [v.id, v.saved]))
  );

  const filtered = activeFilter === 'All'
    ? VENUES
    : VENUES.filter(v => v.type === activeFilter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.title}>Find a Venue</Text>
          </View>
          <Pressable onPress={() => router.replace('/profile')} accessibilityRole="button" accessibilityLabel="Your profile">
            <Avatar name={profile?.firstName ?? ''} uri={avatarUrl} size={42} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues, cities, events..."
            placeholderTextColor={Colors.textFaint}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}>
          {FILTERS.map(f => (
            <Pressable
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => setActiveFilter(f)}>
              <Text style={[styles.chipLabel, activeFilter === f && styles.chipLabelActive]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Section heading */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {activeFilter === 'All' ? 'Near You' : activeFilter}
          </Text>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {/* Venue cards */}
        <View style={styles.cards}>
          {filtered.map(venue => (
            <Pressable key={venue.id} style={styles.card}>
              {/* Image placeholder */}
              <View style={styles.cardImage}>
                <Text style={styles.cardImageEmoji}>🏟</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName}>{venue.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeLabel}>{venue.type}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setSaved(s => ({ ...s, [venue.id]: !s[venue.id] }))}
                    hitSlop={8}>
                    <Text style={styles.heartIcon}>{saved[venue.id] ? '❤️' : '🤍'}</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardLocation}>📍 {venue.location}</Text>
                <Text style={styles.cardCapacity}>Capacity: {venue.capacity}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Bottom padding for nav bar */}
        <View style={styles.navSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  title: Type.title,

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },

  filtersScroll: { marginBottom: 20 },
  filtersContent: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipLabel: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  chipLabelActive: { color: Colors.primary, fontWeight: '700' },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: Type.heading,
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  cards: { gap: 14 },
  card: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    height: 120,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageEmoji: { fontSize: 48 },
  cardBody: { padding: 14, gap: 4 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.bg,
  },
  typeBadgeLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  heartIcon: { fontSize: 20 },
  cardLocation: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardCapacity: { fontSize: 12, color: Colors.textMuted },

  navSpacer: { height: NAV_BAR_CLEARANCE },
});
