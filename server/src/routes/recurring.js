const express = require('express');
const { z } = require('zod');
const RecurringRule = require('../models/RecurringRule');
const { protect } = require('../middleware/auth');
const { assertOwnedWallet, assertOwnedCategory } = require('../services/transactionService');
const { processDueRecurring } = require('../services/recurringService');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const rules = await RecurringRule.find({ userId: req.user._id })
      .sort({ nextRunDate: 1 })
      .populate('categoryId', 'name color')
      .populate('walletId', 'name type');
    res.json({ rules });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      amount: z.number().positive(),
      categoryId: z.string(),
      walletId: z.string(),
      frequency: z.enum(['weekly', 'monthly']),
      nextRunDate: z.string(),
      note: z.string().max(200).optional(),
    });
    const data = schema.parse(req.body);
    await assertOwnedWallet(req.user._id, data.walletId);
    await assertOwnedCategory(req.user._id, data.categoryId, 'expense');

    const rule = await RecurringRule.create({
      userId: req.user._id,
      amount: data.amount,
      categoryId: data.categoryId,
      walletId: data.walletId,
      frequency: data.frequency,
      nextRunDate: new Date(data.nextRunDate),
      note: data.note || '',
      active: true,
    });

    const populated = await RecurringRule.findById(rule._id)
      .populate('categoryId', 'name color')
      .populate('walletId', 'name type');
    res.status(201).json({ rule: populated });
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
      amount: z.number().positive().optional(),
      categoryId: z.string().optional(),
      walletId: z.string().optional(),
      frequency: z.enum(['weekly', 'monthly']).optional(),
      nextRunDate: z.string().optional(),
      note: z.string().max(200).optional(),
      active: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const rule = await RecurringRule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    if (data.walletId) await assertOwnedWallet(req.user._id, data.walletId);
    if (data.categoryId) await assertOwnedCategory(req.user._id, data.categoryId, 'expense');

    Object.assign(rule, {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.walletId && { walletId: data.walletId }),
      ...(data.frequency && { frequency: data.frequency }),
      ...(data.nextRunDate && { nextRunDate: new Date(data.nextRunDate) }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.active !== undefined && { active: data.active }),
    });
    await rule.save();

    const populated = await RecurringRule.findById(rule._id)
      .populate('categoryId', 'name color')
      .populate('walletId', 'name type');
    res.json({ rule: populated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    await rule.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/run-due', async (req, res, next) => {
  try {
    const results = await processDueRecurring(req.user._id);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
