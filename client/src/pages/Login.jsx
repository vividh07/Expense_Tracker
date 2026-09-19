import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { errMsg } from '../utils/format';
import './Auth.css';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const googleReady = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <ThemeToggle className="theme-float" />
      <form className="auth-card glass" onSubmit={onSubmit}>
        <div className="brand auth-brand">Expense_Tracker</div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Your wallets are waiting.</p>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
        {googleReady && (
          <div className="google-wrap">
            <GoogleLogin
              onSuccess={async (res) => {
                try {
                  await loginWithGoogle(res.credential);
                  navigate('/app');
                } catch (err) {
                  setError(errMsg(err, 'Google sign-in failed'));
                }
              }}
              onError={() => setError('Google sign-in failed')}
              theme="filled_black"
              shape="pill"
              width="320"
            />
          </div>
        )}
        <p className="auth-switch">
          New here? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
