import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../utils/format';
import './Settings.css';

export default function Settings() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    setProfileErr('');
    setProfileMsg('');
    try {
      await api.patch('/auth/profile', { name, email });
      await refresh();
      setProfileMsg('Profile updated');
    } catch (err) {
      setProfileErr(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    setPassErr('');
    setPassMsg('');
    if (newPassword !== confirmPassword) {
      setPassErr('New passwords do not match');
      setBusy('');
      return;
    }
    try {
      await api.patch('/auth/password', {
        currentPassword: user?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      await refresh();
      setPassMsg(user?.hasPassword ? 'Password changed' : 'Password set');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassErr(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const requestReset = async () => {
    setBusy('reset');
    setResetErr('');
    setResetMsg('');
    setResetLink('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email: user.email });
      setResetMsg(data.message || 'Reset link created');
      if (data.resetLink) setResetLink(data.resetLink);
    } catch (err) {
      setResetErr(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Update your name, email, and password.</p>

      <form className="glass settings-card" onSubmit={saveProfile}>
        <h3>Profile</h3>
        {profileErr && <div className="error-banner">{profileErr}</div>}
        {profileMsg && <div className="success-banner">{profileMsg}</div>}
        <div className="field">
          <label htmlFor="settings-name">Name</label>
          <input id="settings-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="settings-email">Email (Gmail)</label>
          <input
            id="settings-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy === 'profile'}>
          {busy === 'profile' ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <form className="glass settings-card" onSubmit={changePassword}>
        <h3>{user?.hasPassword ? 'Change password' : 'Set password'}</h3>
        <p className="settings-hint">
          {user?.hasPassword
            ? 'Enter your current password, then choose a new one.'
            : 'You signed in with Google — set a password to also log in with email.'}
        </p>
        {passErr && <div className="error-banner">{passErr}</div>}
        {passMsg && <div className="success-banner">{passMsg}</div>}
        {user?.hasPassword && (
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
        )}
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
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            minLength={6}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy === 'password'}>
          {busy === 'password' ? 'Updating…' : user?.hasPassword ? 'Change password' : 'Set password'}
        </button>
      </form>

      <section className="glass settings-card">
        <h3>Reset password</h3>
        <p className="settings-hint">
          Generates a one-hour reset link for <strong>{user?.email}</strong>. On self-host, the link is shown
          here (and printed in the server log).
        </p>
        {resetErr && <div className="error-banner">{resetErr}</div>}
        {resetMsg && <div className="success-banner">{resetMsg}</div>}
        {resetLink && (
          <p className="reset-link-box">
            <a href={resetLink}>Open reset link</a>
          </p>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={requestReset}
          disabled={busy === 'reset' || !user?.email}
        >
          {busy === 'reset' ? 'Creating link…' : 'Create reset link'}
        </button>
      </section>
    </div>
  );
}
