const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['bank', 'cash'], required: true },
    name: { type: String, required: true, trim: true },
    balance: { type: Number, required: true, default: 0 },
    isDefaultCash: { type: Boolean, default: false },
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1, isDefaultCash: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
