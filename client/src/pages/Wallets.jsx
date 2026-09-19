import { useEffect, useState } from 'react';
import api from '../api/client';
import { errMsg, formatINR } from '../utils/format';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    const { data } = await api.get('/wallets');
    setWallets(data.wallets);
  };

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, []);

  const addBank = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api.post('/wallets', {
        type: 'bank',
        name: name.trim(),
        balance: Number(balance) || 0,
      });
      setName('');
      setBalance('');
      setOk('Bank added with opening balance');
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const rename = async (wallet) => {
    const next = prompt('Rename wallet', wallet.name);
    if (!next || next === wallet.name) return;
    try {
      await api.patch(`/wallets/${wallet._id}`, { name: next });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const adjust = async (wallet) => {
    const next = prompt('Set balance (₹)', String(wallet.balance));
    if (next === null) return;
    try {
      await api.patch(`/wallets/${wallet._id}`, { setBalance: Number(next) });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (wallet) => {
    if (!confirm(`Delete ${wallet.name}?`)) return;
    try {
      await api.delete(`/wallets/${wallet._id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Wallets</h1>
      <p className="page-sub">Banks with opening balances + cash.</p>
      {error && <div className="error-banner">{error}</div>}
      {ok && <div className="success-banner">{ok}</div>}

      <div className="grid-2">
        {wallets.map((w) => (
          <div key={w._id} className="glass" style={{ padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <strong>{w.name}</strong>
                <div style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'capitalize' }}>{w.type}</div>
              </div>
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{formatINR(w.balance)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={() => rename(w)}>
                Rename
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => adjust(w)}>
                Set balance
              </button>
              {w.type === 'bank' && (
                <button type="button" className="btn btn-danger" onClick={() => remove(w)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="glass" style={{ padding: '1.25rem', marginTop: '1rem' }} onSubmit={addBank}>
        <h3 style={{ marginTop: 0 }}>Add bank</h3>
        <div className="field">
          <label>Bank name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC / SBI / …" />
        </div>
        <div className="field">
          <label>Opening balance (₹)</label>
          <input type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Add bank
        </button>
      </form>
    </div>
  );
}
