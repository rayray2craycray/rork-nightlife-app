import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { X, MapPin, Users, DollarSign, Navigation, Ghost, ChevronUp, ChevronDown } from 'lucide-react-native';
import { mockVenues } from '@/mocks/venues';
import { Venue, FriendLocation } from '@/types';
import { useDiscovery, useAppState } from '@/contexts/AppStateContext';
import { useSocial } from '@/contexts/SocialContext';
import { useGlow } from '@/contexts/GlowContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DiscoveryScreen() {
  const { selectedVenueId, setSelectedVenueId } = useDiscovery();
  const { friendLocations, getFriendsByVenue, locationSettings, toggleGhostMode, getLargestFriendCluster } = useSocial();
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [showFriendDrawer, setShowFriendDrawer] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setLocationPermission(false);
        setUserLocation({ latitude: 40.7489, longitude: -73.9680 });
        Alert.alert(
          'Location Access',
          'Location permission is required to show nearby venues. Using default location (NYC).',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setUserLocation({ latitude: 40.7489, longitude: -73.9680 });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const recenterMap = () => {
    if (userLocation && mapRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  };

  const findMyGroup = () => {
    const cluster = getLargestFriendCluster();
    if (cluster && mapRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      mapRef.current.animateToRegion({
        latitude: cluster.location.latitude,
        longitude: cluster.location.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }, 1000);
    } else {
      Alert.alert('No Friends Online', 'None of your friends are currently at any venues.');
    }
  };

  const nearbyVenues = useMemo(() => {
    if (!userLocation) return [];
    return mockVenues.filter(venue => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        venue.location.latitude,
        venue.location.longitude
      );
      return distance <= 50;
    });
  }, [userLocation]);

  const friendsByVenue = useMemo(() => {
    return nearbyVenues.reduce((acc, venue) => {
      const friends = getFriendsByVenue(venue.id);
      if (friends.length > 0) {
        acc[venue.id] = friends;
      }
      return acc;
    }, {} as Record<string, typeof friendLocations>);
  }, [nearbyVenues, getFriendsByVenue]);

  const selectedVenue = nearbyVenues.find(v => v.id === selectedVenueId);

  if (isLoadingLocation || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0080" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={locationPermission}
        showsMyLocationButton={false}
      >
        {nearbyVenues.map(venue => {
          const venueFriends = friendsByVenue[venue.id] || [];
          return (
            <Marker
              key={venue.id}
              coordinate={{
                latitude: venue.location.latitude,
                longitude: venue.location.longitude,
              }}
              onPress={() => setSelectedVenueId(venue.id)}
            >
              <View style={[styles.markerContainer, venue.isOpen && styles.markerLive]}>
                <Text style={styles.markerText}>🎵</Text>
                {venue.isOpen && <View style={styles.pulseDot} />}
                {venueFriends.length > 0 && (
                  <View style={styles.friendCountBadge}>
                    <Text style={styles.friendCountText}>{venueFriends.length}</Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}

        {friendLocations.map(friend => (
          <Marker
            key={friend.userId}
            coordinate={friend.location}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: friend.location.latitude,
                  longitude: friend.location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 500);
              }
            }}
          >
            <View style={styles.friendAvatarContainer}>
              <View style={[
                styles.friendAvatarRing,
                friend.venueId ? styles.friendAvatarRingVenue : styles.friendAvatarRingActive
              ]}>
                <Image
                  source={{ uri: friend.avatarUrl }}
                  style={styles.friendAvatar}
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0.7)', 'transparent']}
          style={styles.headerGradient}
        />
        <Text style={styles.headerTitle}>Discover Venues</Text>
        <Text style={styles.headerSubtitle}>
          {nearbyVenues.filter(v => v.isOpen).length} venues live now • Within 50 miles
        </Text>
      </View>

      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={[styles.controlButton, locationSettings.ghostMode && styles.controlButtonActive]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleGhostMode();
          }}
        >
          <Ghost size={22} color={locationSettings.ghostMode ? '#0a0a0f' : '#fff'} />
        </TouchableOpacity>
        
        {friendLocations.length > 0 && (
          <TouchableOpacity style={styles.controlButton} onPress={findMyGroup}>
            <Users size={22} color="#fff" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Navigation size={24} color="#0a0a0f" />
        </TouchableOpacity>
      </View>

      {!selectedVenue && friendLocations.length > 0 && (
        <TouchableOpacity 
          style={styles.friendDrawerToggle} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFriendDrawer(!showFriendDrawer);
          }}
        >
          <View style={styles.friendDrawerToggleContent}>
            {showFriendDrawer ? <ChevronDown size={20} color="#fff" /> : <ChevronUp size={20} color="#fff" />}
            <Text style={styles.friendDrawerToggleText}>
              {friendLocations.length} {friendLocations.length === 1 ? 'Friend' : 'Friends'} Online
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {showFriendDrawer && !selectedVenue && (
        <FriendListDrawer 
          friendLocations={friendLocations} 
          onClose={() => setShowFriendDrawer(false)}
          onFriendPress={(friend) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: friend.location.latitude,
                longitude: friend.location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 500);
            }
            setShowFriendDrawer(false);
          }}
        />
      )}

      {selectedVenue && (
        <VenueBottomSheet venue={selectedVenue} onClose={() => setSelectedVenueId(null)} />
      )}
    </View>
  );
}

interface FriendListDrawerProps {
  friendLocations: FriendLocation[];
  onClose: () => void;
  onFriendPress: (friend: FriendLocation) => void;
}

function FriendListDrawer({ friendLocations, onClose, onFriendPress }: FriendListDrawerProps) {
  const venueGroups = useMemo(() => {
    const grouped = friendLocations.reduce((acc, friend) => {
      const key = friend.venueId || 'exploring';
      if (!acc[key]) {
        acc[key] = {
          venueName: friend.venueName || 'Exploring',
          friends: [],
        };
      }
      acc[key].friends.push(friend);
      return acc;
    }, {} as Record<string, { venueName: string; friends: FriendLocation[] }>);
    return Object.values(grouped);
  }, [friendLocations]);

  return (
    <View style={styles.friendDrawer}>
      <LinearGradient
        colors={['#15151f', '#1a1a2e']}
        style={styles.friendDrawerGradient}
      >
        <View style={styles.friendDrawerHeader}>
          <Text style={styles.friendDrawerTitle}>Friends Online</Text>
          <TouchableOpacity onPress={onClose} style={styles.friendDrawerClose}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.friendDrawerScroll} showsVerticalScrollIndicator={false}>
          {venueGroups.map((group, idx) => (
            <View key={idx} style={styles.venueGroup}>
              <View style={styles.venueGroupHeader}>
                <MapPin size={14} color="#ff0080" />
                <Text style={styles.venueGroupName}>{group.venueName}</Text>
                <Text style={styles.venueGroupCount}>{group.friends.length}</Text>
              </View>
              
              {group.friends.map((friend) => (
                <TouchableOpacity
                  key={friend.userId}
                  style={styles.friendItem}
                  onPress={() => onFriendPress(friend)}
                >
                  <View style={[styles.friendAvatarRing, styles.friendAvatarRingActive]}>
                    <Image
                      source={{ uri: friend.avatarUrl }}
                      style={styles.friendItemAvatar}
                    />
                  </View>
                  <View style={styles.friendItemInfo}>
                    <Text style={styles.friendItemName}>{friend.displayName}</Text>
                    <Text style={styles.friendItemStatus}>
                      {friend.precision === 'EXACT' ? 'Exact location' : 'At venue'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

interface VenueBottomSheetProps {
  venue: Venue;
  onClose: () => void;
}

function VenueBottomSheet({ venue, onClose }: VenueBottomSheetProps) {
  const { profile, updateProfile, canRejoinVenue } = useAppState();
  const { triggerGlow } = useGlow();

  const handleGetDirections = () => {
    const { latitude, longitude } = venue.location;
    const label = encodeURIComponent(venue.name);
    
    let url = '';
    
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
    } else if (Platform.OS === 'android') {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url).catch(() => {
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert('Error', 'Unable to open maps');
      });
    });
  };

  const handleJoinLobby = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const alreadyJoined = profile.badges.some(badge => badge.venueId === venue.id);
    
    if (alreadyJoined) {
      router.push('/(tabs)/servers');
      return;
    }

    const hasLeftBefore = profile.transactionHistory.some(t => t.venueId === venue.id) && 
                          !profile.badges.some(b => b.venueId === venue.id);
    
    if (hasLeftBefore) {
      const canRejoin = canRejoinVenue(venue.id, venue);
      
      if (!canRejoin) {
        const venueSpend = profile.transactionHistory
          .filter(t => t.venueId === venue.id)
          .reduce((sum, t) => sum + t.amount, 0);
        
        Alert.alert(
          'Cannot Re-enter Inner Circle',
          `Your Toast spend history (${venueSpend}) does not meet ${venue.name}'s VIP threshold (${venue.vipThreshold}). You can only re-enter if you meet the venue's active spend requirements.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Welcome Back!',
        venue.hasPublicLobby 
          ? `You can re-enter ${venue.name}'s public lobby anytime.`
          : `Your Toast spend history meets ${venue.name}'s VIP requirements. Welcome back to the Inner Circle!`,
        [
          { 
            text: 'Join', 
            onPress: () => {
              const newBadge = {
                id: `badge-${Date.now()}`,
                venueId: venue.id,
                venueName: venue.name,
                badgeType: 'GUEST' as const,
                unlockedAt: new Date().toISOString(),
              };
              
              updateProfile({
                badges: [...profile.badges, newBadge],
              });
              
              triggerGlow({ color: 'purple', intensity: 0.6, duration: 1000 });
              router.push('/(tabs)/servers');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      const newBadge = {
        id: `badge-${Date.now()}`,
        venueId: venue.id,
        venueName: venue.name,
        badgeType: 'GUEST' as const,
        unlockedAt: new Date().toISOString(),
      };
      
      const newTransaction = {
        id: `tx-${Date.now()}`,
        venueId: venue.id,
        amount: 0,
        timestamp: new Date().toISOString(),
      };
      
      updateProfile({
        badges: [...profile.badges, newBadge],
        transactionHistory: [...profile.transactionHistory, newTransaction],
      });
      
      triggerGlow({ color: 'purple', intensity: 0.6, duration: 1000 });
      
      Alert.alert(
        'Joined!',
        `You've joined ${venue.name}'s public lobby. Check the Servers tab to chat.`,
        [
          { text: 'OK', onPress: () => router.push('/(tabs)/servers') },
        ]
      );
    }
  };
  return (
    <View style={styles.bottomSheet}>
      <LinearGradient
        colors={['#15151f', '#1a1a2e']}
        style={styles.sheetGradient}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>

        <Image
          source={{ uri: venue.imageUrl }}
          style={styles.venueImage}
        />

        <View style={styles.sheetContent}>
          <View style={styles.venueHeader}>
            <View>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, venue.isOpen && styles.statusDotLive]} />
                <Text style={[styles.statusText, venue.isOpen && styles.statusTextLive]}>
                  {venue.isOpen ? 'OPEN NOW' : 'CLOSED'}
                </Text>
              </View>
            </View>
            {venue.isOpen && (
              <View style={styles.vibeBadge}>
                <Text style={styles.vibeText}>{venue.currentVibeLevel}%</Text>
                <Text style={styles.vibeLabel}>VIBE</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MapPin size={16} color="#ff0080" />
              <Text style={styles.infoText}>{venue.location.address}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <DollarSign size={18} color="#ff0080" />
              <Text style={styles.statText}>${venue.coverCharge} cover</Text>
            </View>
            <View style={styles.statItem}>
              <Users size={18} color="#ff0080" />
              <Text style={styles.statText}>342 members</Text>
            </View>
          </View>

          <View style={styles.genresContainer}>
            {venue.genres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.joinButton} onPress={handleJoinLobby}>
            <Text style={styles.joinButtonText}>
              {profile.badges.some(b => b.venueId === venue.id) ? 'Go to Server' : 'Join Public Lobby'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ff0080',
    fontWeight: '600' as const,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#15151f',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#666',
  },
  markerLive: {
    borderColor: '#ff0080',
  },
  markerText: {
    fontSize: 20,
  },
  pulseDot: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#a855f7',
  },
  bottomSheet: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetGradient: {
    padding: 20,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  venueImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 16,
  },
  sheetContent: {
    gap: 16,
  },
  venueHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  venueName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  statusDotLive: {
    backgroundColor: '#a855f7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#666',
  },
  statusTextLive: {
    color: '#a855f7',
  },
  vibeBadge: {
    backgroundColor: 'rgba(0, 255, 204, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  vibeText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ff0080',
  },
  vibeLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#ff0080',
  },
  infoRow: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  genresContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(102, 102, 128, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#ff0080',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center' as const,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0a0a0f',
  },
  directionsButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#ff0080',
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ff0080',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600' as const,
  },
  mapControls: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    backgroundColor: '#ff0080',
  },
  recenterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff0080',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  friendCountBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#ff0080',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  friendCountText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#0a0a0f',
  },
  friendAvatarContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  friendAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  friendAvatarRingActive: {
    backgroundColor: '#a855f7',
  },
  friendAvatarRingVenue: {
    backgroundColor: '#a855f7',
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  friendDrawerToggle: {
    position: 'absolute' as const,
    bottom: 24,
    left: 24,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.3)',
  },
  friendDrawerToggleContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  friendDrawerToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  friendDrawer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  friendDrawerGradient: {
    padding: 20,
    paddingBottom: 40,
  },
  friendDrawerHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  friendDrawerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  friendDrawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  friendDrawerScroll: {
    maxHeight: 400,
  },
  venueGroup: {
    marginBottom: 20,
  },
  venueGroupHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  venueGroupName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ff0080',
    flex: 1,
  },
  venueGroupCount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#666',
  },
  friendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  friendItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  friendItemInfo: {
    flex: 1,
  },
  friendItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  friendItemStatus: {
    fontSize: 12,
    color: '#999',
  },
});
