const express = require('express');
const { z } = require('zod');
const Wallet = require('../models/Wallet');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const createSchema = z.object({
  type: z.enum(['bank', 'cash']),
  name: z.string().min(1).max(60),
  balance: z.number().min(0).default(0),
});

router.get('/', async (req, res, next) => {
  try {
    const wallets = await Wallet.find({ userId: req.user._id }).sort({ type: 1, name: 1 });
    res.json({ wallets });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    if (data.type === 'cash') {
      const existingCash = await Wallet.findOne({ userId: req.user._id, type: 'cash' });
      if (existingCash) {
        return res.status(400).json({ message: 'Cash wallet already exists. Update its balance instead.' });
      }
    }

    const wallet = await Wallet.create({
      userId: req.user._id,
      type: data.type,
      name: data.name,
      balance: data.balance,
      isDefaultCash: data.type === 'cash',
    });
    res.status(201).json({ wallet });
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
      name: z.string().min(1).max(60).optional(),
      // Opening/adjust balance only when no force — allow setBalance for corrections
      setBalance: z.number().min(0).optional(),
    });
    const data = schema.parse(req.body);
    const wallet = await Wallet.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    if (data.name) wallet.name = data.name;
    if (data.setBalance !== undefined) wallet.balance = data.setBalance;
    await wallet.save();
    res.json({ wallet });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    if (wallet.isDefaultCash || wallet.type === 'cash') {
      return res.status(400).json({ message: 'Cannot delete cash wallet' });
    }
    if (wallet.balance !== 0) {
      return res.status(400).json({ message: 'Transfer or clear balance before deleting' });
    }
    await wallet.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
