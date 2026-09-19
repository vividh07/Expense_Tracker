import { useEffect, useState } from 'react';
import api from '../api/client';
import { errMsg, formatINR, todayInput } from '../utils/format';

export default function Recurring() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    walletId: '',
    frequency: 'monthly',
    nextRunDate: todayInput(),
    note: '',
  });
  const [error, setError] = useState('');

  const load = async () => {
    const [r, c, w] = await Promise.all([
      api.get('/recurring'),
      api.get('/categories', { params: { type: 'expense' } }),
      api.get('/wallets'),
    ]);
    setRules(r.data.rules);
    setCategories(c.data.categories);
    setWallets(w.data.wallets);
    setForm((f) => ({
      ...f,
      categoryId: f.categoryId || c.data.categories[0]?._id || '',
      walletId: f.walletId || w.data.wallets[0]?._id || '',
    }));
  };

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/recurring', {
        ...form,
        amount: Number(form.amount),
      });
      setForm((f) => ({ ...f, amount: '', note: '' }));
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const toggle = async (rule) => {
    try {
      await api.patch(`/recurring/${rule._id}`, { active: !rule.active });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (rule) => {
    if (!confirm('Delete this recurring rule?')) return;
    try {
      await api.delete(`/recurring/${rule._id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const runDue = async () => {
    try {
      await api.post('/recurring/run-due');
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Recurring</h1>
      <p className="page-sub">Rent, EMI, and other repeats.</p>
      {error && <div className="error-banner">{error}</div>}

      <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={runDue}>
        Run due now
      </button>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        {rules.map((r) => (
          <div key={r._id} className="glass" style={{ padding: '1rem' }}>
            <strong>
              {r.categoryId?.name} · {formatINR(r.amount)}
            </strong>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {r.frequency} · {r.walletId?.name} · next {new Date(r.nextRunDate).toLocaleDateString('en-IN')}
              {!r.active ? ' · paused' : ''}
            </div>
            {r.note && <div style={{ marginTop: 6, fontSize: 13 }}>{r.note}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => toggle(r)}>
                {r.active ? 'Pause' : 'Resume'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(r)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="glass" style={{ padding: '1.25rem' }} onSubmit={add}>
        <h3 style={{ marginTop: 0 }}>New rule</h3>
        <div className="field">
          <label>Amount (₹)</label>
          <input
            type="number"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Wallet</label>
          <select value={form.walletId} onChange={(e) => setForm((s) => ({ ...s, walletId: e.target.value }))}>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Frequency</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm((s) => ({ ...s, frequency: e.target.value }))}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div className="field">
          <label>Next run</label>
          <input
            type="date"
            value={form.nextRunDate}
            onChange={(e) => setForm((s) => ({ ...s, nextRunDate: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Note</label>
          <input value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
        </div>
        <button className="btn btn-primary" type="submit">
          Add rule
        </button>
      </form>
    </div>
  );
}
