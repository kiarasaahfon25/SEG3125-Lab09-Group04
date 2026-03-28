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
  const { from, to } = req.query;
  const db = getDb();
  const uid = Number(req.userId);
  let sql = 'SELECT * FROM focus_sessions WHERE user_id = ?';
  const params = [uid];
  if (from && to) {
    sql += ' AND session_date >= ? AND session_date <= ?';
    params.push(String(from).slice(0, 10), String(to).slice(0, 10));
  }
  sql += ' ORDER BY session_date DESC, datetime(created_at) DESC';
  const sessions = db.prepare(sql).all(...params);
  res.json(
    sessions.map((s) => ({
      fsession_id: String(s.id),
      user_id: String(s.user_id),
      duration_minutes: s.duration_minutes,
      actual_minutes: s.actual_minutes,
      start_time: s.start_time || null,
      end_time: s.end_time || null,
      completed: Boolean(s.completed),
      session_date: s.session_date.slice(0, 10),
      created_at: s.created_at,
    }))
  );
});

router.post('/', (req, res) => {
  const { duration_minutes, actual_minutes, start_time, end_time, completed, session_date } = req.body;
  if (!session_date) {
    return res.status(400).json({ error: 'session_date is required' });
  }
  const db = getDb();
  const uid = Number(req.userId);
  const dateKey = toDateKey(session_date);
  const info = db
    .prepare(
      `INSERT INTO focus_sessions (user_id, duration_minutes, actual_minutes, start_time, end_time, completed, session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      uid,
      duration_minutes != null ? Number(duration_minutes) : 25,
      actual_minutes != null ? Number(actual_minutes) : null,
      start_time ? new Date(start_time).toISOString() : null,
      end_time ? new Date(end_time).toISOString() : null,
      completed ? 1 : 0,
      dateKey
    );
  const doc = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(lastInsertRowid(info));
  res.status(201).json({
    fsession_id: String(doc.id),
    duration_minutes: doc.duration_minutes,
    actual_minutes: doc.actual_minutes,
    completed: Boolean(doc.completed),
    session_date: doc.session_date.slice(0, 10),
  });
});

router.patch('/:id', (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const db = getDb();
  const uid = Number(req.userId);
  const id = Number(req.params.id);
  const session = db.prepare('SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?').get(id, uid);
  if (!session) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { actual_minutes, end_time, completed } = req.body;
  let actual = session.actual_minutes;
  let end = session.end_time;
  let comp = session.completed;
  if (actual_minutes != null) actual = Number(actual_minutes);
  if (end_time != null) end = new Date(end_time).toISOString();
  if (typeof completed === 'boolean') comp = completed ? 1 : 0;
  db.prepare(
    'UPDATE focus_sessions SET actual_minutes = ?, end_time = ?, completed = ? WHERE id = ? AND user_id = ?'
  ).run(actual, end, comp, id, uid);
  const row = db.prepare('SELECT id, completed FROM focus_sessions WHERE id = ?').get(id);
  res.json({ fsession_id: String(row.id), completed: Boolean(row.completed) });
});

export default router;
