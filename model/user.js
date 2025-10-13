// backend/models/User.js
/**
 * User Data Model
 * Updated for Google OAuth compatibility
 *
 * This file defines the database schema for regular users (farmers/customers)
 * who want to rent agricultural equipment. The schema includes personal information,
 * contact details, and Google OAuth authentication.
 *
 * Features:
 * - Google OAuth authentication
 * - Profile management
 * - Automatic account activation (Google verified emails)
 * - No password storage required
 */

const mongoose = require('mongoose');

// Define the structure for user data in the database
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    default: '', // UPDATED: Make optional for Google OAuth
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  address: {
    type: String,
    default: '', // UPDATED: Make optional for Google OAuth
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // UPDATED: Make optional (not all users might have it initially)
  },
  avatar: {
    type: String,
    default: ''
  },
  authMethod: {
    type: String,
    enum: ['google', 'traditional'],
    default: 'google'
  },
  userType: {
    type: String,
    enum: ['user'],
    default: 'user' // UPDATED: Remove 'customer' to avoid confusion
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: true // Always true for Google OAuth (emails are pre-verified)
  },
  emailVerified: { // UPDATED: Add email verification status from Google
    type: Boolean,
    default: false
  },
  activatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ authMethod: 1 });

// Virtual for checking if profile is complete
userSchema.virtual('isProfileComplete').get(function() {
  return !!(this.name && this.email && this.phone && this.address);
});

// Method to get public profile (excludes sensitive fields)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  
  const publicProfile = {
    id: userObject._id,
    name: userObject.name,
    email: userObject.email,
    avatar: userObject.avatar,
    phone: userObject.phone,
    address: userObject.address,
    userType: userObject.userType,
    isActivated: userObject.isActivated,
    authMethod: userObject.authMethod,
    isProfileComplete: this.isProfileComplete,
    createdAt: userObject.createdAt,
    updatedAt: userObject.updatedAt
  };
  
  return publicProfile;
};

// Static method to find by Google ID or email
userSchema.statics.findByGoogleIdOrEmail = function(googleId, email) {
  return this.findOne({
    $or: [
      { googleId: googleId },
      { email: email.toLowerCase() }
    ]
  });
};

// Static method to create user from Google OAuth data
userSchema.statics.createFromGoogle = function(googleData) {
  return this.create({
    name: googleData.name,
    email: googleData.email,
    avatar: googleData.picture,
    googleId: googleData.googleId,
    authMethod: 'google',
    userType: 'user',
    emailVerified: googleData.emailVerified,
    isActivated: true,
    isActive: true
  });
};

// Method to update profile
userSchema.methods.updateProfile = function(updates) {
  const allowedUpdates = ['name', 'phone', 'address', 'avatar'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      this[field] = updates[field];
    }
  });
  return this.save();
};

// This model stores user/customer accounts with Google OAuth
module.exports = mongoose.model('User', userSchema, 'users');