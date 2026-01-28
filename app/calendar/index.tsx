import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar as CalendarIcon, Filter, MapPin, Users, DollarSign } from 'lucide-react-native';
import { useContent } from '@/contexts/ContentContext';
import { CalendarFilter, Event } from '@/types';
import * as Haptics from 'expo-haptics';
import { mockVenues } from '@/mocks/venues';

export default function CalendarScreen() {
  const { getFilteredEvents, performers } = useContent();
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    },
  });

  const filteredEvents = useMemo(() => {
    return getFilteredEvents(filter);
  }, [filter, getFilteredEvents]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const toggleGenreFilter = (genre: string) => {
    const currentGenres = filter.genres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];

    setFilter({
      ...filter,
      genres: newGenres.length > 0 ? newGenres : undefined,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const allGenres = ['House', 'Techno', 'Hip-Hop', 'R&B', 'Latin', 'EDM'];
  const activeFiltersCount = [
    filter.venueIds?.length || 0,
    filter.performerIds?.length || 0,
    filter.genres?.length || 0,
    filter.priceRange ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(10,10,15,0.95)', 'transparent']}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Event Calendar</Text>
            <Text style={styles.headerSubtitle}>
              {filteredEvents.length} upcoming events
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Button */}
      <View style={styles.filterButtonContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowFilters(!showFilters);
          }}
        >
          <Filter size={18} color={activeFiltersCount > 0 ? '#000' : '#fff'} />
          <Text style={[styles.filterButtonText, activeFiltersCount > 0 && styles.filterButtonTextActive]}>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filtersSectionTitle}>Genres</Text>
          <View style={styles.genreFilters}>
            {allGenres.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.genreChip,
                  filter.genres?.includes(genre) && styles.genreChipActive,
                ]}
                onPress={() => toggleGenreFilter(genre)}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    filter.genres?.includes(genre) && styles.genreChipTextActive,
                  ]}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilter({
                  dateRange: filter.dateRange,
                });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Events List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarIcon size={48} color="#666" />
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <EventCalendarCard key={event.id} event={event} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface EventCalendarCardProps {
  event: Event;
}

function EventCalendarCard({ event }: EventCalendarCardProps) {
  const venue = mockVenues.find(v => v.id === event.venueId);
  const { performers } = useContent();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/events/${event.id}`);
  };

  const eventDate = new Date(event.date);
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  const formattedDate = eventDate.toLocaleDateString('en-US', dateOptions);

  const minPrice = Math.min(...event.ticketTiers.map(t => t.price));
  const maxPrice = Math.max(...event.ticketTiers.map(t => t.price));

  const performerNames = event.performerIds
    .map(pid => performers.find(p => p.id === pid)?.stageName || 'Unknown')
    .slice(0, 2)
    .join(', ');

  return (
    <TouchableOpacity style={styles.eventCard} onPress={handlePress} activeOpacity={0.7}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.eventGradient}
      >
        {/* Event Image */}
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />

        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeMonth}>{formattedDate.split(' ')[0]}</Text>
          <Text style={styles.dateBadgeDay}>{formattedDate.split(' ')[2]}</Text>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.title}
          </Text>

          {venue && (
            <View style={styles.eventMetaRow}>
              <MapPin size={14} color="#999" />
              <Text style={styles.eventMetaText} numberOfLines={1}>
                {venue.name}
              </Text>
            </View>
          )}

          <View style={styles.eventMetaRow}>
            <Users size={14} color="#999" />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {performerNames}
            </Text>
          </View>

          <View style={styles.eventMetaRow}>
            <DollarSign size={14} color="#999" />
            <Text style={styles.eventMetaText}>
              {minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`}
            </Text>
          </View>

          {/* Genres */}
          <View style={styles.eventGenres}>
            {event.genres.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.eventGenreTag}>
                <Text style={styles.eventGenreText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#00d4ff',
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  filterButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  filterButtonActive: {
    backgroundColor: '#00d4ff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  filterButtonTextActive: {
    color: '#000',
  },
  filtersPanel: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  filtersSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  genreFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genreChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderColor: '#00d4ff',
  },
  genreChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  genreChipTextActive: {
    color: '#00d4ff',
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff0080',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventGradient: {
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff0080',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  eventMetaText: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    fontWeight: '500',
  },
  eventGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  eventGenreTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventGenreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a855f7',
  },
});
