import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { errMsg, formatINR, todayInput } from '../utils/format';

export default function AddExpense() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newBank, setNewBank] = useState({ name: '', balance: '' });
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewBank, setShowNewBank] = useState(false);

  const load = async () => {
    const [c, w] = await Promise.all([
      api.get('/categories', { params: { type: 'expense' } }),
      api.get('/wallets'),
    ]);
    setCategories(c.data.categories);
    setWallets(w.data.wallets);
    if (!categoryId) setCategoryId(c.data.categories[0]?._id || '');
    if (!fromWalletId) setFromWalletId(w.data.wallets[0]?._id || '');
  };

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { data } = await api.post('/categories', { name: newCat.trim(), type: 'expense' });
      setCategories((prev) => [...prev, data.category]);
      setCategoryId(data.category._id);
      setNewCat('');
      setShowNewCat(false);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const addBank = async () => {
    if (!newBank.name.trim()) return;
    try {
      const { data } = await api.post('/wallets', {
        type: 'bank',
        name: newBank.name.trim(),
        balance: Number(newBank.balance) || 0,
      });
      setWallets((prev) => [...prev, data.wallet]);
      setFromWalletId(data.wallet._id);
      setNewBank({ name: '', balance: '' });
      setShowNewBank(false);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api.post('/transactions', {
        type: 'expense',
        amount: Number(amount),
        categoryId,
        fromWalletId,
        date,
        note,
      });
      setOk('Expense saved');
      setAmount('');
      setNote('');
      setTimeout(() => navigate('/app'), 600);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Add expense</h1>
      <p className="page-sub">Amount in rupees · pick category & wallet.</p>
      {error && <div className="error-banner">{error}</div>}
      {ok && <div className="success-banner">{ok}</div>}
      <form className="glass panel" onSubmit={submit} style={{ padding: '1.25rem' }}>
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
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
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowNewCat((v) => !v)}>
            + Add category
          </button>
          {showNewCat && (
            <div className="inline-add">
              <input placeholder="e.g. Coffee" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={addCategory}>
                Save
              </button>
            </div>
          )}
        </div>
        <div className="field">
          <label>Deducted from</label>
          <select value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} · {formatINR(w.balance)}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowNewBank((v) => !v)}>
            + Add bank
          </button>
          {showNewBank && (
            <div className="inline-add">
              <input
                placeholder="Bank name"
                value={newBank.name}
                onChange={(e) => setNewBank((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                type="number"
                min="0"
                placeholder="Opening balance"
                value={newBank.balance}
                onChange={(e) => setNewBank((s) => ({ ...s, balance: e.target.value }))}
              />
              <button type="button" className="btn btn-primary" onClick={addBank}>
                Save bank
              </button>
            </div>
          )}
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save expense'}
        </button>
      </form>
      <style>{`.inline-add{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}.inline-add input{flex:1;min-width:120px;background:var(--input-bg);border:1px solid var(--glass-border);border-radius:12px;padding:.7rem .85rem;color:var(--text)}`}</style>
    </div>
  );
}
