require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { startRecurringCron } = require('./services/recurringService');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallets');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');
const recurringRoutes = require('./routes/recurring');
const insightsRoutes = require('./routes/insights');
const alertRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

connectDB();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      // Same public host as CLIENT_URL (Cloudflare Tunnel / custom domain)
      try {
        if (CLIENT_URL && new URL(origin).host === new URL(CLIENT_URL).host) {
          return cb(null, true);
        }
      } catch {
        /* ignore bad URLs */
      }
      if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'expense-tracker-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/alerts', alertRoutes);

// Serve React build from the same Node process (laptop / tunnel hosting)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    errors: err.errors || undefined,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Expense_Tracker listening on http://0.0.0.0:${PORT}`);
  if (fs.existsSync(clientDist)) {
    console.log('Serving frontend from client/dist');
  } else {
    console.log('No client/dist yet — run: npm run build (from repo root)');
  }
  startRecurringCron();
});
