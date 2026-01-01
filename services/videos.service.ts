/**
 * Videos Service
 * Handles all video feed related API calls
 */

import { api } from './api';
import { mockFeedVideos } from '@/mocks/feed';
import type { FeedVideo } from '@/types';

const USE_MOCK_DATA = process.env.NODE_ENV === 'development';

export const videosService = {
  /**
   * Get feed videos with optional filters
   */
  async getFeedVideos(filter?: 'nearby' | 'following'): Promise<FeedVideo[]> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return mockFeedVideos;
    }

    const endpoint = filter ? `/videos/feed?filter=${filter}` : '/videos/feed';
    return api.get<FeedVideo[]>(endpoint);
  },

  /**
   * Get videos for a specific venue
   */
  async getVenueVideos(venueId: string): Promise<FeedVideo[]> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockFeedVideos.filter((v) => v.venueId === venueId);
    }

    return api.get<FeedVideo[]>(`/venues/${venueId}/videos`);
  },

  /**
   * Upload a promo video
   */
  async uploadVideo(videoData: FormData): Promise<{ videoId: string; url: string }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        videoId: `video-${Date.now()}`,
        url: 'mock://video-url',
      };
    }

    // Note: For file uploads, don't set Content-Type (let browser set multipart/form-data with boundary)
    return api.post<{ videoId: string; url: string }>('/videos/upload', videoData);
  },

  /**
   * Like a video
   */
  async likeVideo(videoId: string): Promise<{ success: boolean }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    }

    return api.post<{ success: boolean }>(`/videos/${videoId}/like`);
  },

  /**
   * Unlike a video
   */
  async unlikeVideo(videoId: string): Promise<{ success: boolean }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    }

    return api.delete<{ success: boolean }>(`/videos/${videoId}/like`);
  },
};
