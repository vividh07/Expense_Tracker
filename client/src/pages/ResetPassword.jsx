import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { errMsg } from '../utils/format';
import './Auth.css';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Missing reset token. Request a new link.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword });
      setMessage(data.message || 'Password updated');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <ThemeToggle className="theme-float" />
      <form className="auth-card glass" onSubmit={onSubmit}>
        <div className="brand auth-brand">Expense_Tracker</div>
        <h1>Choose new password</h1>
        <p className="auth-sub">Link expires in one hour.</p>
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            minLength={6}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            minLength={6}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy || !token}>
          {busy ? 'Saving…' : 'Reset password'}
        </button>
        <p className="auth-switch">
          <Link to="/forgot-password">Request a new link</Link>
          {' · '}
          <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
