const express = require('express');
const { z } = require('zod');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.type) filter.type = req.query.type;
    const categories = await Category.find(filter).sort({ type: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(40),
      type: z.enum(['expense', 'income']),
      color: z.string().optional(),
      budgetLimit: z.number().positive().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const exists = await Category.findOne({
      userId: req.user._id,
      name: data.name,
      type: data.type,
    });
    if (exists) return res.status(409).json({ message: 'Category already exists' });

    const category = await Category.create({
      userId: req.user._id,
      name: data.name,
      type: data.type,
      color: data.color || '#2dd4bf',
      budgetLimit: data.budgetLimit ?? null,
      isSystem: false,
    });
    res.status(201).json({ category });
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
      name: z.string().min(1).max(40).optional(),
      color: z.string().optional(),
      budgetLimit: z.number().positive().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (data.name) category.name = data.name;
    if (data.color) category.color = data.color;
    if (data.budgetLimit !== undefined) category.budgetLimit = data.budgetLimit;
    await category.save();
    res.json({ category });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (category.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system category' });
    }
    await category.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
