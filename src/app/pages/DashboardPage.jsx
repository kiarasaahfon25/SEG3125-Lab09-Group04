import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'High':
      return 'text-red-600 bg-red-50';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'Low':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function daysUntil(dateStr) {
  if (!dateStr) {
    return null;
  }
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const weeklyGoalHours = settings?.weekly_study_goal_hours ?? 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const taskList = await api('/tasks');
        const sw = startOfWeek(new Date());
        const ew = endOfWeek(sw);
        const from = sw.toISOString().slice(0, 10);
        const to = ew.toISOString().slice(0, 10);
        const focus = await api(`/focus-sessions?from=${from}&to=${to}`);
        if (!cancelled) {
          setTasks(taskList);
          setFocusSessions(focus);
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
          setFocusSessions([]);
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

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 6)
      .map((t) => ({
        id: t.task_id,
        task: t.task_name,
        course: t.course_code || t.course_name || '—',
        date: t.deadline.slice(0, 10),
        priority: t.priority,
      }));
  }, [tasks]);

  const todayTasks = useMemo(() => {
    const today = new Date();
    const dueToday = tasks.filter((t) => t.deadline && sameDay(new Date(t.deadline), today));
    if (dueToday.length > 0) {
      const sorted = [...dueToday].sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.task_name.localeCompare(b.task_name);
      });
      return sorted.slice(0, 16).map((t) => ({
        id: t.task_id,
        task: t.task_name,
        completed: t.completed,
      }));
    }
    const incomplete = tasks.filter((t) => !t.completed).slice(0, 8);
    const completedToday = tasks.filter((t) => {
      if (!t.completed || !t.updated_at) {
        return false;
      }
      return sameDay(new Date(t.updated_at), today);
    });
    const seen = new Set(incomplete.map((t) => t.task_id));
    const merged = [
      ...incomplete.map((t) => ({
        id: t.task_id,
        task: t.task_name,
        completed: false,
      })),
      ...completedToday
        .filter((t) => !seen.has(t.task_id))
        .map((t) => ({
          id: t.task_id,
          task: t.task_name,
          completed: true,
        })),
    ];
    return merged.slice(0, 16);
  }, [tasks]);

  const minutesStudiedWeek = useMemo(() => {
    return focusSessions
      .filter((s) => s.completed && s.actual_minutes != null)
      .reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
  }, [focusSessions]);

  const hoursStudiedWeek = minutesStudiedWeek / 60;
  const weekProgress = weeklyGoalHours > 0 ? Math.min(1, hoursStudiedWeek / weeklyGoalHours) : 0;

  const toggleTask = async (id) => {
    const t = tasks.find((x) => x.task_id === id);
    if (!t) {
      return;
    }
    try {
      const updated = await api(`/tasks/${id}`, {
        method: 'PATCH',
        body: { completed: !t.completed },
      });
      setTasks((prev) => prev.map((x) => (x.task_id === id ? { ...x, ...updated } : x)));
    } catch {
      /* ignore */
    }
  };

  const completedCount = todayTasks.filter((t) => {
    const full = tasks.find((x) => x.task_id === t.id);
    return full?.completed;
  }).length;
  const totalCount = todayTasks.length || 1;
  const progress = (completedCount / totalCount) * 100;

  const now = new Date();
  const calMonth = now.getMonth();
  const calYear = now.getFullYear();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  const deadlineDays = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.deadline && !t.completed) {
        const d = new Date(t.deadline);
        if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
          set.add(d.getDate());
        }
      }
    });
    return set;
  }, [tasks, calMonth, calYear]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  if (loading) {
    return (
      <div className="relative p-8 text-gray-600">
        <div className="absolute top-8 right-8 z-10">
          <LanguageSwitcher className="rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-2" />
        </div>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your studies today</p>
        </div>
        <LanguageSwitcher className="shrink-0 rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-2 self-end sm:self-start" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming deadlines. Add tasks with due dates.</p>
            ) : (
              upcomingDeadlines.map((item) => {
                const d = daysUntil(item.date);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.task}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{item.course}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {d === null ? '—' : d === 0 ? 'Due today' : `${d} day${d === 1 ? '' : 's'} left`}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Study Progress</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - weekProgress)}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#9333ea" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(weekProgress * 100)}%</div>
                    <div className="text-xs text-gray-500">
                      {hoursStudiedWeek.toFixed(1)}/{weeklyGoalHours} hrs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/tasks')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Quick Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Today&apos;s study tasks</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tasks due today stay listed when checked; otherwise open tasks plus anything you finished today.
          </p>
          {todayTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No open tasks. You&apos;re all caught up.</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const full = tasks.find((x) => x.task_id === task.id);
                const checked = full?.completed ?? false;
                return (
                  <label
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className={`flex-1 ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.task}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">
                {completedCount}/{todayTasks.length || 0} completed
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {monthNames[calMonth]} {calYear}
          </h2>
          <div className="grid grid-cols-7 gap-2 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-xs font-medium text-gray-500 pb-2">
                {day}
              </div>
            ))}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const isToday = sameDay(new Date(calYear, calMonth, day), new Date());
              const hasEvent = deadlineDays.has(day);
              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center text-sm rounded-lg ${
                    isToday
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold'
                      : hasEvent
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
