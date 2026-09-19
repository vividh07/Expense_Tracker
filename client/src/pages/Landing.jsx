import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <ThemeToggle className="theme-float" />
      <div className="landing-glow" />
      <motion.header
        className="landing-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="brand landing-brand">Expense_Tracker</p>
        <h1>Track every rupee without the spreadsheet guilt.</h1>
        <p className="landing-sub">
          Banks, cash, budgets, and day-to-day spends — in one glassy, lag-free home for your money.
        </p>
        <div className="landing-cta">
          <Link className="btn btn-primary" to="/register">
            Start free
          </Link>
          <Link className="btn btn-ghost" to="/login">
            Log in
          </Link>
        </div>
      </motion.header>
      <motion.div
        className="landing-panel glass"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.45 }}
      >
        <div className="lp-row">
          <span>Today’s pulse</span>
          <strong>₹4,280 spent</strong>
        </div>
        <div className="lp-bars">
          <div style={{ width: '72%' }} />
          <div style={{ width: '48%' }} />
          <div style={{ width: '91%' }} />
        </div>
        <p className="lp-note">Food · Travel · Petrol — budgets that actually nudge you.</p>
      </motion.div>
    </div>
  );
}
