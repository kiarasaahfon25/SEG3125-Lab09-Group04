import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import tasksRoutes from './routes/tasks.js';
import studySessionsRoutes from './routes/studySessions.js';
import focusSessionsRoutes from './routes/focusSessions.js';
import settingsRoutes from './routes/settings.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/focus-sessions', focusSessionsRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

initDb();
console.log('SQLite database ready');

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
