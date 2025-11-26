const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'premium', 'institutional'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'paused'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer', 'free']
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  transactionId: String,
  features: {
    quizLimit: Number,
    aiGenerations: Number,
    storageLimit: Number, // in MB
    prioritySupport: Boolean,
    customBranding: Boolean
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    default: 'monthly'
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
  return new Date() > this.endDate;
};

// Auto-update status on query
subscriptionSchema.pre(/^find/, function(next) {
  this.where({ endDate: { $gte: new Date() } });
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
