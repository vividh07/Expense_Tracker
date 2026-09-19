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
  { to: '/app/settings', label: 'Settings', icon: '⚙' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

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
              <span>{l.icon}</span> {l.label}
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
          <button type="button" className="btn btn-ghost btn-menu-mobile" onClick={() => setDrawerOpen(true)}>
            Menu
          </button>
          <div className="brand">Expense_Tracker</div>
          <div className="top-actions">
            <ThemeToggle />
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
          className={`bottom-more ${moreActive || drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          <span className="nav-icon">☰</span>
          <span>Menu</span>
        </button>
      </nav>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.aside
              className="drawer-panel glass"
              initial={{ x: -28, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="brand drawer-brand">Expense_Tracker</div>
              <p className="drawer-user">Hi, {user?.name?.split(' ')[0]}</p>
              <nav className="drawer-links">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{l.icon}</span> {l.label}
                  </NavLink>
                ))}
                <div className="drawer-divider" />
                {moreLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{l.icon}</span> {l.label}
                  </NavLink>
                ))}
              </nav>
              <div className="drawer-footer">
                <ThemeToggle />
                <button type="button" className="btn btn-ghost" onClick={onLogout}>
                  Log out
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
