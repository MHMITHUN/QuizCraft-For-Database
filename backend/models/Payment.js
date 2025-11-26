const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  provider: { type: String, enum: ['stripe','paypal','manual','other'], default: 'manual' },
  status: { type: String, enum: ['pending','succeeded','failed','refunded'], default: 'pending' },
  subscriptionPlan: { type: String, enum: ['free','premium','institutional'] },
  transactionId: { type: String },
  meta: { type: Object }
}, { collection: 'payments', timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
