/**
 * User Service
 * Handles all user-related API calls
 */

import { api } from './api';
import { mockUserProfile } from '@/mocks/user';
import type { UserProfile } from '@/types';

const USE_MOCK_DATA = process.env.NODE_ENV === 'development';

export const userService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockUserProfile;
    }

    return api.get<UserProfile>('/user/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { ...mockUserProfile, ...updates };
    }

    return api.put<UserProfile>('/user/profile', updates);
  },

  /**
   * Create account
   */
  async createAccount(username: string, password: string): Promise<{ userId: string; token: string }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        userId: `user-${Date.now()}`,
        token: 'mock-token-' + Date.now(),
      };
    }

    return api.post<{ userId: string; token: string }>('/auth/signup', { username, password });
  },

  /**
   * Login
   */
  async login(username: string, password: string): Promise<{ userId: string; token: string }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        userId: 'user-me',
        token: 'mock-token-' + Date.now(),
      };
    }

    return api.post<{ userId: string; token: string }>('/auth/login', { username, password });
  },

  /**
   * Logout
   */
  async logout(): Promise<{ success: boolean }> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    }

    return api.post<{ success: boolean }>('/auth/logout');
  },
};
