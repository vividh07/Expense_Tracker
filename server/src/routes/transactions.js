const express = require('express');
const { z } = require('zod');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../services/transactionService');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const filter = { userId: req.user._id };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.walletId) {
      filter.$or = [{ fromWalletId: req.query.walletId }, { toWalletId: req.query.walletId }];
    }
    if (req.query.q) {
      filter.note = { $regex: req.query.q, $options: 'i' };
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('categoryId', 'name color type')
        .populate('fromWalletId', 'name type')
        .populate('toWalletId', 'name type'),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['expense', 'income', 'transfer']),
      amount: z.number().positive(),
      categoryId: z.string().optional(),
      fromWalletId: z.string().optional(),
      toWalletId: z.string().optional(),
      note: z.string().max(200).optional(),
      date: z.string().optional(),
    });
    const data = schema.parse(req.body);

    if (data.type === 'expense' && (!data.categoryId || !data.fromWalletId)) {
      return res.status(400).json({ message: 'Expense needs category and from wallet' });
    }
    if (data.type === 'income' && (!data.categoryId || !data.toWalletId)) {
      return res.status(400).json({ message: 'Income needs category and to wallet' });
    }
    if (data.type === 'transfer' && (!data.fromWalletId || !data.toWalletId)) {
      return res.status(400).json({ message: 'Transfer needs from and to wallets' });
    }

    const tx = await createTransaction(req.user._id, data);
    const populated = await Transaction.findById(tx._id)
      .populate('categoryId', 'name color type')
      .populate('fromWalletId', 'name type')
      .populate('toWalletId', 'name type');
    res.status(201).json({ transaction: populated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['expense', 'income', 'transfer']).optional(),
      amount: z.number().positive().optional(),
      categoryId: z.string().optional().nullable(),
      fromWalletId: z.string().optional().nullable(),
      toWalletId: z.string().optional().nullable(),
      note: z.string().max(200).optional(),
      date: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const tx = await updateTransaction(req.user._id, req.params.id, data);
    const populated = await Transaction.findById(tx._id)
      .populate('categoryId', 'name color type')
      .populate('fromWalletId', 'name type')
      .populate('toWalletId', 'name type');
    res.json({ transaction: populated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTransaction(req.user._id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
