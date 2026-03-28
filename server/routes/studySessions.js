import { Router } from 'express';
import mongoose from 'mongoose';
import StudySession from '../models/StudySession.js';
import Course from '../models/Course.js';
import Task from '../models/Task.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const { year, month } = req.query;
  const filter = { user_id: req.userId };
  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 0 && m <= 11) {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      filter.session_date = { $gte: start, $lte: end };
    }
  }
  const sessions = await StudySession.find(filter).sort({ session_date: 1 }).lean();
  res.json(
    sessions.map((s) => ({
      session_id: s._id.toString(),
      user_id: s.user_id.toString(),
      course_id: s.course_id ? s.course_id.toString() : null,
      task_id: s.task_id ? s.task_id.toString() : null,
      session_title: s.session_title,
      session_type: s.session_type,
      session_date: s.session_date.toISOString().slice(0, 10),
      notes: s.notes || '',
      created_at: s.created_at,
    }))
  );
});

router.post('/', async (req, res) => {
  const { session_title, session_type, session_date, course_id, task_id, notes } = req.body;
  if (!session_title || !session_type || !session_date) {
    return res.status(400).json({ error: 'session_title, session_type, and session_date are required' });
  }
  if (!['Study Session', 'Assignment'].includes(session_type)) {
    return res.status(400).json({ error: 'session_type must be "Study Session" or "Assignment"' });
  }
  let courseId = null;
  if (course_id) {
    if (!mongoose.isValidObjectId(course_id)) {
      return res.status(400).json({ error: 'Invalid course_id' });
    }
    const course = await Course.findOne({ _id: course_id, user_id: req.userId });
    if (!course) {
      return res.status(400).json({ error: 'Course not found' });
    }
    courseId = course._id;
  }
  let taskId = null;
  if (task_id) {
    if (!mongoose.isValidObjectId(task_id)) {
      return res.status(400).json({ error: 'Invalid task_id' });
    }
    const task = await Task.findOne({ _id: task_id, user_id: req.userId });
    if (!task) {
      return res.status(400).json({ error: 'Task not found' });
    }
    taskId = task._id;
  }
  const session = await StudySession.create({
    user_id: req.userId,
    course_id: courseId,
    task_id: taskId,
    session_title: String(session_title).trim(),
    session_type,
    session_date: new Date(session_date),
    notes: notes != null ? String(notes) : '',
  });
  res.status(201).json({
    session_id: session._id.toString(),
    session_title: session.session_title,
    session_type: session.session_type,
    session_date: session.session_date.toISOString().slice(0, 10),
  });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await StudySession.deleteOne({ _id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).end();
});

export default router;
