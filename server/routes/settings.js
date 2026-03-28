import { Router } from 'express';
import UserSettings from '../models/UserSettings.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  let settings = await UserSettings.findOne({ user_id: req.userId }).lean();
  if (!settings) {
    const created = await UserSettings.create({ user_id: req.userId });
    settings = created.toObject();
  }
  res.json({
    setting_id: settings._id.toString(),
    user_id: settings.user_id.toString(),
    theme: settings.theme,
    weekly_study_goal_hours: settings.weekly_study_goal_hours,
    study_reminders: settings.study_reminders,
    daily_summary_reminders: settings.daily_summary_reminders,
    deadline_reminders: settings.deadline_reminders,
    updated_at: settings.updated_at,
  });
});

router.put('/', async (req, res) => {
  const {
    theme,
    weekly_study_goal_hours,
    study_reminders,
    daily_summary_reminders,
    deadline_reminders,
  } = req.body;
  const $set = {};
  if (theme != null) {
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'theme must be light or dark' });
    }
    $set.theme = theme;
  }
  if (weekly_study_goal_hours != null) {
    $set.weekly_study_goal_hours = Math.max(1, Math.min(80, Number(weekly_study_goal_hours)));
  }
  if (typeof study_reminders === 'boolean') $set.study_reminders = study_reminders;
  if (typeof daily_summary_reminders === 'boolean') {
    $set.daily_summary_reminders = daily_summary_reminders;
  }
  if (typeof deadline_reminders === 'boolean') $set.deadline_reminders = deadline_reminders;
  const settings = await UserSettings.findOneAndUpdate(
    { user_id: req.userId },
    { $set, $setOnInsert: { user_id: req.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  res.json({
    setting_id: settings._id.toString(),
    theme: settings.theme,
    weekly_study_goal_hours: settings.weekly_study_goal_hours,
    study_reminders: settings.study_reminders,
    daily_summary_reminders: settings.daily_summary_reminders,
    deadline_reminders: settings.deadline_reminders,
    updated_at: settings.updated_at,
  });
});

export default router;
