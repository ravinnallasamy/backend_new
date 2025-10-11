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
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
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
    default: 'Equipment Rental',
    validate: {
      validator: function(value) {
        const allowedValues = [
          'Equipment Rental',
          'Farm Services',
          'Agricultural Contractor',
          'Equipment Dealer',
          'Other',
          '' // Allow empty string
        ];
        return allowedValues.includes(value);
      },
      message: 'businessType must be one of: Equipment Rental, Farm Services, Agricultural Contractor, Equipment Dealer, Other'
    },
    // Transform empty strings to default value
    set: function(value) {
      return value === '' || value == null ? 'Equipment Rental' : value;
    }
  },
  licenseNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'License number cannot exceed 50 characters']
  },
  serviceArea: {
    type: String,
    trim: true,
    maxlength: [300, 'Service area cannot exceed 300 characters']
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [100, 'Experience cannot exceed 100 years']
  },
  certifications: {
    type: String,
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
  
  // Remove any sensitive fields
  delete providerObject.googleId;
  delete providerObject.authMethod;
  delete providerObject.__v;
  
  // Add computed fields
  providerObject.averageRating = this.averageRating;
  providerObject.isProfileComplete = this.isProfileComplete;
  
  return providerObject;
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