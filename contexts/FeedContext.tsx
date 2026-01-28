import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FeedFilter, FeedSettings, VibeVideo } from '@/types';
import { mockVideos } from '@/mocks/videos';
import { mockVenues } from '@/mocks/venues';
import { mockPerformers } from '@/mocks/performers';
import { useAppState } from './AppStateContext';
import { useSocial } from './SocialContext';

const STORAGE_KEYS = {
  FEED_SETTINGS: 'vibelink_feed_settings',
  USER_VIDEOS: 'vibelink_user_videos',
};

const defaultFeedSettings: FeedSettings = {
  selectedFilter: 'NEARBY',
  lastUpdated: new Date().toISOString(),
};

const USER_LOCATION = {
  latitude: 40.7489,
  longitude: -73.9680,
};

const NEARBY_RADIUS_MILES = 25;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const [FeedProvider, useFeed] = createContextHook(() => {
  const [feedSettings, setFeedSettings] = useState<FeedSettings>(defaultFeedSettings);
  const [userVideos, setUserVideos] = useState<VibeVideo[]>([]);
  const { profile, getVenueVibe, calculateVibePercentage } = useAppState();
  const { friendLocations } = useSocial();

  const feedSettingsQuery = useQuery({
    queryKey: ['feed-settings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FEED_SETTINGS);
      if (stored) {
        return JSON.parse(stored) as FeedSettings;
      }
      return defaultFeedSettings;
    },
  });

  const userVideosQuery = useQuery({
    queryKey: ['user-videos'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_VIDEOS);
      if (stored) {
        return JSON.parse(stored) as VibeVideo[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (feedSettingsQuery.data) {
      setFeedSettings(feedSettingsQuery.data);
    }
  }, [feedSettingsQuery.data]);

  useEffect(() => {
    if (userVideosQuery.data) {
      setUserVideos(userVideosQuery.data);
    }
  }, [userVideosQuery.data]);

  const updateFeedSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<FeedSettings>) => {
      const updated = { ...feedSettings, ...updates, lastUpdated: new Date().toISOString() };
      await AsyncStorage.setItem(STORAGE_KEYS.FEED_SETTINGS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setFeedSettings(data);
    },
  });

  const { mutate: updateFeedSettings } = updateFeedSettingsMutation;

  const setFilter = useCallback((filter: FeedFilter) => {
    updateFeedSettings({ selectedFilter: filter });
  }, [updateFeedSettings]);

  const uploadVideo = useMutation({
    mutationFn: async (videoData: {
      videoUrl: string;
      venueId: string;
      title: string;
      duration: number;
      filter?: string;
      sticker?: string;
      stickerPosition?: { x: number; y: number };
    }) => {
      const newVideo: VibeVideo = {
        id: `user-video-${Date.now()}`,
        venueId: videoData.venueId,
        performerId: profile.role === 'TALENT' ? profile.id : undefined,
        videoUrl: videoData.videoUrl,
        thumbnailUrl: videoData.videoUrl, // Use video URL as thumbnail for now
        duration: videoData.duration,
        title: videoData.title,
        views: 0,
        likes: 0,
        timestamp: new Date().toISOString(),
        filter: videoData.filter as any,
        sticker: videoData.sticker as any,
        stickerPosition: videoData.stickerPosition,
      };

      const updatedVideos = [newVideo, ...userVideos];
      await AsyncStorage.setItem(STORAGE_KEYS.USER_VIDEOS, JSON.stringify(updatedVideos));
      return updatedVideos;
    },
    onSuccess: (data) => {
      setUserVideos(data);
    },
  });

  const allVideos = useMemo(() => [...userVideos, ...mockVideos], [userVideos]);

  const nearbyVideos = useMemo(() => {
    const videosWithScores = allVideos.map(video => {
      const venue = mockVenues.find(v => v.id === video.venueId);
      if (!venue) return null;

      const distance = calculateDistance(
        USER_LOCATION.latitude,
        USER_LOCATION.longitude,
        venue.location.latitude,
        venue.location.longitude
      );

      if (distance > NEARBY_RADIUS_MILES) return null;

      const ageMs = Date.now() - new Date(video.timestamp).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const isLive = ageHours < 6;
      const recencyScore = isLive ? 100 : Math.max(0, 100 - ageHours * 5);

      const distanceScore = Math.max(0, 100 - (distance / NEARBY_RADIUS_MILES) * 100);

      const venueVibe = getVenueVibe(venue.id);
      let vibeBoost = 0;
      if (venueVibe) {
        const hasWhales = profile.badges.some(b =>
          b.venueId === venue.id && (b.badgeType === 'WHALE' || b.badgeType === 'PLATINUM')
        );
        const vibeScore = (venueVibe.musicScore + venueVibe.densityScore) / 2;
        if (vibeScore >= 4 || hasWhales) {
          vibeBoost = 50;
        }
      }

      // Use calculated vibe from user feedback, fallback to static value
      const vibeLevel = calculateVibePercentage(venue.id) ?? venue.currentVibeLevel;
      const totalScore = (recencyScore * 0.5) + (distanceScore * 0.3) + (vibeLevel * 0.2) + vibeBoost;

      return {
        video,
        score: totalScore,
        distance,
      };
    }).filter(item => item !== null);

    return videosWithScores
      .sort((a, b) => b!.score - a!.score)
      .map(item => item!.video);
  }, [allVideos, profile.badges, getVenueVibe, calculateVibePercentage]);

  const followingVideos = useMemo(() => {
    const followedPerformerIds = profile.followedPerformers;

    const videosWithPriority = allVideos.map(video => {
      const isFromFollowedPerformer = video.performerId && followedPerformerIds.includes(video.performerId);
      
      const friendsAtVenue = friendLocations.filter(loc => loc.venueId === video.venueId);
      const hasFriendPresence = friendsAtVenue.length >= 3;

      if (!isFromFollowedPerformer && !hasFriendPresence) return null;

      const timestamp = new Date(video.timestamp).getTime();
      
      let priority = 0;
      if (hasFriendPresence) {
        priority = 1000000 + timestamp;
      } else if (isFromFollowedPerformer) {
        priority = timestamp;
      }

      return {
        video,
        priority,
        friendCount: friendsAtVenue.length,
      };
    }).filter(item => item !== null);

    return videosWithPriority
      .sort((a, b) => b!.priority - a!.priority)
      .map(item => item!.video);
  }, [allVideos, profile.followedPerformers, friendLocations]);

  const currentVideos = useMemo(() => {
    return feedSettings.selectedFilter === 'NEARBY' ? nearbyVideos : followingVideos;
  }, [feedSettings.selectedFilter, nearbyVideos, followingVideos]);

  const isEmpty = currentVideos.length === 0;

  const suggestedPerformers = useMemo(() => {
    if (feedSettings.selectedFilter !== 'FOLLOWING' || !isEmpty) return [];
    
    const nearbyPerformerIds = new Set<string>();
    nearbyVideos.forEach(video => {
      if (video.performerId && !profile.followedPerformers.includes(video.performerId)) {
        nearbyPerformerIds.add(video.performerId);
      }
    });

    return Array.from(nearbyPerformerIds)
      .map(id => mockPerformers.find(p => p.id === id))
      .filter(p => p !== undefined)
      .slice(0, 5);
  }, [feedSettings.selectedFilter, isEmpty, nearbyVideos, profile.followedPerformers]);

  const suggestedVenues = useMemo(() => {
    if (feedSettings.selectedFilter !== 'FOLLOWING' || !isEmpty) return [];

    const nearbyVenueIds = new Set<string>();
    nearbyVideos.forEach(video => {
      nearbyVenueIds.add(video.venueId);
    });

    return Array.from(nearbyVenueIds)
      .map(id => mockVenues.find(v => v.id === id))
      .filter(v => v !== undefined)
      .slice(0, 5);
  }, [feedSettings.selectedFilter, isEmpty, nearbyVideos]);

  return {
    feedSettings,
    selectedFilter: feedSettings.selectedFilter,
    setFilter,
    videos: currentVideos,
    nearbyVideos,
    followingVideos,
    isEmpty,
    suggestedPerformers,
    suggestedVenues,
    uploadVideo,
    isLoading: feedSettingsQuery.isLoading,
  };
});
