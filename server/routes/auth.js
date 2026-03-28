import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, lastInsertRowid } from '../db.js';
import { authRequired, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }
    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const insertUser = db.prepare(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)'
    );
    const insertSettings = db.prepare('INSERT INTO user_settings (user_id) VALUES (?)');

    const info = insertUser.run(full_name.trim(), normalizedEmail, password_hash);
    const userId = lastInsertRowid(info);
    insertSettings.run(userId);

    const token = signToken(userId);
    res.status(201).json({
      token,
      user: {
        id: String(userId),
        full_name: full_name.trim(),
        email: normalizedEmail,
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
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: String(user.id),
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authRequired, (req, res) => {
  try {
    const db = getDb();
    const uid = Number(req.userId);
    const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid);
    if (!settings) {
      db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(uid);
      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid);
    }
    res.json({
      user: {
        id: String(user.id),
        full_name: user.full_name,
        email: user.email,
      },
      settings: {
        theme: settings.theme,
        weekly_study_goal_hours: settings.weekly_study_goal_hours,
        study_reminders: Boolean(settings.study_reminders),
        daily_summary_reminders: Boolean(settings.daily_summary_reminders),
        deadline_reminders: Boolean(settings.deadline_reminders),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.patch('/me', authRequired, (req, res) => {
  try {
    const { full_name, email } = req.body;
    const db = getDb();
    const uid = Number(req.userId);
    const userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(uid);
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (email != null) {
      const next = String(email).toLowerCase().trim();
      const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(next, uid);
      if (taken) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    const updates = [];
    const values = [];
    if (full_name != null) {
      updates.push('full_name = ?');
      values.push(String(full_name).trim());
    }
    if (email != null) {
      updates.push('email = ?');
      values.push(String(email).toLowerCase().trim());
    }
    if (updates.length === 0) {
      const u = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(uid);
      return res.json({
        user: { id: String(u.id), full_name: u.full_name, email: u.email },
      });
    }
    updates.push("updated_at = datetime('now')");
    values.push(uid);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(uid);
    res.json({
      user: {
        id: String(user.id),
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
