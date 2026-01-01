/**
 * Venues Service
 * Handles all venue-related API calls
 * Currently uses mock data, easy to swap for real API
 */

import { api } from './api';
import { mockVenues } from '@/mocks/venues';
import type { Venue } from '@/types';

const USE_MOCK_DATA = process.env.NODE_ENV === 'development';

export const venuesService = {
  /**
   * Get all venues
   */
  async getVenues(): Promise<Venue[]> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockVenues;
    }

    return api.get<Venue[]>('/venues');
  },

  /**
   * Get a single venue by ID
   */
  async getVenueById(venueId: string): Promise<Venue | null> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mockVenues.find((v) => v.id === venueId) || null;
    }

    return api.get<Venue>(`/venues/${venueId}`);
  },

  /**
   * Get nearby venues based on location
   */
  async getNearbyVenues(latitude: number, longitude: number, radiusKm: number = 50): Promise<Venue[]> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Filter mock venues by distance (simplified)
      return mockVenues;
    }

    return api.get<Venue[]>(`/venues/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusKm}`);
  },

  /**
   * Search venues by name or location
   */
  async searchVenues(query: string): Promise<Venue[]> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const lowercaseQuery = query.toLowerCase();
      return mockVenues.filter(
        (v) =>
          v.name.toLowerCase().includes(lowercaseQuery) ||
          v.location.city.toLowerCase().includes(lowercaseQuery)
      );
    }

    return api.get<Venue[]>(`/venues/search?q=${encodeURIComponent(query)}`);
  },
};
