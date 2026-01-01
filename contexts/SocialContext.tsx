import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Follow, FriendLocation, LocationSettings, FriendProfile } from '@/types';
import { mockFollows, mockFriendLocations, mockFriendProfiles } from '@/mocks/friends';

const STORAGE_KEYS = {
  FOLLOWS: 'vibelink_follows',
  LOCATION_SETTINGS: 'vibelink_location_settings',
};

const defaultLocationSettings: LocationSettings = {
  ghostMode: false,
  precision: 'VENUE_ONLY',
  autoExpireEnabled: false,
  autoExpireTime: '04:00',
  onlyShowToMutual: false,
};

export const [SocialProvider, useSocial] = createContextHook(() => {
  const [follows, setFollows] = useState<Follow[]>(mockFollows);
  const [locationSettings, setLocationSettings] = useState<LocationSettings>(defaultLocationSettings);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>(mockFriendLocations);

  const followsQuery = useQuery({
    queryKey: ['follows'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOWS);
      if (stored) {
        return JSON.parse(stored) as Follow[];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWS, JSON.stringify(mockFollows));
      return mockFollows;
    },
  });

  const locationSettingsQuery = useQuery({
    queryKey: ['location-settings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_SETTINGS);
      if (stored) {
        return JSON.parse(stored) as LocationSettings;
      }
      return defaultLocationSettings;
    },
  });

  useEffect(() => {
    if (followsQuery.data) {
      setFollows(followsQuery.data);
    }
  }, [followsQuery.data]);

  useEffect(() => {
    if (locationSettingsQuery.data) {
      setLocationSettings(locationSettingsQuery.data);
    }
  }, [locationSettingsQuery.data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFriendLocations(prev => 
        prev.map(friend => {
          const randomOffset = 0.0002;
          const latOffset = (Math.random() - 0.5) * randomOffset;
          const lngOffset = (Math.random() - 0.5) * randomOffset;
          
          return {
            ...friend,
            location: {
              latitude: friend.location.latitude + latOffset,
              longitude: friend.location.longitude + lngOffset,
            },
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateFollowsMutation = useMutation({
    mutationFn: async (newFollows: Follow[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWS, JSON.stringify(newFollows));
      return newFollows;
    },
    onSuccess: (data) => {
      setFollows(data);
    },
  });

  const updateLocationSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<LocationSettings>) => {
      const updated = { ...locationSettings, ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_SETTINGS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setLocationSettings(data);
    },
  });

  const { mutate: updateFollows } = updateFollowsMutation;
  const { mutate: updateLocationSettings } = updateLocationSettingsMutation;

  useEffect(() => {
    const checkAutoExpire = () => {
      if (!locationSettings.autoExpireEnabled) return;

      const now = new Date();
      const [hours, minutes] = locationSettings.autoExpireTime.split(':').map(Number);
      const expireTime = new Date();
      expireTime.setHours(hours, minutes, 0, 0);

      if (now >= expireTime && !locationSettings.ghostMode) {
        updateLocationSettings({ ghostMode: true });
      }
    };

    const interval = setInterval(checkAutoExpire, 60000);
    checkAutoExpire();

    return () => clearInterval(interval);
  }, [locationSettings.autoExpireEnabled, locationSettings.autoExpireTime, locationSettings.ghostMode, updateLocationSettings]);

  const acceptedFollows = useMemo(() => {
    return follows.filter(f => f.status === 'ACCEPTED');
  }, [follows]);

  const following = useMemo(() => {
    return acceptedFollows
      .filter(f => f.followerId === 'user-me')
      .map(f => f.followingId);
  }, [acceptedFollows]);

  const followers = useMemo(() => {
    return acceptedFollows
      .filter(f => f.followingId === 'user-me')
      .map(f => f.followerId);
  }, [acceptedFollows]);

  const mutualFollows = useMemo(() => {
    return following.filter(userId => followers.includes(userId));
  }, [following, followers]);

  const isFollowing = useCallback((userId: string) => {
    return following.includes(userId);
  }, [following]);

  const isMutual = useCallback((userId: string) => {
    return mutualFollows.includes(userId);
  }, [mutualFollows]);

  const followUser = useCallback((userId: string, shareLocation = true) => {
    const newFollow: Follow = {
      followerId: 'user-me',
      followingId: userId,
      shareLocation,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    updateFollows([...follows, newFollow]);
  }, [follows, updateFollows]);

  const unfollowUser = useCallback((userId: string) => {
    const updated = follows.filter(f => 
      !(f.followerId === 'user-me' && f.followingId === userId)
    );
    updateFollows(updated);
  }, [follows, updateFollows]);

  const acceptFollowRequest = useCallback((followerId: string) => {
    const updated = follows.map(f => 
      f.followerId === followerId && f.followingId === 'user-me' && f.status === 'PENDING'
        ? { ...f, status: 'ACCEPTED' as const }
        : f
    );
    updateFollows(updated);
  }, [follows, updateFollows]);

  const rejectFollowRequest = useCallback((followerId: string) => {
    const updated = follows.filter(f => 
      !(f.followerId === followerId && f.followingId === 'user-me' && f.status === 'PENDING')
    );
    updateFollows(updated);
  }, [follows, updateFollows]);

  const toggleShareLocation = useCallback((userId: string) => {
    const updated = follows.map(f => 
      f.followerId === 'user-me' && f.followingId === userId
        ? { ...f, shareLocation: !f.shareLocation }
        : f
    );
    updateFollows(updated);
  }, [follows, updateFollows]);

  const toggleGhostMode = useCallback(() => {
    updateLocationSettings({ ghostMode: !locationSettings.ghostMode });
  }, [locationSettings.ghostMode, updateLocationSettings]);

  const visibleFriendLocations = useMemo(() => {
    if (locationSettings.ghostMode) return [];

    return friendLocations.filter(loc => {
      const follow = acceptedFollows.find(
        f => f.followerId === 'user-me' && f.followingId === loc.userId && f.shareLocation
      );
      
      if (!follow) return false;

      if (locationSettings.onlyShowToMutual && !mutualFollows.includes(loc.userId)) {
        return false;
      }

      if (loc.precision === 'HIDDEN') return false;

      return loc.isActive;
    });
  }, [friendLocations, locationSettings.ghostMode, locationSettings.onlyShowToMutual, acceptedFollows, mutualFollows]);

  const getFriendsByVenue = useCallback((venueId: string) => {
    return visibleFriendLocations.filter(loc => loc.venueId === venueId);
  }, [visibleFriendLocations]);

  const getLargestFriendCluster = useCallback(() => {
    const venueGroups = visibleFriendLocations.reduce((acc, loc) => {
      if (!loc.venueId) return acc;
      if (!acc[loc.venueId]) {
        acc[loc.venueId] = [];
      }
      acc[loc.venueId].push(loc);
      return acc;
    }, {} as Record<string, FriendLocation[]>);

    let largestVenueId: string | null = null;
    let largestCount = 0;

    Object.entries(venueGroups).forEach(([venueId, locs]) => {
      if (locs.length > largestCount) {
        largestCount = locs.length;
        largestVenueId = venueId;
      }
    });

    if (!largestVenueId) return null;

    const clusterLocations = venueGroups[largestVenueId];
    const avgLat = clusterLocations.reduce((sum, loc) => sum + loc.location.latitude, 0) / clusterLocations.length;
    const avgLng = clusterLocations.reduce((sum, loc) => sum + loc.location.longitude, 0) / clusterLocations.length;

    return {
      venueId: largestVenueId,
      venueName: clusterLocations[0].venueName,
      count: clusterLocations.length,
      location: {
        latitude: avgLat,
        longitude: avgLng,
      },
      friends: clusterLocations,
    };
  }, [visibleFriendLocations]);

  const searchFriends = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return mockFriendProfiles.filter(profile => 
      profile.displayName.toLowerCase().includes(lowerQuery) ||
      (profile.bio && profile.bio.toLowerCase().includes(lowerQuery))
    );
  }, []);

  const getFriendProfile = useCallback((userId: string): FriendProfile | undefined => {
    return mockFriendProfiles.find(p => p.id === userId);
  }, []);

  const pendingRequests = useMemo(() => {
    return follows
      .filter(f => f.followingId === 'user-me' && f.status === 'PENDING')
      .map(f => f.followerId);
  }, [follows]);

  return {
    follows,
    following,
    followers,
    mutualFollows,
    pendingRequests,
    isFollowing,
    isMutual,
    followUser,
    unfollowUser,
    acceptFollowRequest,
    rejectFollowRequest,
    toggleShareLocation,
    locationSettings,
    updateLocationSettings,
    toggleGhostMode,
    friendLocations: visibleFriendLocations,
    getFriendsByVenue,
    getLargestFriendCluster,
    searchFriends,
    getFriendProfile,
    isLoading: followsQuery.isLoading || locationSettingsQuery.isLoading,
  };
});
