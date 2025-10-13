const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // UPDATED: Make optional
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
  phone: {
    type: String,
    default: '', // UPDATED: Make optional for Google OAuth
    trim: true
  },
  address: {
    type: String,
    default: '', // UPDATED: Make optional for Google OAuth
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  userType: {
    type: String,
    enum: ['provider'],
    default: 'provider'
  },

  // Business Information (from frontend)
  businessName: {
    type: String,
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters'],
    default: function() {
      // Default to provider's name + business if not provided
      return `${this.name}'s Equipment Rental`;
    }
  },
  businessType: {
    type: String,
    default: 'Agricultural Equipment',
    validate: {
      validator: function(value) {
        const allowedValues = [
          'Agricultural Equipment',
          'Farm Services',
          'Agricultural Contractor',
          'Equipment Dealer',
          'Other'
        ];
        return allowedValues.includes(value);
      },
      message: 'businessType must be one of: Agricultural Equipment, Farm Services, Agricultural Contractor, Equipment Dealer, Other'
    }
  },
  licenseNumber: {
    type: String,
    default: '', // UPDATED: Make optional
    trim: true,
    maxlength: [50, 'License number cannot exceed 50 characters']
  },
  serviceArea: {
    type: String,
    default: '', // UPDATED: Make optional
    trim: true,
    maxlength: [300, 'Service area cannot exceed 300 characters']
  },
  experience: {
    type: Number,
    default: 0, // UPDATED: Add default
    min: [0, 'Experience cannot be negative'],
    max: [100, 'Experience cannot exceed 100 years']
  },
  certifications: {
    type: String,
    default: '', // UPDATED: Make optional
    maxlength: [1000, 'Certifications cannot exceed 1000 characters']
  },

  // Status fields
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: true // Always true for Google OAuth
  },
  emailVerified: { // UPDATED: Add email verification status
    type: Boolean,
    default: false
  },
  activatedAt: {
    type: Date,
    default: Date.now
  },

  // Statistics
  totalEquipment: {
    type: Number,
    default: 0
  },
  totalRentals: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
providerSchema.index({ email: 1 });
providerSchema.index({ googleId: 1 });
providerSchema.index({ businessName: 1 });
providerSchema.index({ businessType: 1 });
providerSchema.index({ isActive: 1, isActivated: 1 });
providerSchema.index({ authMethod: 1 });

// Virtual for checking if business profile is complete
providerSchema.virtual('isProfileComplete').get(function() {
  return !!(this.name && this.email && this.phone && this.address && this.businessName);
});

// Virtual for average rating calculation
providerSchema.virtual('averageRating').get(function() {
  return this.reviewCount > 0 ? (this.rating / this.reviewCount).toFixed(1) : 0;
});

// Method to get public profile (excludes sensitive fields)
providerSchema.methods.toPublicJSON = function() {
  const providerObject = this.toObject();
  
  const publicProfile = {
    id: providerObject._id,
    name: providerObject.name,
    email: providerObject.email,
    avatar: providerObject.avatar,
    phone: providerObject.phone,
    address: providerObject.address,
    businessName: providerObject.businessName,
    businessType: providerObject.businessType,
    userType: providerObject.userType,
    isActivated: providerObject.isActivated,
    authMethod: providerObject.authMethod,
    licenseNumber: providerObject.licenseNumber,
    serviceArea: providerObject.serviceArea,
    experience: providerObject.experience,
    certifications: providerObject.certifications,
    totalEquipment: providerObject.totalEquipment,
    totalRentals: providerObject.totalRentals,
    rating: providerObject.rating,
    reviewCount: providerObject.reviewCount,
    averageRating: this.averageRating,
    isProfileComplete: this.isProfileComplete,
    createdAt: providerObject.createdAt,
    updatedAt: providerObject.updatedAt
  };
  
  return publicProfile;
};

// Static method to find by Google ID or email
providerSchema.statics.findByGoogleIdOrEmail = function(googleId, email) {
  return this.findOne({
    $or: [
      { googleId: googleId },
      { email: email.toLowerCase() }
    ]
  });
};

// Static method to create provider from Google OAuth data
providerSchema.statics.createFromGoogle = function(googleData) {
  return this.create({
    name: googleData.name,
    email: googleData.email,
    avatar: googleData.picture,
    googleId: googleData.googleId,
    authMethod: 'google',
    userType: 'provider',
    businessName: `${googleData.name}'s Equipment Rental`,
    businessType: 'Agricultural Equipment',
    emailVerified: googleData.emailVerified,
    isActivated: true,
    isActive: true
  });
};

// Method to update provider profile
providerSchema.methods.updateProfile = function(updates) {
  const allowedUpdates = [
    'name', 'phone', 'address', 'avatar', 
    'businessName', 'businessType', 'licenseNumber',
    'serviceArea', 'experience', 'certifications'
  ];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      this[field] = updates[field];
    }
  });
  return this.save();
};

// Method to update provider statistics
providerSchema.methods.updateStatistics = function() {
  // This can be called when equipment is added/removed or rentals are completed
  // For now, it's a placeholder for future statistics logic
  return this.save();
};

// Pre-save middleware to ensure business name has a default value
providerSchema.pre('save', function(next) {
  if (!this.businessName || this.businessName.trim() === '') {
    this.businessName = `${this.name}'s Equipment Rental`;
  }
  next();
});

// This model stores provider accounts with Google OAuth
module.exports = mongoose.model('Provider', providerSchema, 'providers');