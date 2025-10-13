const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true,
    maxlength: [200, 'Equipment name cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Tractors',
      'Harvesters',
      'Planters',
      'Tillage Equipment',
      'Irrigation Equipment',
      'Hay Equipment',
      'Tools',
      'Spraying Equipment',
      'Fertilizer Equipment',
      'Livestock Equipment',
      'Other'
    ]
  },
  type: {
    type: String,
    required: [true, 'Equipment type is required'],
    enum: [
      // Tractor Types
      'Utility Tractor',
      'Compact Tractor',
      'Row Crop Tractor',
      'Garden Tractor',

      // Harvesting Equipment
      'Combine Harvester',
      'Forage Harvester',
      'Potato Harvester',
      'Sugar Beet Harvester',

      // Planting Equipment
      'Seed Drill',
      'Planter',
      'Transplanter',
      'Broadcasting Equipment',

      // Tillage Equipment
      'Plow',
      'Cultivator',
      'Harrow',
      'Rotary Tiller',
      'Subsoiler',

      // Irrigation Equipment
      'Irrigation Systems',
      'Sprinkler Systems',
      'Drip Irrigation',
      'Center Pivot',

      // Hay Equipment
      'Mower',
      'Rake',
      'Baler',
      'Tedder',

      // General Categories
      'Heavy Equipment',
      'Light Equipment',
      'Hand Tools',
      'Power Tools',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  priceUnit: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    default: 'hour'
  },
  address: {
    type: String,
    required: [true, 'Location/Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  available: {
    type: Boolean,
    default: true
  },
  
  // Provider Information
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider ID is required']
  },
  providerEmail: {
    type: String,
    required: [true, 'Provider email is required']
  },
  providerName: {
    type: String,
    required: [true, 'Provider name is required']
  },
  
  // Technical Specifications
  specifications: {
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, 'Model name cannot exceed 100 characters']
    },
    year: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear() + 1
    },
    workingWidth: String,
    powerRequirement: String,
    weight: String,
    numberOfRows: String,
    seedBoxCapacity: String,
    fuelType: {
      type: String,
      enum: ['Diesel', 'Petrol', 'Electric', 'CNG', 'Biodiesel', 'Other']
    },
    enginePower: String,
    operatingWeight: String,
    maxSpeed: String,
    dimensions: {
      length: String,
      width: String,
      height: String
    },
    other: mongoose.Schema.Types.Mixed
  },
  
  // Media
  images: [{
    url: {
      type: String,
      required: [true, 'Image URL is required']
    },
    caption: {
      type: String,
      maxlength: [200, 'Caption cannot exceed 200 characters']
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Rental Information
  minimumRentalPeriod: {
    type: Number,
    default: 1, // in hours
    min: [1, 'Minimum rental period must be at least 1 hour']
  },
  maximumRentalPeriod: {
    type: Number,
    default: 720, // in hours (30 days)
    min: [1, 'Maximum rental period must be at least 1 hour']
  },
  depositRequired: {
    type: Number,
    min: [0, 'Deposit cannot be negative'],
    default: 0
  },
  
  // Condition and Maintenance
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Needs Repair'],
    default: 'Good'
  },
  maintenanceHistory: [{
    date: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Maintenance description cannot exceed 500 characters']
    },
    cost: {
      type: Number,
      min: 0
    },
    performedBy: String
  }],
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  
  // Availability Schedule
  availabilitySchedule: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: true },
    sunday: { type: Boolean, default: true }
  },
  
  // Statistics
  totalRentals: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRentalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Dates
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastRentedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
equipmentSchema.index({ providerId: 1 });
equipmentSchema.index({ category: 1 });
equipmentSchema.index({ type: 1 });
equipmentSchema.index({ available: 1 });
equipmentSchema.index({ price: 1 });
equipmentSchema.index({ address: 1 });
equipmentSchema.index({ isActive: 1, isVerified: 1 });
equipmentSchema.index({ averageRating: -1 });
equipmentSchema.index({ 'specifications.brand': 1 });
equipmentSchema.index({ 'specifications.model': 1 });
equipmentSchema.index({ isFeatured: 1 });
equipmentSchema.index({ coordinates: '2dsphere' }); // For geospatial queries

// Virtual for equipment's public info
equipmentSchema.virtual('publicInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    category: this.category,
    type: this.type,
    description: this.description,
    price: this.price,
    priceUnit: this.priceUnit,
    address: this.address,
    coordinates: this.coordinates,
    available: this.available,
    providerName: this.providerName,
    specifications: this.specifications,
    images: this.images,
    condition: this.condition,
    averageRating: this.averageRating,
    reviewCount: this.reviewCount,
    totalRentals: this.totalRentals,
    isFeatured: this.isFeatured,
    createdAt: this.createdAt
  };
});

// Virtual for rental statistics
equipmentSchema.virtual('rentalStats').get(function() {
  return {
    totalRentals: this.totalRentals,
    totalRentalHours: this.totalRentalHours,
    totalEarnings: this.totalEarnings,
    averageRating: this.averageRating,
    reviewCount: this.reviewCount,
    utilizationRate: this.totalRentalHours > 0 ? (this.totalRentalHours / (this.totalRentals * 24)).toFixed(2) : 0
  };
});

// Virtual for primary image
equipmentSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Virtual for maintenance status
equipmentSchema.virtual('maintenanceStatus').get(function() {
  if (this.nextMaintenanceDate && new Date() > this.nextMaintenanceDate) {
    return 'Overdue';
  } else if (this.nextMaintenanceDate && new Date(this.nextMaintenanceDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
    return 'Due Soon';
  }
  return 'Good';
});

// Pre-save middleware to update lastUpdated
equipmentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first one as primary
      for (let i = 1; i < primaryImages.length; i++) {
        primaryImages[i].isPrimary = false;
      }
    }
  }
  
  next();
});

// Static method to find featured equipment
equipmentSchema.statics.findFeatured = function() {
  return this.find({ 
    isActive: true, 
    isVerified: true, 
    isFeatured: true,
    available: true 
  }).sort({ averageRating: -1, totalRentals: -1 });
};

// Static method to find by location (geospatial query)
equipmentSchema.statics.findNearby = function(latitude, longitude, maxDistance = 50000) { // 50km default
  return this.find({
    isActive: true,
    available: true,
    coordinates: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Static method to find by provider
equipmentSchema.statics.findByProvider = function(providerId) {
  return this.find({ providerId, isActive: true }).sort({ createdAt: -1 });
};

// Instance method to mark as rented
equipmentSchema.methods.markAsRented = function(rentalHours, rentalAmount) {
  this.totalRentals += 1;
  this.totalRentalHours += rentalHours;
  this.totalEarnings += rentalAmount;
  this.lastRentedAt = new Date();
  return this.save();
};

// Instance method to update rating
equipmentSchema.methods.updateRating = function(newRating) {
  const totalRating = this.averageRating * this.reviewCount;
  this.reviewCount += 1;
  this.averageRating = (totalRating + newRating) / this.reviewCount;
  return this.save();
};

// Instance method to add maintenance record
equipmentSchema.methods.addMaintenance = function(description, cost = 0, performedBy = 'Unknown') {
  this.maintenanceHistory.push({
    date: new Date(),
    description,
    cost,
    performedBy
  });
  this.lastMaintenanceDate = new Date();
  return this.save();
};

// This model stores equipment information
module.exports = mongoose.model('Equipment', equipmentSchema, 'equipments');x