import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { errMsg, formatINR, todayInput } from '../utils/format';

export default function Transfer() {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [fromWalletId, setFrom] = useState('');
  const [toWalletId, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/wallets')
      .then(({ data }) => {
        setWallets(data.wallets);
        setFrom(data.wallets[0]?._id || '');
        setTo(data.wallets[1]?._id || data.wallets[0]?._id || '');
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/transactions', {
        type: 'transfer',
        amount: Number(amount),
        fromWalletId,
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
      <h1 className="page-title">Transfer</h1>
      <p className="page-sub">Move money between banks or cash.</p>
      {error && <div className="error-banner">{error}</div>}
      <form className="glass" style={{ padding: '1.25rem' }} onSubmit={submit}>
        <div className="field">
          <label>From</label>
          <select value={fromWalletId} onChange={(e) => setFrom(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} · {formatINR(w.balance)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>To</label>
          <select value={toWalletId} onChange={(e) => setTo(e.target.value)} required>
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} · {formatINR(w.balance)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Moving…' : 'Transfer'}
        </button>
      </form>
    </div>
  );
}
