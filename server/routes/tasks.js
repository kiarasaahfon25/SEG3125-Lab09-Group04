import { Router } from 'express';
import { getDb, lastInsertRowid } from '../db.js';
import { isValidId } from '../lib/ids.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function serializeTask(t, courseMap) {
  const cid = t.course_id != null ? String(t.course_id) : null;
  const course = cid ? courseMap.get(cid) : null;
  let deadlineIso = null;
  if (t.deadline) {
    const d = new Date(t.deadline);
    deadlineIso = Number.isNaN(d.getTime()) ? t.deadline : d.toISOString();
  }
  return {
    task_id: String(t.id),
    user_id: String(t.user_id),
    course_id: cid,
    task_name: t.task_name,
    deadline: deadlineIso,
    priority: t.priority,
    notes: t.notes || '',
    completed: Boolean(t.completed),
    created_at: t.created_at,
    updated_at: t.updated_at,
    course_name: course ? course.course_name : null,
    course_code: course ? course.course_code : null,
  };
}

router.get('/', (req, res) => {
  const db = getDb();
  const uid = Number(req.userId);
  const tasks = db
    .prepare(
      `SELECT * FROM tasks WHERE user_id = ?
       ORDER BY deadline IS NULL, deadline ASC, datetime(created_at) DESC`
    )
    .all(uid);
  const courseIds = [...new Set(tasks.map((t) => t.course_id).filter((x) => x != null))];
  const courseMap = new Map();
  for (const cid of courseIds) {
    const c = db
      .prepare('SELECT id, course_name, course_code FROM courses WHERE id = ? AND user_id = ?')
      .get(cid, uid);
    if (c) {
      courseMap.set(String(c.id), c);
    }
  }
  res.json(tasks.map((t) => serializeTask(t, courseMap)));
});

router.post('/', (req, res) => {
  const { task_name, course_id, deadline, priority, notes } = req.body;
  if (!task_name) {
    return res.status(400).json({ error: 'task_name is required' });
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
  const deadlineStr =
    deadline != null && deadline !== ''
      ? new Date(deadline).toISOString()
      : null;
  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, course_id, task_name, deadline, priority, notes, completed)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      uid,
      courseIdVal,
      String(task_name).trim(),
      deadlineStr,
      ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      notes != null ? String(notes) : ''
    );
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(lastInsertRowid(info));
  const courseMap = new Map();
  if (task.course_id) {
    const c = db.prepare('SELECT id, course_name, course_code FROM courses WHERE id = ?').get(task.course_id);
    if (c) courseMap.set(String(c.id), c);
  }
  res.status(201).json(serializeTask(task, courseMap));
});

router.patch('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { task_name, course_id, deadline, priority, notes, completed } = req.body;
  const db = getDb();
  const uid = Number(req.userId);
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, uid);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  let courseIdVal = task.course_id;
  if (task_name != null) {
    task.task_name = String(task_name).trim();
  }
  if (deadline !== undefined) {
    task.deadline =
      deadline != null && deadline !== '' ? new Date(deadline).toISOString() : null;
  }
  if (priority != null && ['Low', 'Medium', 'High'].includes(priority)) {
    task.priority = priority;
  }
  if (notes !== undefined) task.notes = String(notes);
  if (typeof completed === 'boolean') task.completed = completed ? 1 : 0;
  if (course_id !== undefined) {
    if (!course_id) {
      courseIdVal = null;
    } else {
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
  }
  db.prepare(
    `UPDATE tasks SET task_name = ?, deadline = ?, priority = ?, notes = ?, completed = ?, course_id = ?,
     updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(
    task.task_name,
    task.deadline,
    task.priority,
    task.notes,
    task.completed,
    courseIdVal,
    id,
    uid
  );
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  const courseMap = new Map();
  if (updated.course_id) {
    const c = db.prepare('SELECT id, course_name, course_code FROM courses WHERE id = ?').get(updated.course_id);
    if (c) courseMap.set(String(c.id), c);
  }
  res.json(serializeTask(updated, courseMap));
});

router.delete('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const db = getDb();
  const info = db
    .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.userId));
  if (Number(info.changes) === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).end();
});

export default router;
