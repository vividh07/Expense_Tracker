import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { errMsg } from '../utils/format';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setResetLink('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || 'Check for a reset link');
      if (data.resetLink) setResetLink(data.resetLink);
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
        <h1>Reset password</h1>
        <p className="auth-sub">Enter your account email to get a reset link.</p>
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        {resetLink && (
          <p className="auth-sub" style={{ wordBreak: 'break-all' }}>
            <Link to={resetLink.replace(/^https?:\/\/[^/]+/, '')}>Open reset link</Link>
          </p>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Get reset link'}
        </button>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
