/**
 * User Model
 * Stores user information including hashed phone numbers and Instagram connections
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic user info
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },

  avatarUrl: {
    type: String,
    default: null,
  },

  bio: {
    type: String,
    maxlength: 200,
    default: null,
  },

  // Contact sync - hashed phone number for privacy
  phoneHash: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
    index: true, // Index for fast lookups
  },

  // Original phone for display (optional, can be removed for privacy)
  phone: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Instagram integration
  instagramId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },

  instagramUsername: {
    type: String,
    unique: true,
    sparse: true,
  },

  instagramAccessToken: {
    type: String,
    default: null,
    select: false, // Don't include in queries by default (security)
  },

  instagramTokenExpires: {
    type: Date,
    default: null,
  },

  // Social features
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Privacy settings
  isIncognito: {
    type: Boolean,
    default: false,
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  lastSyncedContacts: {
    type: Date,
    default: null,
  },

  lastSyncedInstagram: {
    type: Date,
    default: null,
  },
});

// Indexes for performance
userSchema.index({ phoneHash: 1 });
userSchema.index({ instagramId: 1 });
userSchema.index({ instagramUsername: 1 });
userSchema.index({ displayName: 'text' });

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id.toString(),
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    instagramUsername: this.instagramUsername,
    isIncognito: this.isIncognito,
  };
};

userSchema.methods.hasValidInstagramToken = function() {
  if (!this.instagramAccessToken || !this.instagramTokenExpires) {
    return false;
  }

  // Check if token expires in more than 1 day
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.instagramTokenExpires > oneDayFromNow;
};

// Static methods
userSchema.statics.findByPhoneHash = function(phoneHash) {
  return this.findOne({ phoneHash });
};

userSchema.statics.findByInstagramId = function(instagramId) {
  return this.findOne({ instagramId });
};

userSchema.statics.findByPhoneHashes = function(phoneHashes) {
  return this.find({ phoneHash: { $in: phoneHashes } });
};

userSchema.statics.searchUsers = function(query, limit = 20) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
