import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
import { authRequired, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
    });
    await UserSettings.create({ user_id: user._id });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let settings = await UserSettings.findOne({ user_id: req.userId }).lean();
    if (!settings) {
      settings = await UserSettings.create({ user_id: req.userId });
      settings = settings.toObject();
    }
    res.json({
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
      },
      settings: {
        theme: settings.theme,
        weekly_study_goal_hours: settings.weekly_study_goal_hours,
        study_reminders: settings.study_reminders,
        daily_summary_reminders: settings.daily_summary_reminders,
        deadline_reminders: settings.deadline_reminders,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.patch('/me', authRequired, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const updates = {};
    if (full_name != null) updates.full_name = String(full_name).trim();
    if (email != null) {
      const next = String(email).toLowerCase().trim();
      const taken = await User.findOne({ email: next, _id: { $ne: req.userId } });
      if (taken) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.email = next;
    }
    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
