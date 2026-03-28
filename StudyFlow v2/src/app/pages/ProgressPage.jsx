import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, CheckCircle, Flame, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(start) {
  const e = new Date(start);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export default function ProgressPage() {
  const { settings } = useAuth();
  const [focusSessions, setFocusSessions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const weeklyGoal = settings?.weekly_study_goal_hours ?? 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sw = startOfWeek(new Date());
        const ew = endOfWeek(sw);
        const from = sw.toISOString().slice(0, 10);
        const to = ew.toISOString().slice(0, 10);
        const [f, t] = await Promise.all([
          api(`/focus-sessions?from=${from}&to=${to}`),
          api('/tasks'),
        ]);
        if (!cancelled) {
          setFocusSessions(f);
          setTasks(t);
        }
      } catch {
        if (!cancelled) {
          setFocusSessions([]);
          setTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyData = useMemo(() => {
    const sw = startOfWeek(new Date());
    const buckets = dayLabels.map((day) => ({ day, hours: 0 }));
    focusSessions.forEach((s) => {
      if (!s.completed || s.actual_minutes == null) {
        return;
      }
      const d = new Date(s.session_date + 'T12:00:00');
      const idx = Math.floor((d - sw) / (1000 * 60 * 60 * 24));
      if (idx >= 0 && idx < 7) {
        buckets[idx].hours += s.actual_minutes / 60;
      }
    });
    return buckets.map((b) => ({ ...b, hours: Math.round(b.hours * 10) / 10 }));
  }, [focusSessions]);

  const totalHours = weeklyData.reduce((sum, day) => sum + day.hours, 0);
  const goalProgress = weeklyGoal > 0 ? (totalHours / weeklyGoal) * 100 : 0;

  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const studyStreak = useMemo(() => {
    const daysWithStudy = new Set();
    focusSessions.forEach((s) => {
      if (s.completed && s.actual_minutes) {
        daysWithStudy.add(s.session_date.slice(0, 10));
      }
    });
    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const key = check.toISOString().slice(0, 10);
      if (daysWithStudy.has(key)) {
        streak += 1;
        check.setDate(check.getDate() - 1);
      } else if (i === 0) {
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [focusSessions]);

  const tasksDueThisWeek = useMemo(() => {
    const sw = startOfWeek(new Date());
    const ew = endOfWeek(sw);
    return tasks.filter((t) => {
      if (!t.deadline) {
        return false;
      }
      const d = new Date(t.deadline);
      return d >= sw && d <= ew;
    });
  }, [tasks]);
  const tasksDueThisWeekDone = tasksDueThisWeek.filter((t) => t.completed).length;
  const weekTaskBarPct =
    tasksDueThisWeek.length > 0 ? (tasksDueThisWeekDone / tasksDueThisWeek.length) * 100 : 0;

  const monthlyProgress = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length;
    return [
      { week: 'Week 1', completed: Math.max(0, Math.floor(completed * 0.2)) },
      { week: 'Week 2', completed: Math.max(0, Math.floor(completed * 0.35)) },
      { week: 'Week 3', completed: Math.max(0, Math.floor(completed * 0.55)) },
      { week: 'Week 4', completed: completed },
    ];
  }, [tasks]);

  const maxDay = weeklyData.reduce((m, d) => (d.hours > m.hours ? d : m), weeklyData[0] || { day: '—', hours: 0 });

  if (loading) {
    return <div className="p-8 text-gray-600">Loading progress…</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress &amp; Analytics</h1>
        <p className="text-gray-600">Track your productivity and study habits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Study hours this week</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tasks completed</p>
              <p className="text-2xl font-bold text-gray-900">{tasksCompleted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Study streak</p>
              <p className="text-2xl font-bold text-gray-900">{studyStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Weekly goal</p>
              <p className="text-2xl font-bold text-gray-900">{goalProgress.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly study hours</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="hours" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              You&apos;ve studied <span className="font-bold">{totalHours.toFixed(1)} hours</span> this week. Goal:{' '}
              {weeklyGoal} hours.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Tasks completed (approx. by week)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-800">
              Total completed tasks in your account: <span className="font-bold">{tasksCompleted}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Weekly study goal progress</h2>
          <span className="text-sm text-gray-600">
            {totalHours.toFixed(1)} / {weeklyGoal} hours
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
            style={{ width: `${Math.min(goalProgress, 100)}%` }}
          >
            {goalProgress > 10 && (
              <span className="text-white text-sm font-medium">{goalProgress.toFixed(0)}%</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {goalProgress >= 100
            ? "You've hit your weekly goal — great work."
            : `About ${Math.max(0, weeklyGoal - totalHours).toFixed(1)} more hours to reach your weekly goal.`}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">This week&apos;s task deadlines</h2>
          <span className="text-sm text-gray-600">
            {tasksDueThisWeekDone} / {tasksDueThisWeek.length || 0} done
          </span>
        </div>
        {tasksDueThisWeek.length === 0 ? (
          <p className="text-sm text-gray-600">No tasks with deadlines this week. Completed work still counts in the stat above.</p>
        ) : (
          <>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                style={{ width: `${Math.min(weekTaskBarPct, 100)}%` }}
              >
                {weekTaskBarPct > 12 && (
                  <span className="text-white text-sm font-medium">{Math.round(weekTaskBarPct)}%</span>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Tasks due Monday–Sunday this week. Checking them off updates this bar.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-gray-900 mb-2">Busiest day (this week)</h3>
          <p className="text-3xl font-bold text-blue-600">{maxDay?.day || '—'}</p>
          <p className="text-sm text-gray-600 mt-1">{maxDay?.hours?.toFixed(1) || 0} hours logged</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <h3 className="font-bold text-gray-900 mb-2">Average study time</h3>
          <p className="text-3xl font-bold text-purple-600">{(totalHours / 7).toFixed(1)}h</p>
          <p className="text-sm text-gray-600 mt-1">per day this week (including zeros)</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <h3 className="font-bold text-gray-900 mb-2">Completion rate</h3>
          <p className="text-3xl font-bold text-green-600">
            {tasks.length ? Math.round((tasksCompleted / tasks.length) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 mt-1">of tasks marked done</p>
        </div>
      </div>
    </div>
  );
}
