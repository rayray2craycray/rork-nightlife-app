import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface User {
  id: string;
  email: string;
  displayName: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

interface SignInData {
  email: string;
  password: string;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vibelink_access_token',
  REFRESH_TOKEN: 'vibelink_refresh_token',
  TOKEN_EXPIRY: 'vibelink_token_expiry',
  USER_DATA: 'vibelink_user_data',
};

// Helper to get API URL based on platform
const getApiUrl = () => {
  if (__DEV__) {
    // Development: use localhost or 10.0.2.2 for Android emulator
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';
  }
  // Production
  return 'https://api.rork.app';
};

const API_BASE_URL = getApiUrl();

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const [token, expiryStr, userData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY),
          AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        ]);

        if (token && expiryStr && userData) {
          const expiry = parseInt(expiryStr, 10);
          const now = Date.now();

          if (now < expiry) {
            // Token still valid
            setAccessToken(token);
            setUser(JSON.parse(userData));
            setIsAuthenticated(true);
          } else {
            // Token expired, try to refresh
            await attemptTokenRefresh();
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto refresh token 5 minutes before expiry
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const checkTokenExpiry = async () => {
      try {
        const expiryStr = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
        if (!expiryStr) return;

        const expiry = parseInt(expiryStr, 10);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // If token expires in less than 5 minutes, refresh it
        if (expiry - now < fiveMinutes) {
          await attemptTokenRefresh();
        }
      } catch (error) {
        console.error('Failed to check token expiry:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, accessToken]);

  const attemptTokenRefresh = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } = data.data;
        const expiresAt = Date.now() + expiresIn * 1000;

        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken),
          AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken),
          AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiresAt.toString()),
        ]);

        setAccessToken(newAccessToken);
        setIsAuthenticated(true);
        return true;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth state and redirect to sign in
      await signOut();
      return false;
    }
  };

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Sign up failed');
      }

      return result.data;
    },
    onSuccess: async (data) => {
      const { user: userData, accessToken: token, refreshToken, expiresIn } = data;
      const expiresAt = Date.now() + expiresIn * 1000;

      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiresAt.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
      ]);

      setAccessToken(token);
      setUser(userData);
      setIsAuthenticated(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome!', 'Your account has been created successfully.');

      // Navigate to main app
      router.replace('/(tabs)/discovery');
    },
    onError: (error: any) => {
      Alert.alert('Sign Up Failed', error.message || 'Could not create your account. Please try again.');
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Sign in failed');
      }

      return result.data;
    },
    onSuccess: async (data) => {
      const { user: userData, accessToken: token, refreshToken, expiresIn } = data;
      const expiresAt = Date.now() + expiresIn * 1000;

      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiresAt.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
      ]);

      setAccessToken(token);
      setUser(userData);
      setIsAuthenticated(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to main app
      router.replace('/(tabs)/discovery');
    },
    onError: (error: any) => {
      Alert.alert('Sign In Failed', error.message || 'Invalid email or password.');
    },
  });

  const signOut = useCallback(async () => {
    try {
      // Call backend to invalidate refresh token
      if (accessToken) {
        await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Sign out API call failed:', error);
      // Continue with local sign out even if API fails
    }

    // Clear AsyncStorage
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
    ]);

    // Clear React Query cache
    queryClient.clear();

    // Update state
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);

    // Navigate to sign in
    router.replace('/auth/sign-in');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [accessToken, queryClient]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user || !accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Update failed');
      }

      const updatedUser = { ...user, ...result.data };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not update profile.');
      throw error;
    }
  }, [user, accessToken]);

  const getAuthHeader = useCallback(() => {
    return accessToken ? `Bearer ${accessToken}` : '';
  }, [accessToken]);

  return {
    // State
    isAuthenticated,
    isLoading,
    user,
    userId: user?.id || null,
    accessToken,

    // Methods
    signUp: signUpMutation.mutate,
    signIn: signInMutation.mutate,
    signOut,
    updateProfile,
    getAuthHeader,

    // Loading states
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
  };
});
