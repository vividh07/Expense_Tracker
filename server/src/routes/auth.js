const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/authTokens');
const { seedUserDefaults } = require('../services/seedService');
const { processDueRecurring } = require('../services/recurringService');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, try again later' },
});

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  hasPassword: !!user.passwordHash,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const clientBase = () => (process.env.CLIENT_URL || 'http://localhost:5000').replace(/\/$/, '');

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
    });
    await seedUserDefaults(user._id);

    const token = signToken(user._id);
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    processDueRecurring(user._id).catch(() => {});
    res.json({ user: publicUser(user), token });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: 'Google sign-in is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Google account has no email' });
    }

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
    let isNew = false;
    if (!user) {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        avatar: payload.picture,
      });
      await seedUserDefaults(user._id);
      isNew = true;
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      if (payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    if (!isNew) processDueRecurring(user._id).catch(() => {});
    res.json({ user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, async (req, res) => {
  processDueRecurring(req.user._id).catch(() => {});
  res.json({ user: publicUser(req.user) });
});

router.patch('/profile', protect, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(60).optional(),
      email: z.string().email().optional(),
    });
    const data = schema.parse(req.body);
    if (!data.name && !data.email) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (data.name) user.name = data.name.trim();
    if (data.email) {
      const nextEmail = data.email.toLowerCase().trim();
      if (nextEmail !== user.email) {
        const taken = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
        if (taken) return res.status(409).json({ message: 'Email already in use' });
        user.email = nextEmail;
      }
    }

    await user.save();
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.patch('/password', protect, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6).max(72),
    });
    const data = schema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.passwordHash) {
      if (!data.currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ user: publicUser(user), message: 'Password updated' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });

    const generic = {
      message:
        'If that email exists, a reset link is ready. Use the link below (self-host) or check server logs.',
    };

    if (!user) {
      return res.json(generic);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetLink = `${clientBase()}/reset-password?token=${rawToken}`;
    console.log(`[password-reset] ${user.email} → ${resetLink}`);

    res.json({
      ...generic,
      resetLink,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string().min(20),
      newPassword: z.string().min(6).max(72),
    });
    const data = schema.parse(req.body);
    const tokenHash = hashToken(data.token);

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can log in now.' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

module.exports = router;
