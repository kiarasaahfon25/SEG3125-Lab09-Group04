import { Router } from 'express';
import { getDb, lastInsertRowid } from '../db.js';
import { isValidId } from '../lib/ids.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function toDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

router.get('/', (req, res) => {
  const { year, month } = req.query;
  const db = getDb();
  const uid = Number(req.userId);
  let sql = 'SELECT * FROM study_sessions WHERE user_id = ?';
  const params = [uid];
  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 0 && m <= 11) {
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const last = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
      sql += ' AND session_date >= ? AND session_date <= ?';
      params.push(start, end);
    }
  }
  sql += ' ORDER BY session_date ASC';
  const sessions = db.prepare(sql).all(...params);
  res.json(
    sessions.map((s) => ({
      session_id: String(s.id),
      user_id: String(s.user_id),
      course_id: s.course_id != null ? String(s.course_id) : null,
      task_id: s.task_id != null ? String(s.task_id) : null,
      session_title: s.session_title,
      session_type: s.session_type,
      session_date: s.session_date.slice(0, 10),
      notes: s.notes || '',
      created_at: s.created_at,
    }))
  );
});

router.post('/', (req, res) => {
  const { session_title, session_type, session_date, course_id, task_id, notes } = req.body;
  if (!session_title || !session_type || !session_date) {
    return res.status(400).json({ error: 'session_title, session_type, and session_date are required' });
  }
  if (!['Study Session', 'Assignment'].includes(session_type)) {
    return res.status(400).json({ error: 'session_type must be "Study Session" or "Assignment"' });
  }
  const db = getDb();
  const uid = Number(req.userId);
  let courseIdVal = null;
  if (course_id) {
    if (!isValidId(String(course_id))) {
      return res.status(400).json({ error: 'Invalid course_id' });
    }
    const course = db
      .prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
      .get(Number(course_id), uid);
    if (!course) {
      return res.status(400).json({ error: 'Course not found' });
    }
    courseIdVal = course.id;
  }
  let taskIdVal = null;
  if (task_id) {
    if (!isValidId(String(task_id))) {
      return res.status(400).json({ error: 'Invalid task_id' });
    }
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(Number(task_id), uid);
    if (!task) {
      return res.status(400).json({ error: 'Task not found' });
    }
    taskIdVal = task.id;
  }
  const dateKey = toDateKey(session_date);
  const info = db
    .prepare(
      `INSERT INTO study_sessions (user_id, course_id, task_id, session_title, session_type, session_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      uid,
      courseIdVal,
      taskIdVal,
      String(session_title).trim(),
      session_type,
      dateKey,
      notes != null ? String(notes) : ''
    );
  const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(lastInsertRowid(info));
  res.status(201).json({
    session_id: String(session.id),
    session_title: session.session_title,
    session_type: session.session_type,
    session_date: session.session_date.slice(0, 10),
  });
});

router.delete('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const db = getDb();
  const info = db
    .prepare('DELETE FROM study_sessions WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.userId));
  if (Number(info.changes) === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).end();
});

export default router;
