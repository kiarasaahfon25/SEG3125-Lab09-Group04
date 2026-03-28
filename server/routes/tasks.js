import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Course from '../models/Course.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function serializeTask(t, courseMap) {
  const cid = t.course_id ? t.course_id.toString() : null;
  const course = cid ? courseMap.get(cid) : null;
  return {
    task_id: t._id.toString(),
    user_id: t.user_id.toString(),
    course_id: cid,
    task_name: t.task_name,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    priority: t.priority,
    notes: t.notes || '',
    completed: t.completed,
    created_at: t.created_at,
    updated_at: t.updated_at,
    course_name: course ? course.course_name : null,
    course_code: course ? course.course_code : null,
  };
}

router.get('/', async (req, res) => {
  const tasks = await Task.find({ user_id: req.userId }).sort({ deadline: 1, created_at: -1 }).lean();
  const courseIds = [...new Set(tasks.map((t) => t.course_id).filter(Boolean).map((id) => id.toString()))];
  const courses = await Course.find({
    _id: { $in: courseIds },
    user_id: req.userId,
  }).lean();
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
  res.json(tasks.map((t) => serializeTask(t, courseMap)));
});

router.post('/', async (req, res) => {
  const { task_name, course_id, deadline, priority, notes } = req.body;
  if (!task_name) {
    return res.status(400).json({ error: 'task_name is required' });
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
  const task = await Task.create({
    user_id: req.userId,
    course_id: courseId,
    task_name: String(task_name).trim(),
    deadline: deadline ? new Date(deadline) : null,
    priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
    notes: notes != null ? String(notes) : '',
    completed: false,
  });
  const courseMap = new Map();
  if (courseId) {
    const c = await Course.findById(courseId).lean();
    if (c) {
      courseMap.set(c._id.toString(), c);
    }
  }
  res.status(201).json(serializeTask(task.toObject(), courseMap));
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { task_name, course_id, deadline, priority, notes, completed } = req.body;
  const task = await Task.findOne({ _id: req.params.id, user_id: req.userId });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task_name != null) task.task_name = String(task_name).trim();
  if (deadline !== undefined) {
    task.deadline = deadline ? new Date(deadline) : null;
  }
  if (priority != null && ['Low', 'Medium', 'High'].includes(priority)) {
    task.priority = priority;
  }
  if (notes !== undefined) task.notes = String(notes);
  if (typeof completed === 'boolean') task.completed = completed;
  if (course_id !== undefined) {
    if (!course_id) {
      task.course_id = null;
    } else {
      if (!mongoose.isValidObjectId(course_id)) {
        return res.status(400).json({ error: 'Invalid course_id' });
      }
      const course = await Course.findOne({ _id: course_id, user_id: req.userId });
      if (!course) {
        return res.status(400).json({ error: 'Course not found' });
      }
      task.course_id = course._id;
    }
  }
  await task.save();
  const courseMap = new Map();
  if (task.course_id) {
    const c = await Course.findById(task.course_id).lean();
    if (c) {
      courseMap.set(c._id.toString(), c);
    }
  }
  res.json(serializeTask(task.toObject(), courseMap));
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await Task.deleteOne({ _id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).end();
});

export default router;
