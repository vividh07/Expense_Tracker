const Wallet = require('../models/Wallet');
const Category = require('../models/Category');

const EXPENSE_DEFAULTS = [
  { name: 'Petrol', color: '#f59e0b' },
  { name: 'Food', color: '#fb7185' },
  { name: 'Cloth', color: '#38bdf8' },
  { name: 'Travel', color: '#a3e635' },
  { name: 'Rent', color: '#f97316' },
];

const INCOME_DEFAULTS = [{ name: 'Salary', color: '#34d399' }];

const seedUserDefaults = async (userId) => {
  await Wallet.create({
    userId,
    type: 'cash',
    name: 'Cash',
    balance: 0,
    isDefaultCash: true,
  });

  const categories = [
    ...EXPENSE_DEFAULTS.map((c) => ({
      userId,
      name: c.name,
      type: 'expense',
      color: c.color,
      isSystem: true,
    })),
    ...INCOME_DEFAULTS.map((c) => ({
      userId,
      name: c.name,
      type: 'income',
      color: c.color,
      isSystem: true,
    })),
  ];

  await Category.insertMany(categories);
};

module.exports = { seedUserDefaults, EXPENSE_DEFAULTS, INCOME_DEFAULTS };
