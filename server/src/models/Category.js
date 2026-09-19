const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    color: { type: String, default: '#2dd4bf' },
    budgetLimit: { type: Number, default: null },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
