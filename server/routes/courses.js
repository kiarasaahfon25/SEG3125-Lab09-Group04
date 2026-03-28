import { Router } from 'express';
import { getDb, lastInsertRowid } from '../db.js';
import { isValidId } from '../lib/ids.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const db = getDb();
  const uid = Number(req.userId);
  const courses = db
    .prepare(
      'SELECT id, user_id, course_name, course_code, color_tag, created_at FROM courses WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(uid);
  res.json(
    courses.map((c) => ({
      course_id: String(c.id),
      user_id: String(c.user_id),
      course_name: c.course_name,
      course_code: c.course_code,
      color_tag: c.color_tag,
      created_at: c.created_at,
    }))
  );
});

router.post('/', (req, res) => {
  const { course_name, course_code, color_tag } = req.body;
  if (!course_name) {
    return res.status(400).json({ error: 'course_name is required' });
  }
  const db = getDb();
  const uid = Number(req.userId);
  const info = db
    .prepare(
      'INSERT INTO courses (user_id, course_name, course_code, color_tag) VALUES (?, ?, ?, ?)'
    )
    .run(
      uid,
      String(course_name).trim(),
      course_code ? String(course_code).trim() : null,
      color_tag ? String(color_tag).trim() : null
    );
  const course = db
    .prepare('SELECT id, user_id, course_name, course_code, color_tag, created_at FROM courses WHERE id = ?')
    .get(lastInsertRowid(info));
  res.status(201).json({
    course_id: String(course.id),
    user_id: String(course.user_id),
    course_name: course.course_name,
    course_code: course.course_code,
    color_tag: course.color_tag,
    created_at: course.created_at,
  });
});

router.patch('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { course_name, course_code, color_tag } = req.body;
  const db = getDb();
  const uid = Number(req.userId);
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(id, uid);
  if (!row) {
    return res.status(404).json({ error: 'Course not found' });
  }
  const updates = [];
  const values = [];
  if (course_name != null) {
    updates.push('course_name = ?');
    values.push(String(course_name).trim());
  }
  if (course_code !== undefined) {
    updates.push('course_code = ?');
    values.push(course_code ? String(course_code).trim() : '');
  }
  if (color_tag !== undefined) {
    updates.push('color_tag = ?');
    values.push(color_tag ? String(color_tag).trim() : '');
  }
  if (updates.length) {
    values.push(id, uid);
    db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
  }
  const course = db.prepare('SELECT id, course_name, course_code, color_tag FROM courses WHERE id = ?').get(id);
  res.json({
    course_id: String(course.id),
    course_name: course.course_name,
    course_code: course.course_code,
    color_tag: course.color_tag,
  });
});

router.delete('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const db = getDb();
  const info = db
    .prepare('DELETE FROM courses WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.userId));
  if (Number(info.changes) === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.status(204).end();
});

export default router;
