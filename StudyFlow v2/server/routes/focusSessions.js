import { Router } from 'express';
import mongoose from 'mongoose';
import FocusSession from '../models/FocusSession.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const filter = { user_id: req.userId };
  if (from && to) {
    filter.session_date = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const sessions = await FocusSession.find(filter).sort({ session_date: -1, created_at: -1 }).lean();
  res.json(
    sessions.map((s) => ({
      fsession_id: s._id.toString(),
      user_id: s.user_id.toString(),
      duration_minutes: s.duration_minutes,
      actual_minutes: s.actual_minutes,
      start_time: s.start_time ? s.start_time.toISOString() : null,
      end_time: s.end_time ? s.end_time.toISOString() : null,
      completed: s.completed,
      session_date: s.session_date.toISOString().slice(0, 10),
      created_at: s.created_at,
    }))
  );
});

router.post('/', async (req, res) => {
  const {
    duration_minutes,
    actual_minutes,
    start_time,
    end_time,
    completed,
    session_date,
  } = req.body;
  if (!session_date) {
    return res.status(400).json({ error: 'session_date is required' });
  }
  const doc = await FocusSession.create({
    user_id: req.userId,
    duration_minutes: duration_minutes != null ? Number(duration_minutes) : 25,
    actual_minutes: actual_minutes != null ? Number(actual_minutes) : null,
    start_time: start_time ? new Date(start_time) : null,
    end_time: end_time ? new Date(end_time) : null,
    completed: Boolean(completed),
    session_date: new Date(session_date),
  });
  res.status(201).json({
    fsession_id: doc._id.toString(),
    duration_minutes: doc.duration_minutes,
    actual_minutes: doc.actual_minutes,
    completed: doc.completed,
    session_date: doc.session_date.toISOString().slice(0, 10),
  });
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const session = await FocusSession.findOne({ _id: req.params.id, user_id: req.userId });
  if (!session) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { actual_minutes, end_time, completed } = req.body;
  if (actual_minutes != null) session.actual_minutes = Number(actual_minutes);
  if (end_time != null) session.end_time = new Date(end_time);
  if (typeof completed === 'boolean') session.completed = completed;
  await session.save();
  res.json({ fsession_id: session._id.toString(), completed: session.completed });
});

export default router;
