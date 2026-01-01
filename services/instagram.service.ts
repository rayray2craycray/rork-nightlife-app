/**
 * Instagram Service
 * Handles Instagram OAuth and fetching following list for friend suggestions
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exchangeInstagramCode, syncInstagram } from './api';

WebBrowser.maybeCompleteAuthSession();

const USE_MOCK_DATA = process.env.NODE_ENV === 'development';
const ENABLE_INSTAGRAM_SYNC = process.env.ENABLE_INSTAGRAM_SYNC === 'true';

const STORAGE_KEYS = {
  INSTAGRAM_TOKEN: 'nox_instagram_token',
  INSTAGRAM_USER: 'nox_instagram_user',
  INSTAGRAM_FOLLOWING: 'nox_instagram_following',
  INSTAGRAM_TOKEN_EXPIRES: 'nox_instagram_token_expires',
};

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

export interface InstagramFollowing {
  id: string;
  username: string;
  fullName?: string;
  profilePicture?: string;
  userId?: string; // Matched user ID in the app (if they're also on the app)
}

export interface InstagramSyncResult {
  user: InstagramUser;
  following: InstagramFollowing[];
  syncedAt: string;
}

/**
 * Instagram OAuth configuration
 * For production: Use Instagram Graph API (not Basic Display API)
 * Graph API provides access to following list and more features
 * https://developers.facebook.com/docs/instagram-api
 */
const INSTAGRAM_CONFIG = {
  clientId: process.env.INSTAGRAM_CLIENT_ID || '',
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'nox',
    path: 'instagram-callback',
  }),
  // Graph API scopes (requires Business/Creator account)
  scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
};

/**
 * Check if Instagram token is still valid
 */
async function isTokenValid(): Promise<boolean> {
  try {
    const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_TOKEN_EXPIRES);
    if (!expiresAt) return false;

    const expires = new Date(expiresAt);
    const now = new Date();

    // Consider token expired if less than 1 day remaining
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return expires > oneDayFromNow;
  } catch {
    return false;
  }
}

/**
 * Check if user has connected Instagram
 */
export async function hasInstagramConnected(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_TOKEN);
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Connect Instagram account via OAuth
 * Production-ready implementation using Instagram Graph API
 */
export async function connectInstagram(): Promise<InstagramUser | null> {
  if (!ENABLE_INSTAGRAM_SYNC) {
    console.log('Instagram sync is disabled');
    Alert.alert('Instagram Sync Disabled', 'Contact sync is currently disabled.');
    return null;
  }

  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log('Using mock Instagram connection (development mode)');
      // Simulate OAuth delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockUser: InstagramUser = {
        id: 'instagram-123456',
        username: 'user.nightlife',
        name: 'Night Life User',
        profilePictureUrl: 'https://i.pravatar.cc/150?img=50',
      };

      await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_USER, JSON.stringify(mockUser));
      await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_TOKEN, 'mock-token-' + Date.now());

      // Mock token expires in 60 days
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_TOKEN_EXPIRES, expiresAt.toISOString());

      return mockUser;
    }

    // PRODUCTION: Check if we have client credentials configured
    if (!INSTAGRAM_CONFIG.clientId || !INSTAGRAM_CONFIG.clientSecret) {
      console.error('Instagram OAuth credentials not configured');
      Alert.alert(
        'Configuration Error',
        'Instagram integration is not configured. Please contact support.'
      );
      return null;
    }

    // Build OAuth authorization URL
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CONFIG.clientId}&redirect_uri=${encodeURIComponent(INSTAGRAM_CONFIG.redirectUri)}&scope=${INSTAGRAM_CONFIG.scopes.join(',')}&response_type=code`;

    console.log('Opening Instagram OAuth flow...');

    // Open OAuth browser session
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      INSTAGRAM_CONFIG.redirectUri
    );

    if (result.type !== 'success' || !result.url) {
      console.log('Instagram OAuth cancelled or failed');
      return null;
    }

    // Extract authorization code from callback URL
    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('No authorization code received from Instagram');
      Alert.alert('Authentication Error', 'No authorization code received.');
      return null;
    }

    console.log('Exchanging authorization code for access token...');

    // Exchange code for access token via our backend
    // Backend will securely handle client secret and token exchange
    const tokenData = await exchangeInstagramCode(code);

    if (!tokenData.accessToken) {
      console.error('Failed to get access token from backend');
      Alert.alert('Authentication Error', 'Failed to authenticate with Instagram.');
      return null;
    }

    const user: InstagramUser = {
      id: tokenData.userId,
      username: tokenData.username,
    };

    // Store credentials
    await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_TOKEN, tokenData.accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_USER, JSON.stringify(user));

    // Instagram Graph API tokens typically expire in 60 days
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_TOKEN_EXPIRES, expiresAt.toISOString());

    console.log('Instagram connected successfully');

    return user;
  } catch (error) {
    console.error('Instagram connection error:', error);
    Alert.alert('Connection Error', 'Failed to connect Instagram. Please try again.');
    return null;
  }
}

/**
 * Disconnect Instagram account
 */
export async function disconnectInstagram(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.INSTAGRAM_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.INSTAGRAM_USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.INSTAGRAM_FOLLOWING);
    await AsyncStorage.removeItem(STORAGE_KEYS.INSTAGRAM_TOKEN_EXPIRES);
    console.log('Instagram disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Instagram:', error);
  }
}

/**
 * Get Instagram following list
 * In production, this is fetched from backend which calls Instagram Graph API
 */
export async function getInstagramFollowing(): Promise<InstagramFollowing[]> {
  if (!ENABLE_INSTAGRAM_SYNC) {
    console.log('Instagram sync is disabled');
    return [];
  }

  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_TOKEN);

    if (!token) {
      return [];
    }

    // Check if token is still valid
    const tokenValid = await isTokenValid();
    if (!tokenValid) {
      console.log('Instagram token expired');
      await disconnectInstagram();
      return [];
    }

    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log('Using mock Instagram following data (development mode)');
      return mockInstagramFollowing;
    }

    // PRODUCTION: Fetch from backend
    // Backend will use the token to fetch following list from Instagram Graph API
    console.log('Fetching Instagram following from backend...');

    const user = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_USER);
    if (!user) {
      return [];
    }

    const userData = JSON.parse(user);
    const response = await syncInstagram({
      accessToken: token,
      userId: 'user-me', // Current user ID
    });

    const following: InstagramFollowing[] = response.matches.map(match => ({
      id: match.instagramId,
      username: match.instagramUsername,
      fullName: match.displayName,
      profilePicture: match.avatarUrl,
      userId: match.userId,
    }));

    // Cache the following list
    await AsyncStorage.setItem(
      STORAGE_KEYS.INSTAGRAM_FOLLOWING,
      JSON.stringify(following)
    );

    console.log(`Fetched ${following.length} Instagram following matches`);

    return following;
  } catch (error) {
    console.error('Error fetching Instagram following:', error);

    // Fallback to cached data
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_FOLLOWING);
      if (cached) {
        console.log('Using cached Instagram following data');
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('Error reading cached Instagram data:', cacheError);
    }

    return [];
  }
}

/**
 * Sync Instagram following with backend to find matches
 * This is a wrapper around getInstagramFollowing for convenience
 */
export async function syncInstagramFollowing(): Promise<InstagramSyncResult | null> {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_USER);

    if (!userJson) {
      return null;
    }

    // Fetch following list (this also syncs with backend in production)
    const following = await getInstagramFollowing();

    const syncResult: InstagramSyncResult = {
      user: JSON.parse(userJson),
      following,
      syncedAt: new Date().toISOString(),
    };

    return syncResult;
  } catch (error) {
    console.error('Error syncing Instagram following:', error);
    return null;
  }
}

/**
 * Get Instagram-based friend suggestions
 */
export async function getInstagramSuggestions(): Promise<InstagramFollowing[]> {
  try {
    const isConnected = await hasInstagramConnected();

    if (!isConnected) {
      return [];
    }

    const syncResult = await syncInstagramFollowing();
    return syncResult?.following.filter(f => f.userId) || [];
  } catch (error) {
    console.error('Error getting Instagram suggestions:', error);
    return [];
  }
}

// Mock Instagram following data for development
const mockInstagramFollowing: InstagramFollowing[] = [
  {
    id: 'ig-1',
    username: 'sarah_vibes',
    fullName: 'Sarah Chen',
    profilePicture: 'https://i.pravatar.cc/150?img=1',
    userId: 'suggested-1', // This user is on the app
  },
  {
    id: 'ig-2',
    username: 'marcus_nightlife',
    fullName: 'Marcus Wright',
    profilePicture: 'https://i.pravatar.cc/150?img=12',
    userId: 'suggested-2',
  },
  {
    id: 'ig-3',
    username: 'emma_techno',
    fullName: 'Emma Rodriguez',
    profilePicture: 'https://i.pravatar.cc/150?img=5',
    userId: 'suggested-3',
  },
  {
    id: 'ig-4',
    username: 'jordan.edm',
    fullName: 'Jordan Kim',
    profilePicture: 'https://i.pravatar.cc/150?img=8',
    userId: 'suggested-4',
  },
  {
    id: 'ig-5',
    username: 'taylor_party',
    fullName: 'Taylor Brooks',
    profilePicture: 'https://i.pravatar.cc/150?img=9',
    userId: 'suggested-5',
  },
];
