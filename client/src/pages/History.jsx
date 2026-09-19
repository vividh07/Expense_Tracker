import { useEffect, useState } from 'react';
import api from '../api/client';
import { errMsg, formatINR } from '../utils/format';
import './History.css';

const emptyFilters = {
  q: '',
  type: '',
  categoryId: '',
  walletId: '',
  from: '',
  to: '',
};

export default function History() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (next = filters) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/transactions', {
        params: {
          q: next.q || undefined,
          type: next.type || undefined,
          categoryId: next.categoryId || undefined,
          walletId: next.walletId || undefined,
          from: next.from || undefined,
          to: next.to || undefined,
          limit: 50,
        },
      });
      setItems(data.transactions);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/wallets')])
      .then(([c, w]) => {
        setCategories(c.data.categories);
        setWallets(w.data.wallets);
      })
      .catch((e) => setError(errMsg(e)));
    load();
  }, []);

  useEffect(() => {
    load();
  }, [filters.type]);

  const setFilter = (key, value) => setFilters((s) => ({ ...s, [key]: value }));

  const clearFilters = () => {
    setFilters(emptyFilters);
    load(emptyFilters);
  };

  const remove = async (id) => {
    if (!confirm('Delete this transaction and roll back balances?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      setItems((prev) => prev.filter((t) => t._id !== id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: Number(editing.amount),
        note: editing.note,
        date: editing.date,
        type: editing.type,
      };
      if (editing.type === 'expense') {
        payload.categoryId = editing.categoryId;
        payload.fromWalletId = editing.fromWalletId;
      } else if (editing.type === 'income') {
        payload.categoryId = editing.categoryId;
        payload.toWalletId = editing.toWalletId;
      } else {
        payload.fromWalletId = editing.fromWalletId;
        payload.toWalletId = editing.toWalletId;
      }
      const { data } = await api.patch(`/transactions/${editing._id}`, payload);
      setItems((prev) => prev.map((t) => (t._id === editing._id ? data.transaction : t)));
      setEditing(null);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const categoryOptions =
    filters.type === 'transfer'
      ? []
      : categories.filter((c) => !filters.type || c.type === filters.type);

  return (
    <div className="page">
      <h1 className="page-title">History</h1>
      <p className="page-sub">Search and filter by type, category, wallet, or date.</p>
      {error && <div className="error-banner">{error}</div>}
      <div className="glass filter-panel">
        <div className="chip-row">
          {['', 'expense', 'income', 'transfer'].map((t) => (
            <button
              key={t || 'all'}
              type="button"
              className={`chip ${filters.type === t ? 'active' : ''}`}
              onClick={() => setFilter('type', t)}
            >
              {t || 'all'}
            </button>
          ))}
        </div>

        <div className="filter-grid">
          <input
            className="filter-input"
            placeholder="Search notes…"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select
            className="filter-input"
            value={filters.categoryId}
            onChange={(e) => setFilter('categoryId', e.target.value)}
            disabled={filters.type === 'transfer'}
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
          <select
            className="filter-input"
            value={filters.walletId}
            onChange={(e) => setFilter('walletId', e.target.value)}
          >
            <option value="">All wallets</option>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            className="filter-input"
            type="date"
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
            aria-label="From date"
          />
          <input
            className="filter-input"
            type="date"
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
            aria-label="To date"
          />
        </div>

        <div className="filter-bar">
          <button type="button" className="btn btn-primary" onClick={() => load()} disabled={loading}>
            {loading ? 'Filtering…' : 'Apply filters'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      <ul className="glass history-list">
        {items.map((tx) => (
          <li key={tx._id} className="history-row">
            <div className="history-row-main">
              <strong>
                {tx.type === 'transfer' ? 'Transfer' : tx.categoryId?.name || tx.type}
              </strong>
              <div className="history-meta">
                {new Date(tx.date).toLocaleDateString('en-IN')} ·{' '}
                {tx.type === 'transfer'
                  ? `${tx.fromWalletId?.name} → ${tx.toWalletId?.name}`
                  : tx.fromWalletId?.name || tx.toWalletId?.name}
                {tx.note ? ` · ${tx.note}` : ''}
              </div>
            </div>
            <div className="history-row-actions">
              <strong style={{ color: tx.type === 'income' ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {formatINR(tx.amount)}
              </strong>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                onClick={() =>
                  setEditing({
                    ...tx,
                    categoryId: tx.categoryId?._id || tx.categoryId || '',
                    fromWalletId: tx.fromWalletId?._id || tx.fromWalletId || '',
                    toWalletId: tx.toWalletId?._id || tx.toWalletId || '',
                    date: new Date(tx.date).toISOString().slice(0, 10),
                    amount: tx.amount,
                    note: tx.note || '',
                  })
                }
              >
                Edit
              </button>
              <button type="button" className="btn btn-danger btn-compact" onClick={() => remove(tx._id)}>
                Del
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="history-empty">No transactions match these filters.</li>}
      </ul>

      {editing && (
        <div className="modal-backdrop">
          <form className="modal glass" onSubmit={saveEdit}>
            <h3>Edit transaction</h3>
            <div className="field">
              <label>Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editing.amount}
                onChange={(e) => setEditing((s) => ({ ...s, amount: e.target.value }))}
              />
            </div>
            {editing.type !== 'transfer' && (
              <div className="field">
                <label>Category</label>
                <select
                  value={editing.categoryId}
                  onChange={(e) => setEditing((s) => ({ ...s, categoryId: e.target.value }))}
                >
                  {categories
                    .filter((c) => c.type === (editing.type === 'income' ? 'income' : 'expense'))
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {(editing.type === 'expense' || editing.type === 'transfer') && (
              <div className="field">
                <label>From wallet</label>
                <select
                  value={editing.fromWalletId}
                  onChange={(e) => setEditing((s) => ({ ...s, fromWalletId: e.target.value }))}
                >
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(editing.type === 'income' || editing.type === 'transfer') && (
              <div className="field">
                <label>To wallet</label>
                <select
                  value={editing.toWalletId}
                  onChange={(e) => setEditing((s) => ({ ...s, toWalletId: e.target.value }))}
                >
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing((s) => ({ ...s, date: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Note</label>
              <input value={editing.note} onChange={(e) => setEditing((s) => ({ ...s, note: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit">
                Save
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
