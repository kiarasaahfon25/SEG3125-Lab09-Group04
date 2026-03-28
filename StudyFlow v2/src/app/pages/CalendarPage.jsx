import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';

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

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month, 1).getDay();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function deadlineDayInMonth(deadlineIso, year, monthIndex) {
  if (!deadlineIso) {
    return null;
  }
  const d = new Date(deadlineIso);
  if (d.getFullYear() !== year || d.getMonth() !== monthIndex) {
    return null;
  }
  return d.getDate();
}

export default function CalendarPage() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [sessions, setSessions] = useState([]);
  const [monthTasks, setMonthTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [newEvent, setNewEvent] = useState({
    eventKind: 'session',
    title: '',
    type: 'study',
    course_id: '',
    new_course_name: '',
    notes: '',
    priority: 'Medium',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const y = currentYear;
      const m = currentMonth + 1;
      const [s, c, allTasks] = await Promise.all([
        api(`/study-sessions?year=${y}&month=${m}`),
        api('/courses'),
        api('/tasks'),
      ]);
      setSessions(s);
      setCourses(c);
      const inMonth = allTasks.filter((t) => {
        const day = deadlineDayInMonth(t.deadline, currentYear, currentMonth);
        return day != null && !t.completed;
      });
      setMonthTasks(inMonth);
    } catch {
      setSessions([]);
      setMonthTasks([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const itemsByDay = useMemo(() => {
    const map = new Map();
    const push = (day, item) => {
      if (!map.has(day)) {
        map.set(day, []);
      }
      map.get(day).push(item);
    };
    sessions.forEach((ev) => {
      const day = parseInt(ev.session_date.slice(8, 10), 10);
      push(day, { kind: 'session', ...ev });
    });
    monthTasks.forEach((t) => {
      const day = deadlineDayInMonth(t.deadline, currentYear, currentMonth);
      if (day != null) {
        push(day, { kind: 'task', ...t });
      }
    });
    return map;
  }, [sessions, monthTasks, currentMonth, currentYear]);

  const getItemsForDate = (day) => itemsByDay.get(day) || [];

  const defaultFormDate = () => {
    const d = new Date();
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return `${currentYear}-${pad(currentMonth + 1)}-${pad(d.getDate())}`;
    }
    return `${currentYear}-${pad(currentMonth + 1)}-01`;
  };

  const openModalForDay = (day) => {
    setFormDate(`${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`);
    setNewEvent({
      eventKind: 'session',
      title: '',
      type: 'study',
      course_id: '',
      new_course_name: '',
      notes: '',
      priority: 'Medium',
    });
    setShowModal(true);
  };

  const openModalAdd = () => {
    setFormDate(defaultFormDate());
    setNewEvent({
      eventKind: 'session',
      title: '',
      type: 'study',
      course_id: '',
      new_course_name: '',
      notes: '',
      priority: 'Medium',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const resolveCourseId = async () => {
    if (newEvent.course_id) {
      return newEvent.course_id;
    }
    const name = newEvent.new_course_name.trim();
    if (!name) {
      return null;
    }
    const created = await api('/courses', {
      method: 'POST',
      body: { course_name: name, course_code: '' },
    });
    setCourses((prev) => [created, ...prev]);
    return created.course_id;
  };

  const deadlineIsoFromFormDate = (dateStr) => {
    const [y, mo, da] = dateStr.split('-').map((x) => parseInt(x, 10));
    if (!y || !mo || !da) {
      return null;
    }
    const d = new Date(y, mo - 1, da, 23, 59, 59);
    return d.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDate) {
      alert('Pick a date');
      return;
    }
    try {
      if (newEvent.eventKind === 'task') {
        const course_id = await resolveCourseId();
        await api('/tasks', {
          method: 'POST',
          body: {
            task_name: newEvent.title.trim(),
            course_id: course_id || undefined,
            deadline: deadlineIsoFromFormDate(formDate),
            priority: newEvent.priority,
            notes: newEvent.notes,
          },
        });
      } else {
        const session_type = newEvent.type === 'study' ? 'Study Session' : 'Assignment';
        await api('/study-sessions', {
          method: 'POST',
          body: {
            session_title: newEvent.title.trim(),
            session_type,
            session_date: formDate,
            course_id: newEvent.type === 'assignment' && newEvent.course_id ? newEvent.course_id : undefined,
            notes: newEvent.notes,
          },
        });
      }
      closeModal();
      await loadData();
    } catch (err) {
      alert(err.message || 'Could not save');
    }
  };

  const isToday = (day) => {
    const d = new Date();
    return day === d.getDate() && currentMonth === d.getMonth() && currentYear === d.getFullYear();
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
          <p className="text-gray-600">Tasks, assignments, and study sessions</p>
        </div>
        <button
          type="button"
          onClick={openModalAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add to calendar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dayItems = getItemsForDate(day);
              const today = isToday(day);
              return (
                <div
                  key={day}
                  role="button"
                  tabIndex={0}
                  onClick={() => openModalForDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      openModalForDay(day);
                    }
                  }}
                  className={`aspect-square p-2 border border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-300 hover:shadow-sm ${
                    today ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300' : 'bg-white'
                  }`}
                >
                  <div className={`font-semibold mb-1 ${today ? 'text-blue-600' : 'text-gray-900'}`}>{day}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 2).map((item) => {
                      if (item.kind === 'task') {
                        return (
                          <div
                            key={`t-${item.task_id}`}
                            className="text-xs px-2 py-1 rounded truncate bg-emerald-100 text-emerald-800 border border-emerald-200"
                          >
                            {item.task_name}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={item.session_id}
                          className={`text-xs px-2 py-1 rounded truncate ${
                            item.session_type === 'Assignment'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.session_title}
                        </div>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <div className="text-xs text-gray-500 px-2">+{dayItems.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200" />
            <span className="text-sm text-gray-700">Task deadline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
            <span className="text-sm text-gray-700">Calendar assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200" />
            <span className="text-sm text-gray-700">Study session</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add to calendar</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What to add</label>
                <select
                  value={newEvent.eventKind}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      eventKind: e.target.value,
                      course_id: '',
                      new_course_name: '',
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="session">Study session or calendar assignment</option>
                  <option value="task">Task (shows on calendar by deadline)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {newEvent.eventKind === 'task' ? 'Task name' : 'Title'}
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder={newEvent.eventKind === 'task' ? 'e.g., Problem set 4' : 'e.g., Study session — Calculus'}
                  required
                />
              </div>

              {newEvent.eventKind === 'session' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="study">Study Session</option>
                    <option value="assignment">Assignment (calendar)</option>
                  </select>
                </div>
              )}

              {newEvent.eventKind === 'task' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course (existing)</label>
                    <select
                      value={newEvent.course_id}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, course_id: e.target.value, new_course_name: '' })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">None / new below</option>
                      {courses.map((c) => (
                        <option key={c.course_id} value={c.course_id}>
                          {c.course_code ? `${c.course_code} — ` : ''}
                          {c.course_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Or new course name</label>
                    <input
                      type="text"
                      value={newEvent.new_course_name}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, new_course_name: e.target.value, course_id: '' })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g., CS 101"
                      disabled={Boolean(newEvent.course_id)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newEvent.priority}
                      onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </>
              )}

              {newEvent.eventKind === 'session' && newEvent.type === 'assignment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <select
                    value={newEvent.course_id}
                    onChange={(e) => setNewEvent({ ...newEvent, course_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select course (optional)</option>
                    {courses.map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_code ? `${c.course_code} — ` : ''}
                        {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                >
                  {newEvent.eventKind === 'task' ? 'Add task' : 'Add event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
