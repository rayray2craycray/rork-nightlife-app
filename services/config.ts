/**
 * API Configuration
 * Centralized configuration for API calls
 */

import Constants from 'expo-constants';

// Get API URL based on environment
const getApiUrl = () => {
  // First, check if we have a URL from app.config.js (production/staging)
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configApiUrl) {
    // In production/staging, always use the configured URL
    if (!__DEV__) {
      return configApiUrl;
    }

    // In development, check if it's pointing to a real server (not localhost)
    if (configApiUrl.startsWith('https://') || configApiUrl.startsWith('http://') && !configApiUrl.includes('localhost')) {
      return configApiUrl;
    }
  }

  // Development mode - use localhost with platform-specific configuration
  if (__DEV__) {
    // For iOS simulator
    if (Constants.platform?.ios) {
      return 'http://localhost:5000';
    }
    // For Android emulator (10.0.2.2 maps to host machine's localhost)
    if (Constants.platform?.android) {
      return 'http://10.0.2.2:5000';
    }
    // Fallback
    return 'http://localhost:5000';
  }

  // Production fallback
  return 'https://api.rork.app';
};

export const API_BASE_URL = getApiUrl();

// Get environment from app.config.js
export const APP_ENVIRONMENT = Constants.expoConfig?.extra?.environment || (__DEV__ ? 'development' : 'production');

// Check if we're in production
export const IS_PRODUCTION = APP_ENVIRONMENT === 'production';
export const IS_STAGING = APP_ENVIRONMENT === 'staging';
export const IS_DEVELOPMENT = APP_ENVIRONMENT === 'development';

// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = Constants.expoConfig?.extra?.cloudinaryCloudName || '';

// Sentry DSN for error tracking
export const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

// Instagram Client ID
export const INSTAGRAM_CLIENT_ID = Constants.expoConfig?.extra?.instagramClientId || '';

export const API_ENDPOINTS = {
  // Health
  health: '/health',

  // Auth
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    instagram: '/api/auth/instagram/token',
  },

  // Users
  users: {
    me: '/api/v1/users/me',
    update: '/api/v1/users/me',
    suggestions: '/api/v1/users/me/suggestions',
  },

  // Business Profile Management
  business: {
    register: '/api/business/register',
    verify: (token: string) => `/api/business/verify-email/${token}`,
    resendVerification: '/api/business/resend-verification',
    profile: '/api/business/profile',
    updateProfile: '/api/business/profile',
  },

  // Venue Management
  venueManagement: {
    roles: '/api/venues/roles',
    detail: (venueId: string) => `/api/venues/${venueId}`,
    updateInfo: (venueId: string) => `/api/venues/${venueId}/info`,
    updateDisplay: (venueId: string) => `/api/venues/${venueId}/display`,
    assignRole: (venueId: string) => `/api/venues/${venueId}/roles`,
    removeRole: (venueId: string, roleId: string) => `/api/venues/${venueId}/roles/${roleId}`,
    staff: (venueId: string) => `/api/venues/${venueId}/staff`,
  },

  // Venues
  venues: {
    list: '/api/v1/venues',
    detail: (id: string) => `/api/v1/venues/${id}`,
    vibeData: (id: string) => `/api/v1/venues/${id}/vibe-data`,
    vibeCheck: (id: string) => `/api/v1/venues/${id}/vibe-check`,
    vibeChecks: (id: string) => `/api/v1/venues/${id}/vibe-checks`,
  },

  // Growth: Group Purchases & Referrals
  growth: {
    groupPurchases: {
      create: '/api/growth/group-purchases',
      list: '/api/growth/group-purchases',
      venue: (venueId: string) => `/api/growth/group-purchases/venue/${venueId}`,
      user: (userId: string) => `/api/growth/group-purchases/user/${userId}`,
      join: (id: string) => `/api/growth/group-purchases/${id}/join`,
      complete: (id: string) => `/api/growth/group-purchases/${id}/complete`,
    },
    referrals: {
      generate: '/api/growth/referrals/generate',
      apply: '/api/growth/referrals/apply',
      stats: (userId: string) => `/api/growth/referrals/stats/${userId}`,
      rewards: (userId: string) => `/api/growth/referrals/rewards/${userId}`,
    },
  },

  // Events: Events, Tickets, Guest Lists
  events: {
    list: '/api/events/events',
    upcoming: '/api/events/events/upcoming',
    detail: (id: string) => `/api/events/events/${id}`,
    venue: (venueId: string) => `/api/events/events/venue/${venueId}`,
    performer: (performerId: string) => `/api/events/events/performer/${performerId}`,
    tickets: {
      purchase: '/api/events/tickets/purchase',
      user: (userId: string) => `/api/events/tickets/user/${userId}`,
      transfer: (id: string) => `/api/events/tickets/${id}/transfer`,
      validate: '/api/events/tickets/validate',
      checkIn: (id: string) => `/api/events/tickets/${id}/check-in`,
      attendance: (eventId: string) => `/api/events/tickets/attendance/${eventId}`,
    },
    guestList: {
      add: '/api/events/guest-list',
      venue: (venueId: string) => `/api/events/guest-list/venue/${venueId}`,
      event: (eventId: string) => `/api/events/guest-list/event/${eventId}`,
      user: (userId: string) => `/api/events/guest-list/user/${userId}`,
      check: '/api/events/guest-list/check',
      checkIn: (id: string) => `/api/events/guest-list/${id}/check-in`,
      cancel: (id: string) => `/api/events/guest-list/${id}/cancel`,
      stats: '/api/events/guest-list/stats',
    },
  },

  // Social: Crews & Challenges
  social: {
    crews: {
      create: '/api/social/crews',
      detail: (id: string) => `/api/social/crews/${id}`,
      user: (userId: string) => `/api/social/crews/user/${userId}`,
      search: '/api/social/crews/search',
      active: '/api/social/crews/discover/active',
      addMember: (id: string) => `/api/social/crews/${id}/members`,
      removeMember: (id: string, userId: string) => `/api/social/crews/${id}/members/${userId}`,
      updateStats: (id: string) => `/api/social/crews/${id}/stats`,
      stats: (id: string) => `/api/social/crews/${id}/stats`,
    },
    challenges: {
      active: '/api/social/challenges/active',
      detail: (id: string) => `/api/social/challenges/${id}`,
      user: (userId: string) => `/api/social/challenges/user/${userId}`,
      join: (id: string) => `/api/social/challenges/${id}/join`,
      progress: (id: string) => `/api/social/challenges/${id}/progress`,
      userProgress: (id: string, userId: string) => `/api/social/challenges/${id}/progress/${userId}`,
      claim: (id: string) => `/api/social/challenges/${id}/claim`,
      venueStats: (venueId: string) => `/api/social/challenges/stats/venue/${venueId}`,
    },
    sync: {
      contacts: '/api/social/sync/contacts',
      instagram: '/api/social/sync/instagram',
    },
  },

  // Content: Performers & Highlights
  content: {
    performers: {
      search: '/api/content/performers/search',
      genre: (genre: string) => `/api/content/performers/genre/${genre}`,
      trending: '/api/content/performers/trending',
      detail: (id: string) => `/api/content/performers/${id}`,
      follow: (id: string) => `/api/content/performers/${id}/follow`,
      unfollow: (id: string) => `/api/content/performers/${id}/unfollow`,
      posts: (id: string) => `/api/content/performers/${id}/posts`,
      feed: (userId: string) => `/api/content/performers/feed/${userId}`,
      likePost: (id: string, postId: string) => `/api/content/performers/${id}/posts/${postId}/like`,
      unlikePost: (id: string, postId: string) => `/api/content/performers/${id}/posts/${postId}/unlike`,
      rate: (id: string) => `/api/content/performers/${id}/rate`,
    },
    highlights: {
      upload: '/api/content/highlights',
      venue: (venueId: string) => `/api/content/highlights/venue/${venueId}`,
      event: (eventId: string) => `/api/content/highlights/event/${eventId}`,
      user: (userId: string) => `/api/content/highlights/user/${userId}`,
      trending: '/api/content/highlights/trending',
      feed: (userId: string) => `/api/content/highlights/feed/${userId}`,
      view: (id: string) => `/api/content/highlights/${id}/view`,
      like: (id: string) => `/api/content/highlights/${id}/like`,
      unlike: (id: string) => `/api/content/highlights/${id}/unlike`,
      stats: '/api/content/highlights/stats',
    },
  },

  // Pricing: Dynamic Pricing & Alerts
  pricing: {
    dynamic: {
      current: (venueId: string) => `/api/pricing/dynamic/${venueId}`,
      update: (venueId: string) => `/api/pricing/dynamic/${venueId}/update`,
      calculate: '/api/pricing/dynamic/calculate',
      history: (venueId: string) => `/api/pricing/dynamic/${venueId}/history`,
      stats: (venueId: string) => `/api/pricing/dynamic/${venueId}/stats`,
      apply: (id: string) => `/api/pricing/dynamic/${id}/apply`,
    },
    alerts: {
      create: '/api/pricing/alerts',
      user: (userId: string) => `/api/pricing/alerts/user/${userId}`,
      venue: (venueId: string) => `/api/pricing/alerts/venue/${venueId}`,
      update: (id: string) => `/api/pricing/alerts/${id}`,
      deactivate: (id: string) => `/api/pricing/alerts/${id}/deactivate`,
      delete: (id: string) => `/api/pricing/alerts/${id}`,
      stats: '/api/pricing/alerts/stats',
    },
  },

  // Retention: Streaks & Memories
  retention: {
    streaks: {
      user: (userId: string) => `/api/retention/streaks/user/${userId}`,
      increment: (id: string) => `/api/retention/streaks/${id}/increment`,
      claimMilestone: (id: string, milestone: number) => `/api/retention/streaks/${id}/milestones/${milestone}/claim`,
      leaderboard: (type: string) => `/api/retention/streaks/leaderboard/${type}`,
      atRisk: '/api/retention/streaks/at-risk',
      stats: '/api/retention/streaks/stats',
    },
    memories: {
      create: '/api/retention/memories',
      timeline: (userId: string) => `/api/retention/memories/timeline/${userId}`,
      venue: (venueId: string) => `/api/retention/memories/venue/${venueId}`,
      tagged: (userId: string) => `/api/retention/memories/tagged/${userId}`,
      onThisDay: (userId: string) => `/api/retention/memories/on-this-day/${userId}`,
      highlights: (userId: string) => `/api/retention/memories/highlights/${userId}`,
      like: (id: string) => `/api/retention/memories/${id}/like`,
      unlike: (id: string) => `/api/retention/memories/${id}/unlike`,
      addComment: (id: string) => `/api/retention/memories/${id}/comments`,
      deleteComment: (id: string, commentId: string) => `/api/retention/memories/${id}/comments/${commentId}`,
      stats: '/api/retention/memories/stats',
    },
  },
};

export default API_BASE_URL;
