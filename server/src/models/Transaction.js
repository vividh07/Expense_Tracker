const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['expense', 'income', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    fromWalletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    toWalletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    note: { type: String, trim: true, default: '' },
    date: { type: Date, required: true, default: Date.now },
    isRecurringInstance: { type: Boolean, default: false },
    recurringRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringRule' },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
