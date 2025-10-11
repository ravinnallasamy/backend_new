const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // Customer Information
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  customerMobile: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // Equipment Information
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: [true, 'Equipment ID is required']
  },
  equipmentName: {
    type: String,
    required: [true, 'Equipment name is required']
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
  
  // Rental Period
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  totalDays: {
    type: Number,
    required: [true, 'Total days is required'],
    min: [1, 'Total days must be at least 1']
  },
  totalHours: {
    type: Number,
    min: [1, 'Total hours must be at least 1']
  },
  
  // Pricing
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price cannot be negative']
  },
  pricePerHour: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  
  // Request Details
  message: {
    type: String,
    required: [true, 'Request message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'in-progress'],
    default: 'pending'
  },
  
  // Response Information
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [1000, 'Response message cannot exceed 1000 characters']
  },
  rejectionReason: {
    type: String,
    enum: [
      'Equipment not available',
      'Date conflict',
      'Price negotiation failed',
      'Customer requirements not met',
      'Equipment under maintenance',
      'Other'
    ]
  },
  
  // Important Dates
  requestDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  responseDate: {
    type: Date
  },
  approvedDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  cancelledDate: {
    type: Date
  },
  inProgressDate: {
    type: Date
  },
  
  // Delivery Information
  deliveryAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery address cannot exceed 500 characters']
  },
  deliveryRequired: {
    type: Boolean,
    default: false
  },
  deliveryCharges: {
    type: Number,
    min: [0, 'Delivery charges cannot be negative'],
    default: 0
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded'],
    default: 'pending'
  },
  advancePayment: {
    type: Number,
    min: [0, 'Advance payment cannot be negative'],
    default: 0
  },
  remainingPayment: {
    type: Number,
    min: [0, 'Remaining payment cannot be negative']
  },
  
  // Additional Information
  specialRequirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requirements cannot exceed 500 characters']
  },
  operatorRequired: {
    type: Boolean,
    default: false
  },
  operatorCharges: {
    type: Number,
    min: [0, 'Operator charges cannot be negative'],
    default: 0
  },
  
  // Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  // Feedback (after completion)
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerFeedback: {
    type: String,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  providerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  providerFeedback: {
    type: String,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  feedbackDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
requestSchema.index({ customerId: 1 });
requestSchema.index({ providerId: 1 });
requestSchema.index({ equipmentId: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ requestDate: -1 });
requestSchema.index({ startDate: 1, endDate: 1 });
requestSchema.index({ isActive: 1 });
requestSchema.index({ customerEmail: 1 });
requestSchema.index({ providerEmail: 1 });

// Virtual for request duration in days
requestSchema.virtual('durationInDays').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for request summary
requestSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    customerName: this.customerName,
    equipmentName: this.equipmentName,
    providerName: this.providerName,
    startDate: this.startDate,
    endDate: this.endDate,
    totalAmount: this.totalAmount,
    status: this.status,
    requestDate: this.requestDate
  };
});

// Virtual for checking if request is overdue
requestSchema.virtual('isOverdue').get(function() {
  if (this.status === 'in-progress' && this.endDate && new Date() > this.endDate) {
    return true;
  }
  return false;
});

// Virtual for days until start
requestSchema.virtual('daysUntilStart').get(function() {
  if (this.startDate) {
    const today = new Date();
    const diffTime = this.startDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware to calculate remaining payment
requestSchema.pre('save', function(next) {
  if (this.totalAmount && this.advancePayment) {
    this.remainingPayment = this.totalAmount - this.advancePayment;
  }
  
  // Auto-calculate total days if not provided
  if (this.startDate && this.endDate && !this.totalDays) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  next();
});

// Static method to find active requests by customer
requestSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId, isActive: true }).sort({ requestDate: -1 });
};

// Static method to find active requests by provider
requestSchema.statics.findByProvider = function(providerId) {
  return this.find({ providerId, isActive: true }).sort({ requestDate: -1 });
};

// Static method to find requests by status
requestSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true }).sort({ requestDate: -1 });
};

// Instance method to mark as completed
requestSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedDate = new Date();
  return this.save();
};

// Instance method to cancel request
requestSchema.methods.cancelRequest = function(reason = 'Cancelled by user') {
  this.status = 'cancelled';
  this.cancelledDate = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Instance method to add feedback
requestSchema.methods.addFeedback = function(rating, feedback, fromCustomer = true) {
  if (fromCustomer) {
    this.customerRating = rating;
    this.customerFeedback = feedback;
  } else {
    this.providerRating = rating;
    this.providerFeedback = feedback;
  }
  this.feedbackDate = new Date();
  return this.save();
};

// This model stores rental requests
module.exports = mongoose.model('Request', requestSchema, 'requests');