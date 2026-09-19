const cron = require('node-cron');
const RecurringRule = require('../models/RecurringRule');
const { createTransaction } = require('./transactionService');

const advanceNextRun = (date, frequency) => {
  const next = new Date(date);
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
};

const processDueRecurring = async (userId = null) => {
  const now = new Date();
  const filter = { active: true, nextRunDate: { $lte: now } };
  if (userId) filter.userId = userId;

  const due = await RecurringRule.find(filter).limit(200);
  const results = [];

  for (const rule of due) {
    try {
      const tx = await createTransaction(rule.userId, {
        type: 'expense',
        amount: rule.amount,
        categoryId: rule.categoryId,
        fromWalletId: rule.walletId,
        note: rule.note || 'Recurring expense',
        date: rule.nextRunDate,
        isRecurringInstance: true,
        recurringRuleId: rule._id,
      });

      let nextRun = advanceNextRun(rule.nextRunDate, rule.frequency);
      while (nextRun <= now) {
        nextRun = advanceNextRun(nextRun, rule.frequency);
      }
      rule.nextRunDate = nextRun;
      await rule.save();
      results.push({ ruleId: rule._id, txId: tx._id, ok: true });
    } catch (err) {
      results.push({ ruleId: rule._id, ok: false, error: err.message });
    }
  }

  return results;
};

const startRecurringCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      await processDueRecurring();
    } catch (err) {
      console.error('Recurring cron failed:', err.message);
    }
  });
};

module.exports = { processDueRecurring, startRecurringCron, advanceNextRun };
