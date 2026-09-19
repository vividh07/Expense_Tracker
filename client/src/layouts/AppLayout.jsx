import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import './AppLayout.css';

const links = [
  { to: '/app', end: true, label: 'Home', icon: '◈' },
  { to: '/app/expense', label: 'Spend', icon: '↓' },
  { to: '/app/income', label: 'Income', icon: '↑' },
  { to: '/app/history', label: 'History', icon: '☰' },
  { to: '/app/reports', label: 'Reports', icon: '◉' },
];

const moreLinks = [
  { to: '/app/transfer', label: 'Transfer', icon: '⇄' },
  { to: '/app/wallets', label: 'Wallets', icon: '▣' },
  { to: '/app/categories', label: 'Categories', icon: '▤' },
  { to: '/app/recurring', label: 'Recurring', icon: '↻' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const moreActive = moreLinks.some((l) => location.pathname.startsWith(l.to));

  return (
    <div className="app-shell">
      <aside className="side-nav glass">
        <div className="brand side-brand">Expense_Tracker</div>
        <p className="side-user">Hi, {user?.name?.split(' ')[0]}</p>
        <nav className="side-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{l.icon}</span> {l.label}
            </NavLink>
          ))}
          <div className="side-divider" />
          {moreLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <ThemeToggle />
          <button type="button" className="btn btn-ghost logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="top-bar glass">
          <div className="brand">Expense_Tracker</div>
          <div className="top-actions">
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-more-mobile" onClick={() => setMoreOpen(true)}>
              More
            </button>
            <button type="button" className="btn btn-ghost btn-logout-label" onClick={onLogout}>
              Log out
            </button>
          </div>
        </header>
        <motion.div
          className="page-frame"
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="bottom-nav glass" aria-label="Primary">
        {links.slice(0, 4).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`bottom-more ${moreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <span className="nav-icon">⋯</span>
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="more-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              className="more-sheet glass"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="more-sheet-handle" />
              <h3>More</h3>
              <div className="more-grid">
                {[...moreLinks, { to: '/app/reports', label: 'Reports', icon: '◉' }].map((l) => (
                  <NavLink key={l.to} to={l.to} className="more-item" onClick={() => setMoreOpen(false)}>
                    <span className="more-icon">{l.icon}</span>
                    <span>{l.label}</span>
                  </NavLink>
                ))}
              </div>
              <div className="more-sheet-actions">
                <ThemeToggle />
                <button type="button" className="btn btn-ghost" onClick={onLogout}>
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
