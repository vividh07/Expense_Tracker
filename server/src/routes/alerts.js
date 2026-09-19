const express = require('express');
const { z } = require('zod');
const BudgetAlertDismissal = require('../models/BudgetAlertDismissal');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/dismiss-budget', async (req, res, next) => {
  try {
    const schema = z.object({
      categoryId: z.string(),
      periodKey: z.string().min(6),
    });
    const data = schema.parse(req.body);

    await BudgetAlertDismissal.findOneAndUpdate(
      {
        userId: req.user._id,
        categoryId: data.categoryId,
        periodKey: data.periodKey,
      },
      { dismissedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

module.exports = router;
