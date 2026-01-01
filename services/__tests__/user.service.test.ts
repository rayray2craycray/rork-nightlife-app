import { userService } from '../user.service';

describe('userService', () => {
  describe('getProfile', () => {
    it('should return user profile', async () => {
      const profile = await userService.getProfile();

      expect(profile).toBeDefined();
      expect(profile.id).toBe('user-me');
      expect(profile.displayName).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile with new data', async () => {
      const updates = {
        displayName: 'Test User',
        bio: 'Test bio',
      };

      const updated = await userService.updateProfile(updates);

      expect(updated.displayName).toBe('Test User');
      expect(updated.bio).toBe('Test bio');
    });

    it('should preserve existing data when partially updating', async () => {
      const updates = {
        displayName: 'New Name',
      };

      const updated = await userService.updateProfile(updates);

      expect(updated.displayName).toBe('New Name');
      expect(updated.id).toBe('user-me'); // Original data preserved
    });
  });

  describe('createAccount', () => {
    it('should create account and return userId and token', async () => {
      const result = await userService.createAccount('testuser', 'password123');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('token');
      expect(result.userId).toBeTruthy();
      expect(result.token).toBeTruthy();
    });
  });

  describe('login', () => {
    it('should login and return userId and token', async () => {
      const result = await userService.login('testuser', 'password123');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('token');
      expect(result.userId).toBe('user-me');
      expect(result.token).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await userService.logout();

      expect(result.success).toBe(true);
    });
  });
});
