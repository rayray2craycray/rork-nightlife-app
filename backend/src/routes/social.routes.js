/**
 * Social Routes
 * Endpoints for contact and Instagram sync
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const instagramService = require('../services/instagram.service');

const router = express.Router();

/**
 * POST /social/sync/contacts
 * Sync phone contacts - find users who match hashed phone numbers
 */
router.post(
  '/sync/contacts',
  [
    body('phoneNumbers')
      .isArray({ min: 1 })
      .withMessage('phoneNumbers must be a non-empty array'),
    body('phoneNumbers.*')
      .isString()
      .isLength({ min: 64, max: 64 })
      .withMessage('Each phone hash must be 64 characters (SHA-256)'),
    body('userId')
      .isString()
      .notEmpty()
      .withMessage('userId is required'),
  ],
  async (req, res) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phoneNumbers, userId } = req.body;

      console.log(`Contact sync request: ${phoneNumbers.length} hashes from user ${userId}`);

      // Find users with matching phone hashes (excluding current user)
      const matchedUsers = await User.find({
        phoneHash: { $in: phoneNumbers },
        _id: { $ne: userId },
      }).select('phoneHash displayName avatarUrl');

      // Update last sync timestamp
      await User.findByIdAndUpdate(userId, {
        lastSyncedContacts: new Date(),
      });

      // Format response
      const matches = matchedUsers.map(user => ({
        hashedPhone: user.phoneHash,
        userId: user._id.toString(),
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`,
      }));

      console.log(`Found ${matches.length} contact matches`);

      res.json({
        matches,
        totalMatches: matches.length,
      });
    } catch (error) {
      console.error('Contact sync error:', error);
      res.status(500).json({
        error: 'Failed to sync contacts',
        message: error.message,
      });
    }
  }
);

/**
 * POST /social/sync/instagram
 * Sync Instagram following - fetch following list and match with app users
 */
router.post(
  '/sync/instagram',
  [
    body('accessToken')
      .isString()
      .notEmpty()
      .withMessage('accessToken is required'),
    body('userId')
      .isString()
      .notEmpty()
      .withMessage('userId is required'),
  ],
  async (req, res) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { accessToken, userId } = req.body;

      console.log(`Instagram sync request from user ${userId}`);

      // Get user's Instagram profile to get their Instagram ID
      const profile = await instagramService.getUserProfile(accessToken);

      // Fetch following list from Instagram
      const following = await instagramService.getFollowing(accessToken, profile.id);

      console.log(`Fetched ${following.length} Instagram following`);

      // Extract Instagram IDs and usernames
      const instagramIds = following.map(f => f.id);
      const instagramUsernames = following.map(f => f.username);

      // Find users who match Instagram IDs or usernames (excluding current user)
      const matchedUsers = await User.find({
        $or: [
          { instagramId: { $in: instagramIds } },
          { instagramUsername: { $in: instagramUsernames } },
        ],
        _id: { $ne: userId },
      }).select('instagramId instagramUsername displayName avatarUrl');

      // Update last sync timestamp
      await User.findByIdAndUpdate(userId, {
        lastSyncedInstagram: new Date(),
      });

      // Format response
      const matches = matchedUsers.map(user => ({
        instagramId: user.instagramId,
        instagramUsername: user.instagramUsername,
        userId: user._id.toString(),
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`,
      }));

      console.log(`Found ${matches.length} Instagram matches`);

      res.json({
        matches,
        totalMatches: matches.length,
      });
    } catch (error) {
      console.error('Instagram sync error:', error);
      res.status(500).json({
        error: 'Failed to sync Instagram',
        message: error.message,
      });
    }
  }
);

module.exports = router;
