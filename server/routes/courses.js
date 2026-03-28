import { Router } from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const courses = await Course.find({ user_id: req.userId }).sort({ created_at: -1 }).lean();
  res.json(
    courses.map((c) => ({
      course_id: c._id.toString(),
      user_id: c.user_id.toString(),
      course_name: c.course_name,
      course_code: c.course_code,
      color_tag: c.color_tag,
      created_at: c.created_at,
    }))
  );
});

router.post('/', async (req, res) => {
  const { course_name, course_code, color_tag } = req.body;
  if (!course_name) {
    return res.status(400).json({ error: 'course_name is required' });
  }
  const course = await Course.create({
    user_id: req.userId,
    course_name: String(course_name).trim(),
    course_code: course_code ? String(course_code).trim() : undefined,
    color_tag: color_tag ? String(color_tag).trim() : undefined,
  });
  res.status(201).json({
    course_id: course._id.toString(),
    user_id: course.user_id.toString(),
    course_name: course.course_name,
    course_code: course.course_code,
    color_tag: course.color_tag,
    created_at: course.created_at,
  });
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { course_name, course_code, color_tag } = req.body;
  const $set = {};
  if (course_name != null) $set.course_name = String(course_name).trim();
  if (course_code !== undefined) $set.course_code = course_code ? String(course_code).trim() : '';
  if (color_tag !== undefined) $set.color_tag = color_tag ? String(color_tag).trim() : '';
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, user_id: req.userId },
    { $set },
    { new: true }
  ).lean();
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.json({
    course_id: course._id.toString(),
    course_name: course.course_name,
    course_code: course.course_code,
    color_tag: course.color_tag,
  });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await Course.deleteOne({ _id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.status(204).end();
});

export default router;
