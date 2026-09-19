const express = require('express');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');
const BudgetAlertDismissal = require('../models/BudgetAlertDismissal');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const wallets = await Wallet.find({ userId });
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
    const cashBalance = wallets.filter((w) => w.type === 'cash').reduce((s, w) => s + w.balance, 0);
    const bankBalance = wallets.filter((w) => w.type === 'bank').reduce((s, w) => s + w.balance, 0);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [thisMonthSpend, lastMonthSpend] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            date: { $gte: thisMonthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            date: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const categories = await Category.find({ userId, type: 'expense', budgetLimit: { $ne: null } });
    const budgetBars = [];
    for (const cat of categories) {
      const spentAgg = await Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            categoryId: cat._id,
            date: { $gte: thisMonthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const spent = spentAgg[0]?.total || 0;
      budgetBars.push({
        categoryId: cat._id,
        name: cat.name,
        color: cat.color,
        budgetLimit: cat.budgetLimit,
        spent,
        percent: Math.min(100, Math.round((spent / cat.budgetLimit) * 100)),
        over: spent >= cat.budgetLimit,
      });
    }

    const recent = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(8)
      .populate('categoryId', 'name color')
      .populate('fromWalletId', 'name type')
      .populate('toWalletId', 'name type');

    res.json({
      totalBalance,
      cashBalance,
      bankBalance,
      cashVsBank: [
        { name: 'Cash', value: cashBalance },
        { name: 'Bank', value: bankBalance },
      ],
      monthComparison: {
        thisMonth: thisMonthSpend[0]?.total || 0,
        lastMonth: lastMonthSpend[0]?.total || 0,
      },
      budgetBars,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/trend', async (req, res, next) => {
  try {
    const mode = req.query.mode || 'daily'; // daily | weekly | monthly
    const userId = req.user._id;
    const now = new Date();
    let from;
    let groupId;

    if (mode === 'monthly') {
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      groupId = { year: { $year: '$date' }, month: { $month: '$date' } };
    } else if (mode === 'weekly') {
      from = new Date(now);
      from.setDate(from.getDate() - 7 * 7);
      groupId = { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } };
    } else {
      from = new Date(now);
      from.setDate(from.getDate() - 13);
      from = startOfDay(from);
      groupId = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' },
      };
    }

    const rows = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: from },
        },
      },
      {
        $group: {
          _id: groupId,
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    const points = rows.map((r) => {
      let label;
      if (mode === 'monthly') label = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      else if (mode === 'weekly') label = `W${r._id.week}`;
      else label = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
      return { label, total: r.total };
    });

    res.json({ mode, points });
  } catch (err) {
    next(err);
  }
});

router.get('/report', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days || '30', 10);
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - (days - 1));

    const match = {
      userId,
      type: 'expense',
      date: { $gte: from },
    };

    const byCategory = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]);

    const byWallet = await Transaction.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWalletId',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      { $unwind: '$wallet' },
      {
        $group: {
          _id: '$wallet.type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const trend = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: '$date' },
            m: { $month: '$date' },
            d: { $dayOfMonth: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    const totalSpend = byCategory.reduce((s, c) => s + c.total, 0);
    const top = byCategory[0]
      ? {
          categoryId: byCategory[0]._id,
          name: byCategory[0].category?.name || 'Unknown',
          color: byCategory[0].category?.color || '#2dd4bf',
          total: byCategory[0].total,
        }
      : null;

    res.json({
      days,
      from,
      totalSpend,
      mostExpensiveCategory: top,
      byCategory: byCategory.map((c) => ({
        categoryId: c._id,
        name: c.category?.name || 'Unknown',
        color: c.category?.color || '#2dd4bf',
        total: c.total,
      })),
      cashVsBank: byWallet.map((w) => ({
        name: w._id === 'cash' ? 'Cash' : 'Bank',
        value: w.total,
      })),
      trend: trend.map((t) => ({
        label: `${t._id.y}-${String(t._id.m).padStart(2, '0')}-${String(t._id.d).padStart(2, '0')}`,
        total: t.total,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/budget-alerts', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodKey = monthKey(now);

    const categories = await Category.find({
      userId,
      type: 'expense',
      budgetLimit: { $ne: null, $gt: 0 },
    });

    const dismissals = await BudgetAlertDismissal.find({ userId, periodKey });
    const dismissedSet = new Set(dismissals.map((d) => String(d.categoryId)));

    const alerts = [];
    for (const cat of categories) {
      if (dismissedSet.has(String(cat._id))) continue;
      const spentAgg = await Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'expense',
            categoryId: cat._id,
            date: { $gte: thisMonthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const spent = spentAgg[0]?.total || 0;
      if (spent >= cat.budgetLimit) {
        alerts.push({
          categoryId: cat._id,
          name: cat.name,
          color: cat.color,
          budgetLimit: cat.budgetLimit,
          spent,
          percent: Math.round((spent / cat.budgetLimit) * 100),
        });
      }
    }

    res.json({ alerts, periodKey });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
