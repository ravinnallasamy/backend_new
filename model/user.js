// backend/models/User.js
/**
 * User Data Model
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
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
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
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  // Google OAuth fields
  googleId: {
    type: String,
    required: [true, 'Google ID is required'],
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: null
  },
  authMethod: {
    type: String,
    enum: ['google'],
    default: 'google'
  },
  userType: {
    type: String,
    enum: ['user', 'customer'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: true // Always true for Google OAuth (emails are pre-verified)
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
  
  // Remove any sensitive fields
  delete userObject.googleId;
  delete userObject.authMethod;
  delete userObject.__v;
  
  return userObject;
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

// This model stores user/customer accounts with Google OAuth
module.exports = mongoose.model('User', userSchema, 'users');