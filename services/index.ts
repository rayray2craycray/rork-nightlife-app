/**
 * Service Layer Exports
 * Single entry point for all API services
 */

export { api, apiClient, ApiClient, ApiError } from './api';
export { venuesService } from './venues.service';
export { videosService } from './videos.service';
export { userService } from './user.service';

// Re-export for convenience
export const services = {
  venues: venuesService,
  videos: videosService,
  user: userService,
};
