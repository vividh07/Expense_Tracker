import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import api from '../api/client';
import { formatINR, errMsg } from '../utils/format';
import './Home.css';

const COLORS = ['#0071e3', '#ff9f0a', '#30d158', '#ff453a'];

export default function Home() {
  const [dash, setDash] = useState(null);
  const [trend, setTrend] = useState([]);
  const [mode, setMode] = useState('daily');
  const [alerts, setAlerts] = useState([]);
  const [periodKey, setPeriodKey] = useState('');
  const [alertIndex, setAlertIndex] = useState(0);
  const [error, setError] = useState('');
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const load = async () => {
    try {
      const [d, t, a] = await Promise.all([
        api.get('/insights/dashboard'),
        api.get('/insights/trend', { params: { mode } }),
        api.get('/insights/budget-alerts'),
      ]);
      setDash(d.data);
      setTrend(t.data.points || []);
      setAlerts(a.data.alerts || []);
      setPeriodKey(a.data.periodKey);
      setAlertIndex(0);
      localStorage.setItem(
        'rf_home_cache',
        JSON.stringify({ dash: d.data, trend: t.data.points || [], mode, savedAt: Date.now() })
      );
      setError('');
    } catch (err) {
      const cached = localStorage.getItem('rf_home_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setDash(parsed.dash);
          setTrend(parsed.trend || []);
          setError('Showing cached home data — you’re offline or the server is unreachable.');
          return;
        } catch {
          /* ignore */
        }
      }
      setError(errMsg(err));
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  const dismissAlert = async () => {
    const current = alerts[alertIndex];
    if (!current) return;
    try {
      await api.post('/alerts/dismiss-budget', {
        categoryId: current.categoryId,
        periodKey,
      });
    } catch {
      /* still close locally */
    }
    const next = alerts.filter((_, i) => i !== alertIndex);
    setAlerts(next);
    setAlertIndex(0);
  };

  const currentAlert = alerts[alertIndex];

  return (
    <div className="page home-page">
      <h1 className="page-title">Home</h1>
      <p className="page-sub">Charts, budgets, and today’s money pulse.</p>
      {error && <div className="error-banner">{error}</div>}

      {dash && (
        <>
          <motion.section className="glass balance-hero" whileHover={{ y: -2 }}>
            <p>Total balance</p>
            <h2>{formatINR(dash.totalBalance)}</h2>
            <div className="quick-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowExpense(true)}>
                Add expense
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowIncome(true)}>
                Add income
              </button>
              <Link className="btn btn-ghost" to="/app/transfer">
                Transfer
              </Link>
            </div>
          </motion.section>

          <div className="home-grid">
            <section className="glass panel">
              <h3>Cash vs bank</h3>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dash.cashVsBank}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {dash.cashVsBank.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="split-legend">
                <span>Cash {formatINR(dash.cashBalance)}</span>
                <span>Bank {formatINR(dash.bankBalance)}</span>
              </div>
            </section>

            <section className="glass panel">
              <div className="panel-head">
                <h3>Spend trend</h3>
                <div className="chip-row tight">
                  {['daily', 'weekly', 'monthly'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip ${mode === m ? 'active' : ''}`}
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0071e3" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Area type="monotone" dataKey="total" stroke="#0071e3" fill="url(#tealFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="glass panel">
              <h3>This month vs last</h3>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Last', total: dash.monthComparison.lastMonth },
                      { name: 'This', total: dash.monthComparison.thisMonth },
                    ]}
                  >
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Bar dataKey="total" fill="#ff9f0a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="glass panel">
              <h3>Budget progress</h3>
              {dash.budgetBars.length === 0 && (
                <p className="muted">Set a budget on any category to track usage.</p>
              )}
              <div className="budget-list">
                {dash.budgetBars.map((b) => (
                  <div key={b.categoryId} className="budget-item">
                    <div className="budget-meta">
                      <strong>{b.name}</strong>
                      <span>
                        {formatINR(b.spent)} / {formatINR(b.budgetLimit)} ({b.percent}%)
                      </span>
                    </div>
                    <div className={`progress ${b.over ? 'over' : ''}`}>
                      <span style={{ width: `${Math.min(100, b.percent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="glass panel recent-panel">
            <div className="panel-head">
              <h3>Recent history</h3>
              <Link to="/app/history">See all</Link>
            </div>
            <ul className="tx-list">
              {dash.recent.map((tx) => (
                <li key={tx._id}>
                  <div>
                    <strong>
                      {tx.type === 'transfer'
                        ? 'Transfer'
                        : tx.categoryId?.name || tx.type}
                    </strong>
                    <span>
                      {tx.type === 'transfer'
                        ? `${tx.fromWalletId?.name} → ${tx.toWalletId?.name}`
                        : tx.fromWalletId?.name || tx.toWalletId?.name}
                    </span>
                  </div>
                  <em className={tx.type === 'income' ? 'pos' : 'neg'}>
                    {tx.type === 'income' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </em>
                </li>
              ))}
              {dash.recent.length === 0 && <li className="muted">No transactions yet.</li>}
            </ul>
          </section>
        </>
      )}

      <AnimatePresence>
        {currentAlert && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal glass"
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3>Budget fully used</h3>
              <p>
                <strong style={{ color: currentAlert.color }}>{currentAlert.name}</strong> hit{' '}
                {currentAlert.percent}% of its {formatINR(currentAlert.budgetLimit)} limit this month
                ({formatINR(currentAlert.spent)} spent).
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-primary" onClick={dismissAlert}>
                  Got it
                </button>
                <Link className="btn btn-ghost" to="/app/categories" onClick={dismissAlert}>
                  Adjust budget
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpense && (
          <ExpenseModal
            onClose={() => setShowExpense(false)}
            onSaved={() => {
              setShowExpense(false);
              load();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIncome && (
          <IncomeModal
            onClose={() => setShowIncome(false)}
            onSaved={() => {
              setShowIncome(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpenseModal({ onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, w] = await Promise.all([
        api.get('/categories', { params: { type: 'expense' } }),
        api.get('/wallets'),
      ]);
      setCategories(c.data.categories);
      setWallets(w.data.wallets);
      setCategoryId(c.data.categories[0]?._id || '');
      setFromWalletId(w.data.wallets[0]?._id || '');
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/transactions', {
        type: 'expense',
        amount: Number(amount),
        categoryId,
        fromWalletId,
        note,
      });
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        className="modal glass"
        onSubmit={submit}
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        exit={{ opacity: 0 }}
      >
        <h3>Quick expense</h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>From</label>
          <select value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} ({formatINR(w.balance)})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Save
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <Link className="btn btn-ghost" to="/app/expense" onClick={onClose}>
            Full form
          </Link>
        </div>
      </motion.form>
    </motion.div>
  );
}

function IncomeModal({ onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, w] = await Promise.all([
        api.get('/categories', { params: { type: 'income' } }),
        api.get('/wallets'),
      ]);
      setCategories(c.data.categories);
      setWallets(w.data.wallets);
      setCategoryId(c.data.categories[0]?._id || '');
      setToWalletId(w.data.wallets[0]?._id || '');
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/transactions', {
        type: 'income',
        amount: Number(amount),
        categoryId,
        toWalletId,
        note,
      });
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        className="modal glass"
        onSubmit={submit}
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        exit={{ opacity: 0 }}
      >
        <h3>Add income</h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Goes to</label>
          <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} ({formatINR(w.balance)})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Save
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
