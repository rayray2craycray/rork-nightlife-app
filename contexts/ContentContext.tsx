import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Performer,
  PerformerPost,
  HighlightVideo,
  Event,
  CalendarFilter,
} from '@/types';
import {
  mockPerformers,
  mockPerformerPosts,
  mockHighlightVideos,
  getPerformerById,
  getPerformerPosts,
  getFeedPosts,
  getActiveHighlights,
  getVenueHighlights,
} from '@/mocks/content';
import { mockEvents } from '@/mocks/events';
import { contentApi } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  PERFORMER_FOLLOWS: 'vibelink_performer_follows',
  PERFORMER_POSTS: 'vibelink_performer_posts',
  HIGHLIGHT_VIDEOS: 'vibelink_highlight_videos',
  POST_LIKES: 'vibelink_post_likes',
};

export const [ContentProvider, useContent] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  // ===== QUERIES =====
  const performerFollowsQuery = useQuery({
    queryKey: ['performer-follows'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PERFORMER_FOLLOWS);
      if (stored) {
        return JSON.parse(stored) as string[]; // Array of performer IDs
      }
      // Default: follow the first 2 performers
      const defaultFollows = [mockPerformers[0].id, mockPerformers[1].id];
      await AsyncStorage.setItem(STORAGE_KEYS.PERFORMER_FOLLOWS, JSON.stringify(defaultFollows));
      return defaultFollows;
    },
  });

  const performerPostsQuery = useQuery({
    queryKey: ['performer-posts'],
    queryFn: async () => {
      try {
        // Use userId from auth context
        const response = await contentApi.getPerformerFeed(userId);
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch performer posts:', error);
        return mockPerformerPosts;
      }
    },
  });

  const highlightVideosQuery = useQuery({
    queryKey: ['highlight-videos'],
    queryFn: async () => {
      try {
        const response = await contentApi.getActiveHighlights();
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch highlight videos:', error);
        return mockHighlightVideos;
      }
    },
  });

  const postLikesQuery = useQuery({
    queryKey: ['post-likes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.POST_LIKES);
      if (stored) {
        return JSON.parse(stored) as string[]; // Array of liked post IDs
      }
      return [];
    },
  });

  // ===== MUTATIONS =====
  const updatePerformerFollowsMutation = useMutation({
    mutationFn: async (follows: string[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PERFORMER_FOLLOWS, JSON.stringify(follows));
      return follows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-follows'] });
    },
  });

  const updatePerformerPostsMutation = useMutation({
    mutationFn: async (posts: PerformerPost[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PERFORMER_POSTS, JSON.stringify(posts));
      return posts;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-posts'] });
    },
  });

  const updateHighlightVideosMutation = useMutation({
    mutationFn: async (highlights: HighlightVideo[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.HIGHLIGHT_VIDEOS, JSON.stringify(highlights));
      return highlights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlight-videos'] });
    },
  });

  const updatePostLikesMutation = useMutation({
    mutationFn: async (likes: string[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.POST_LIKES, JSON.stringify(likes));
      return likes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-likes'] });
    },
  });

  // ===== COMPUTED VALUES =====
  const performerFollows = useMemo(() => performerFollowsQuery.data || [], [performerFollowsQuery.data]);
  const performerPosts = useMemo(() => performerPostsQuery.data || [], [performerPostsQuery.data]);
  const highlightVideos = useMemo(() => highlightVideosQuery.data || [], [highlightVideosQuery.data]);
  const postLikes = useMemo(() => postLikesQuery.data || [], [postLikesQuery.data]);

  const followedPerformers = useMemo(() => {
    return mockPerformers.filter(p => performerFollows.includes(p.id));
  }, [performerFollows]);

  const feedPosts = useMemo(() => {
    // Get posts from followed performers, sorted by timestamp
    return performerPosts
      .filter(post => performerFollows.includes(post.performerId))
      .map(post => ({
        ...post,
        likedByUser: postLikes.includes(post.id),
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [performerPosts, performerFollows, postLikes]);

  const activeHighlights = useMemo(() => {
    const now = new Date();
    return highlightVideos
      .filter(h => {
        const expiresAt = new Date(h.expiresAt);
        return h.isActive && expiresAt > now;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [highlightVideos]);

  // ===== PERFORMER FUNCTIONS =====
  const followPerformerMutation = useMutation({
    mutationFn: async (performerId: string) => {
      try {
        // Use userId from auth context
        const response = await contentApi.followPerformer(userId, performerId);
        return response.data!;
      } catch (error) {
        console.error('Failed to follow performer:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-follows'] });
      queryClient.invalidateQueries({ queryKey: ['performer-posts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'You are now following this performer!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to follow performer');
    },
  });

  const unfollowPerformerMutation = useMutation({
    mutationFn: async (performerId: string) => {
      try {
        // Use userId from auth context
        const response = await contentApi.unfollowPerformer(userId, performerId);
        return response.data!;
      } catch (error) {
        console.error('Failed to unfollow performer:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-follows'] });
      queryClient.invalidateQueries({ queryKey: ['performer-posts'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to unfollow performer');
    },
  });

  const followPerformer = useCallback((performerId: string) => {
    if (!performerFollows.includes(performerId)) {
      followPerformerMutation.mutate(performerId);
    }
  }, [performerFollows, followPerformerMutation]);

  const unfollowPerformer = useCallback((performerId: string) => {
    unfollowPerformerMutation.mutate(performerId);
  }, [unfollowPerformerMutation]);

  const isFollowingPerformer = useCallback((performerId: string) => {
    return performerFollows.includes(performerId);
  }, [performerFollows]);

  // ===== POST FUNCTIONS =====
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      try {
        // Use userId from auth context
        const response = await contentApi.likePost(postId, userId);
        return response.data!;
      } catch (error) {
        console.error('Failed to like post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-likes'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to like post');
    },
  });

  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      try {
        // Use userId from auth context
        const response = await contentApi.unlikePost(postId, userId);
        return response.data!;
      } catch (error) {
        console.error('Failed to unlike post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performer-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-likes'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to unlike post');
    },
  });

  const likePost = useCallback((postId: string) => {
    if (!postLikes.includes(postId)) {
      likePostMutation.mutate(postId);
    }
  }, [postLikes, likePostMutation]);

  const unlikePost = useCallback((postId: string) => {
    unlikePostMutation.mutate(postId);
  }, [unlikePostMutation]);

  const getPostsForPerformer = useCallback((performerId: string) => {
    return performerPosts
      .filter(post => post.performerId === performerId)
      .map(post => ({
        ...post,
        likedByUser: postLikes.includes(post.id),
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [performerPosts, postLikes]);

  // ===== HIGHLIGHT FUNCTIONS =====
  const uploadHighlightMutation = useMutation({
    mutationFn: async (highlight: Omit<HighlightVideo, 'id' | 'createdAt' | 'expiresAt' | 'isActive'>) => {
      try {
        // Use userId from auth context
        const response = await contentApi.uploadHighlight({
          userId,
          venueId: highlight.venueId,
          videoUrl: highlight.videoUrl,
          thumbnailUrl: highlight.thumbnailUrl,
          duration: highlight.duration,
        });
        return response.data!;
      } catch (error) {
        console.error('Failed to upload highlight:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlight-videos'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Highlight uploaded successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to upload highlight');
    },
  });

  const uploadHighlight = useCallback((highlight: Omit<HighlightVideo, 'id' | 'createdAt' | 'expiresAt' | 'isActive'>) => {
    uploadHighlightMutation.mutate(highlight);
  }, [uploadHighlightMutation]);

  const getHighlightsForVenue = useCallback((venueId: string) => {
    return activeHighlights.filter(h => h.venueId === venueId);
  }, [activeHighlights]);

  const incrementHighlightViewsMutation = useMutation({
    mutationFn: async (highlightId: string) => {
      try {
        const response = await contentApi.incrementHighlightViews(highlightId);
        return response.data!;
      } catch (error) {
        console.error('Failed to increment highlight views:', error);
        // Don't throw error - view tracking failure shouldn't disrupt UX
        return null;
      }
    },
    onSuccess: () => {
      // Optionally update local cache
      queryClient.invalidateQueries({ queryKey: ['highlight-videos'] });
    },
  });

  const incrementHighlightViews = useCallback((highlightId: string) => {
    incrementHighlightViewsMutation.mutate(highlightId);
  }, [incrementHighlightViewsMutation]);

  // ===== CALENDAR FUNCTIONS =====
  const getFilteredEvents = useCallback((filter: CalendarFilter) => {
    let filtered = [...mockEvents];

    // Filter by venue
    if (filter.venueIds && filter.venueIds.length > 0) {
      filtered = filtered.filter(event => filter.venueIds!.includes(event.venueId));
    }

    // Filter by performers
    if (filter.performerIds && filter.performerIds.length > 0) {
      filtered = filtered.filter(event =>
        event.performerIds.some(pid => filter.performerIds!.includes(pid))
      );
    }

    // Filter by genres
    if (filter.genres && filter.genres.length > 0) {
      filtered = filtered.filter(event =>
        event.genres.some(genre => filter.genres!.includes(genre))
      );
    }

    // Filter by date range
    if (filter.dateRange) {
      const startDate = new Date(filter.dateRange.start);
      const endDate = new Date(filter.dateRange.end);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Filter by price range
    if (filter.priceRange) {
      filtered = filtered.filter(event => {
        const minPrice = Math.min(...event.ticketTiers.map(t => t.price));
        return minPrice >= filter.priceRange!.min && minPrice <= filter.priceRange!.max;
      });
    }

    // Sort by date
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const getUpcomingEvents = useCallback((limit?: number) => {
    const now = new Date();
    const upcoming = mockEvents
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return limit ? upcoming.slice(0, limit) : upcoming;
  }, []);

  return {
    // Performers
    performers: mockPerformers,
    followedPerformers,
    followPerformer,
    unfollowPerformer,
    isFollowingPerformer,
    getPerformerById,
    // Posts
    feedPosts,
    getPostsForPerformer,
    likePost,
    unlikePost,
    // Highlights
    activeHighlights,
    getHighlightsForVenue,
    uploadHighlight,
    incrementHighlightViews,
    // Calendar
    getFilteredEvents,
    getUpcomingEvents,
    // Loading states
    isLoading: performerFollowsQuery.isLoading || performerPostsQuery.isLoading || highlightVideosQuery.isLoading,
  };
});
