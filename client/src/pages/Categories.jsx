import { useEffect, useState } from 'react';
import api from '../api/client';
import { errMsg, formatINR } from '../utils/format';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [budgetLimit, setBudget] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/categories');
    setCategories(data.categories);
  };

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', {
        name: name.trim(),
        type,
        budgetLimit: budgetLimit ? Number(budgetLimit) : null,
      });
      setName('');
      setBudget('');
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const setCatBudget = async (cat) => {
    const next = prompt(`Monthly budget for ${cat.name} (blank to clear)`, cat.budgetLimit ?? '');
    if (next === null) return;
    try {
      await api.patch(`/categories/${cat._id}`, {
        budgetLimit: next === '' ? null : Number(next),
      });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (cat) => {
    if (!confirm(`Delete ${cat.name}?`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Categories</h1>
      <p className="page-sub">Defaults plus your own. Budgets optional.</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="grid-2">
        {categories.map((c) => (
          <div key={c._id} className="glass" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 99,
                  background: c.color,
                  display: 'inline-block',
                }}
              />
              <div style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <div style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'capitalize' }}>
                  {c.type}
                  {c.budgetLimit != null ? ` · budget ${formatINR(c.budgetLimit)}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {c.type === 'expense' && (
                <button type="button" className="btn btn-ghost" onClick={() => setCatBudget(c)}>
                  Set budget
                </button>
              )}
              {!c.isSystem && (
                <button type="button" className="btn btn-danger" onClick={() => remove(c)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="glass" style={{ padding: '1.25rem', marginTop: '1rem' }} onSubmit={add}>
        <h3 style={{ marginTop: 0 }}>Add category</h3>
        <div className="field">
          <label>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        {type === 'expense' && (
          <div className="field">
            <label>Budget limit (optional)</label>
            <input type="number" min="1" value={budgetLimit} onChange={(e) => setBudget(e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </form>
    </div>
  );
}
