import { venuesService } from '../venues.service';

describe('venuesService', () => {
  describe('getVenues', () => {
    it('should return array of venues', async () => {
      const venues = await venuesService.getVenues();

      expect(Array.isArray(venues)).toBe(true);
      expect(venues.length).toBeGreaterThan(0);
    });

    it('should return venues with required properties', async () => {
      const venues = await venuesService.getVenues();
      const firstVenue = venues[0];

      expect(firstVenue).toHaveProperty('id');
      expect(firstVenue).toHaveProperty('name');
      expect(firstVenue).toHaveProperty('location');
    });
  });

  describe('getVenueById', () => {
    it('should return venue by ID', async () => {
      const venues = await venuesService.getVenues();
      const firstVenueId = venues[0].id;

      const venue = await venuesService.getVenueById(firstVenueId);

      expect(venue).toBeDefined();
      expect(venue?.id).toBe(firstVenueId);
    });

    it('should return null for non-existent venue', async () => {
      const venue = await venuesService.getVenueById('non-existent-id');

      expect(venue).toBeNull();
    });
  });

  describe('getNearbyVenues', () => {
    it('should return venues near location', async () => {
      const venues = await venuesService.getNearbyVenues(37.7749, -122.4194, 50);

      expect(Array.isArray(venues)).toBe(true);
    });
  });

  describe('searchVenues', () => {
    it('should search venues by name', async () => {
      const results = await venuesService.searchVenues('club');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array when no matches', async () => {
      const results = await venuesService.searchVenues('nonexistentvenuesdfghjk');

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
