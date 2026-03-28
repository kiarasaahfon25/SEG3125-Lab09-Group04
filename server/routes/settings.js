import { Router } from 'express';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const db = getDb();
  const uid = Number(req.userId);
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid);
  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(uid);
    settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid);
  }
  res.json({
    setting_id: String(settings.id),
    user_id: String(settings.user_id),
    theme: settings.theme,
    weekly_study_goal_hours: settings.weekly_study_goal_hours,
    study_reminders: Boolean(settings.study_reminders),
    daily_summary_reminders: Boolean(settings.daily_summary_reminders),
    deadline_reminders: Boolean(settings.deadline_reminders),
    updated_at: settings.updated_at,
  });
});

router.put('/', (req, res) => {
  const {
    theme,
    weekly_study_goal_hours,
    study_reminders,
    daily_summary_reminders,
    deadline_reminders,
  } = req.body;
  const db = getDb();
  const uid = Number(req.userId);

  if (theme != null && !['light', 'dark'].includes(theme)) {
    return res.status(400).json({ error: 'theme must be light or dark' });
  }

  const existing = db.prepare('SELECT id FROM user_settings WHERE user_id = ?').get(uid);
  if (!existing) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(uid);
  }

  const updates = [];
  const values = [];
  if (theme != null) {
    updates.push('theme = ?');
    values.push(theme);
  }
  if (weekly_study_goal_hours != null) {
    updates.push('weekly_study_goal_hours = ?');
    values.push(Math.max(1, Math.min(80, Number(weekly_study_goal_hours))));
  }
  if (typeof study_reminders === 'boolean') {
    updates.push('study_reminders = ?');
    values.push(study_reminders ? 1 : 0);
  }
  if (typeof daily_summary_reminders === 'boolean') {
    updates.push('daily_summary_reminders = ?');
    values.push(daily_summary_reminders ? 1 : 0);
  }
  if (typeof deadline_reminders === 'boolean') {
    updates.push('deadline_reminders = ?');
    values.push(deadline_reminders ? 1 : 0);
  }
  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    values.push(uid);
    db.prepare(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
  }

  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid);
  res.json({
    setting_id: String(settings.id),
    theme: settings.theme,
    weekly_study_goal_hours: settings.weekly_study_goal_hours,
    study_reminders: Boolean(settings.study_reminders),
    daily_summary_reminders: Boolean(settings.daily_summary_reminders),
    deadline_reminders: Boolean(settings.deadline_reminders),
    updated_at: settings.updated_at,
  });
});

export default router;
