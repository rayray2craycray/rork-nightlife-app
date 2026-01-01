/**
 * Service Layer Exports
 * Single entry point for all API services
 */

export { api, apiClient, ApiClient, ApiError } from './api';
export { venuesService } from './venues.service';
export { videosService } from './videos.service';
export { userService } from './user.service';

// Export contact and Instagram services
export * from './contacts.service';
export * from './instagram.service';
export * from './suggestions.service';

// Re-export for convenience
export const services = {
  venues: venuesService,
  videos: videosService,
  user: userService,
};
