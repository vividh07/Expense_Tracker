const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

const isTxnUnsupported = (err) =>
  err?.codeName === 'IllegalOperation' ||
  err?.code === 20 ||
  /replica set|transaction numbers/i.test(err?.message || '');

const assertOwnedWallet = async (userId, walletId, session) => {
  const q = Wallet.findOne({ _id: walletId, userId });
  if (session) q.session(session);
  const wallet = await q;
  if (!wallet) {
    throw Object.assign(new Error('Wallet not found'), { status: 404 });
  }
  return wallet;
};

const assertOwnedCategory = async (userId, categoryId, type) => {
  const category = await Category.findOne({ _id: categoryId, userId, ...(type ? { type } : {}) });
  if (!category) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return category;
};

const applyCreateEffects = async ({ type, amount, fromWalletId, toWalletId }, session) => {
  if (type === 'expense') {
    const from = session
      ? await Wallet.findById(fromWalletId).session(session)
      : await Wallet.findById(fromWalletId);
    if (!from) throw Object.assign(new Error('Source wallet not found'), { status: 404 });
    if (from.balance < amount) {
      throw Object.assign(new Error('Insufficient balance'), { status: 400 });
    }
    from.balance -= amount;
    await from.save(session ? { session } : undefined);
  } else if (type === 'income') {
    const to = session
      ? await Wallet.findById(toWalletId).session(session)
      : await Wallet.findById(toWalletId);
    if (!to) throw Object.assign(new Error('Destination wallet not found'), { status: 404 });
    to.balance += amount;
    await to.save(session ? { session } : undefined);
  } else if (type === 'transfer') {
    const from = session
      ? await Wallet.findById(fromWalletId).session(session)
      : await Wallet.findById(fromWalletId);
    const to = session
      ? await Wallet.findById(toWalletId).session(session)
      : await Wallet.findById(toWalletId);
    if (!from || !to) throw Object.assign(new Error('Wallet not found'), { status: 404 });
    if (String(from._id) === String(to._id)) {
      throw Object.assign(new Error('Cannot transfer to the same wallet'), { status: 400 });
    }
    if (from.balance < amount) {
      throw Object.assign(new Error('Insufficient balance'), { status: 400 });
    }
    from.balance -= amount;
    to.balance += amount;
    await from.save(session ? { session } : undefined);
    await to.save(session ? { session } : undefined);
  }
};

const reverseEffects = async (tx, session) => {
  const amount = tx.amount;
  if (tx.type === 'expense') {
    const from = session
      ? await Wallet.findById(tx.fromWalletId).session(session)
      : await Wallet.findById(tx.fromWalletId);
    if (from) {
      from.balance += amount;
      await from.save(session ? { session } : undefined);
    }
  } else if (tx.type === 'income') {
    const to = session
      ? await Wallet.findById(tx.toWalletId).session(session)
      : await Wallet.findById(tx.toWalletId);
    if (to) {
      if (to.balance < amount) {
        throw Object.assign(new Error('Cannot reverse: destination wallet has insufficient balance'), {
          status: 400,
        });
      }
      to.balance -= amount;
      await to.save(session ? { session } : undefined);
    }
  } else if (tx.type === 'transfer') {
    const from = session
      ? await Wallet.findById(tx.fromWalletId).session(session)
      : await Wallet.findById(tx.fromWalletId);
    const to = session
      ? await Wallet.findById(tx.toWalletId).session(session)
      : await Wallet.findById(tx.toWalletId);
    if (to && to.balance < amount) {
      throw Object.assign(new Error('Cannot reverse: destination wallet has insufficient balance'), {
        status: 400,
      });
    }
    if (to) {
      to.balance -= amount;
      await to.save(session ? { session } : undefined);
    }
    if (from) {
      from.balance += amount;
      await from.save(session ? { session } : undefined);
    }
  }
};

const runInTransaction = async (work) => {
  try {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      session.endSession();
    }
  } catch (err) {
    if (isTxnUnsupported(err)) {
      return work(null);
    }
    throw err;
  }
};

const createTransaction = async (userId, payload) =>
  runInTransaction(async (session) => {
    const { type, amount, categoryId, fromWalletId, toWalletId, note, date } = payload;

    if (type === 'expense') {
      await assertOwnedWallet(userId, fromWalletId, session);
      await assertOwnedCategory(userId, categoryId, 'expense');
    } else if (type === 'income') {
      await assertOwnedWallet(userId, toWalletId, session);
      await assertOwnedCategory(userId, categoryId, 'income');
    } else if (type === 'transfer') {
      await assertOwnedWallet(userId, fromWalletId, session);
      await assertOwnedWallet(userId, toWalletId, session);
    }

    await applyCreateEffects({ type, amount, fromWalletId, toWalletId }, session);

    const doc = {
      userId,
      type,
      amount,
      categoryId: type === 'transfer' ? undefined : categoryId,
      fromWalletId: type === 'income' ? undefined : fromWalletId,
      toWalletId: type === 'expense' ? undefined : toWalletId,
      note: note || '',
      date: date ? new Date(date) : new Date(),
      isRecurringInstance: !!payload.isRecurringInstance,
      recurringRuleId: payload.recurringRuleId,
    };

    if (session) {
      const [tx] = await Transaction.create([doc], { session });
      return tx;
    }
    return Transaction.create(doc);
  });

const updateTransaction = async (userId, txId, payload) =>
  runInTransaction(async (session) => {
    const q = Transaction.findOne({ _id: txId, userId });
    if (session) q.session(session);
    const existing = await q;
    if (!existing) {
      throw Object.assign(new Error('Transaction not found'), { status: 404 });
    }

    await reverseEffects(existing, session);

    const next = {
      type: payload.type ?? existing.type,
      amount: payload.amount ?? existing.amount,
      categoryId: payload.categoryId ?? existing.categoryId,
      fromWalletId: payload.fromWalletId ?? existing.fromWalletId,
      toWalletId: payload.toWalletId ?? existing.toWalletId,
      note: payload.note !== undefined ? payload.note : existing.note,
      date: payload.date ? new Date(payload.date) : existing.date,
    };

    if (next.type === 'expense') {
      await assertOwnedWallet(userId, next.fromWalletId, session);
      await assertOwnedCategory(userId, next.categoryId, 'expense');
      next.toWalletId = undefined;
    } else if (next.type === 'income') {
      await assertOwnedWallet(userId, next.toWalletId, session);
      await assertOwnedCategory(userId, next.categoryId, 'income');
      next.fromWalletId = undefined;
    } else {
      await assertOwnedWallet(userId, next.fromWalletId, session);
      await assertOwnedWallet(userId, next.toWalletId, session);
      next.categoryId = undefined;
    }

    await applyCreateEffects(next, session);

    existing.type = next.type;
    existing.amount = next.amount;
    existing.categoryId = next.categoryId;
    existing.fromWalletId = next.fromWalletId;
    existing.toWalletId = next.toWalletId;
    existing.note = next.note;
    existing.date = next.date;
    await existing.save(session ? { session } : undefined);
    return existing;
  });

const deleteTransaction = async (userId, txId) =>
  runInTransaction(async (session) => {
    const q = Transaction.findOne({ _id: txId, userId });
    if (session) q.session(session);
    const existing = await q;
    if (!existing) {
      throw Object.assign(new Error('Transaction not found'), { status: 404 });
    }
    await reverseEffects(existing, session);
    await existing.deleteOne(session ? { session } : undefined);
    return { ok: true };
  });

module.exports = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  assertOwnedWallet,
  assertOwnedCategory,
};
