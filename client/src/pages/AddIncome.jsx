import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { errMsg, formatINR, todayInput } from '../utils/format';

export default function AddIncome() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, w] = await Promise.all([
          api.get('/categories', { params: { type: 'income' } }),
          api.get('/wallets'),
        ]);
        setCategories(c.data.categories);
        setWallets(w.data.wallets);
        setCategoryId(c.data.categories[0]?._id || '');
        setToWalletId(w.data.wallets[0]?._id || '');
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { data } = await api.post('/categories', { name: newCat.trim(), type: 'income' });
      setCategories((prev) => [...prev, data.category]);
      setCategoryId(data.category._id);
      setNewCat('');
    } catch (e) {
      setError(errMsg(e));
    }
  };

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
        date,
        note,
      });
      navigate('/app');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Add income</h1>
      <p className="page-sub">Salary and other money in.</p>
      {error && <div className="error-banner">{error}</div>}
      <form className="glass" style={{ padding: '1.25rem' }} onSubmit={submit}>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              placeholder="+ New income category"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--input-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 12,
                padding: '0.7rem',
                color: 'var(--text)',
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={addCategory}>
              Add
            </button>
          </div>
        </div>
        <div className="field">
          <label>Goes to</label>
          <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} · {formatINR(w.balance)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save income'}
        </button>
      </form>
    </div>
  );
}
