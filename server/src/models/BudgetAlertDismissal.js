const mongoose = require('mongoose');

const budgetAlertDismissalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    periodKey: { type: String, required: true },
    dismissedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

budgetAlertDismissalSchema.index({ userId: 1, categoryId: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model('BudgetAlertDismissal', budgetAlertDismissalSchema);
