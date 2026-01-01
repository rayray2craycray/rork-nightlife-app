/**
 * Instagram Service
 * Handles Instagram OAuth and fetching following list for friend suggestions
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  INSTAGRAM_TOKEN: 'nox_instagram_token',
  INSTAGRAM_USER: 'nox_instagram_user',
  INSTAGRAM_FOLLOWING: 'nox_instagram_following',
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
 * NOTE: You'll need to set up Instagram Basic Display API
 * https://developers.facebook.com/docs/instagram-basic-display-api
 */
const INSTAGRAM_CONFIG = {
  clientId: process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'YOUR_INSTAGRAM_CLIENT_SECRET',
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'nox',
    path: 'instagram-callback',
  }),
  scopes: ['user_profile', 'user_media'],
};

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
 * NOTE: This is a simplified implementation. In production, you'd use Instagram Basic Display API
 */
export async function connectInstagram(): Promise<InstagramUser | null> {
  try {
    // TODO: Implement real Instagram OAuth
    // For now, return mock connection for development

    if (process.env.NODE_ENV === 'development') {
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

      return mockUser;
    }

    // Production OAuth flow would go here
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CONFIG.clientId}&redirect_uri=${INSTAGRAM_CONFIG.redirectUri}&scope=user_profile,user_media&response_type=code`;

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      INSTAGRAM_CONFIG.redirectUri
    );

    if (result.type === 'success' && result.url) {
      // Extract code from callback URL
      const code = new URL(result.url).searchParams.get('code');

      if (code) {
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: INSTAGRAM_CONFIG.clientId,
            client_secret: INSTAGRAM_CONFIG.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: INSTAGRAM_CONFIG.redirectUri,
            code,
          }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
          const user: InstagramUser = {
            id: tokenData.user_id,
            username: tokenData.username || '',
          };

          await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_TOKEN, tokenData.access_token);
          await AsyncStorage.setItem(STORAGE_KEYS.INSTAGRAM_USER, JSON.stringify(user));

          return user;
        }
      }
    }

    return null;
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
  } catch (error) {
    console.error('Error disconnecting Instagram:', error);
  }
}

/**
 * Get Instagram following list
 */
export async function getInstagramFollowing(): Promise<InstagramFollowing[]> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_TOKEN);

    if (!token) {
      return [];
    }

    // TODO: In production, fetch real following list from Instagram API
    // Note: Instagram Basic Display API doesn't provide following list
    // You'd need Instagram Graph API with proper permissions

    if (process.env.NODE_ENV === 'development') {
      // Return mock following data
      return mockInstagramFollowing;
    }

    // Production API call would go here
    return [];
  } catch (error) {
    console.error('Error fetching Instagram following:', error);
    return [];
  }
}

/**
 * Sync Instagram following with backend to find matches
 */
export async function syncInstagramFollowing(): Promise<InstagramSyncResult | null> {
  try {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.INSTAGRAM_USER);

    if (!user) {
      return null;
    }

    const following = await getInstagramFollowing();

    // TODO: Send Instagram usernames to backend to find matches
    // Backend would match Instagram usernames with app users

    const syncResult: InstagramSyncResult = {
      user: JSON.parse(user),
      following,
      syncedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.INSTAGRAM_FOLLOWING,
      JSON.stringify(following)
    );

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
