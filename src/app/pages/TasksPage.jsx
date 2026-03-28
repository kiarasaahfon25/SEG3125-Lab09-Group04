import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Calendar, Pencil } from 'lucide-react';
import { api } from '@/lib/api';

function deadlineToDateInput(iso) {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateInputToDeadlineIso(dateStr) {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }
  const [y, m, day] = dateStr.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !day) {
    return null;
  }
  return new Date(y, m - 1, day, 23, 59, 59).toISOString();
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'High':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'Low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', deadline: '' });
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    new_course_name: '',
    deadline: '',
    priority: 'Medium',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([api('/tasks'), api('/courses')]);
      setTasks(t);
      setCourses(c);
    } catch {
      setTasks([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === 'completed') {
        return task.completed;
      }
      if (filter === 'upcoming') {
        return !task.completed;
      }
      return true;
    });
  }, [tasks, filter]);

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

  const resolveCourseId = async () => {
    if (formData.course_id) {
      return formData.course_id;
    }
    const name = formData.new_course_name.trim();
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

  const openEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      name: task.task_name,
      deadline: deadlineToDateInput(task.deadline),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask) {
      return;
    }
    try {
      const body = {
        task_name: editForm.name.trim(),
        deadline: editForm.deadline ? dateInputToDeadlineIso(editForm.deadline) : null,
      };
      const updated = await api(`/tasks/${editingTask.task_id}`, {
        method: 'PATCH',
        body,
      });
      setTasks((prev) => prev.map((x) => (x.task_id === editingTask.task_id ? { ...x, ...updated } : x)));
      setEditingTask(null);
    } catch (err) {
      alert(err.message || 'Could not update task');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const course_id = await resolveCourseId();
      await api('/tasks', {
        method: 'POST',
        body: {
          task_name: formData.name.trim(),
          course_id: course_id || undefined,
          deadline: formData.deadline || undefined,
          priority: formData.priority,
          notes: formData.notes,
        },
      });
      setFormData({
        name: '',
        course_id: '',
        new_course_name: '',
        deadline: '',
        priority: 'Medium',
        notes: '',
      });
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.message || 'Could not save task');
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Loading tasks…</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Manager</h1>
          <p className="text-gray-600">Organize and track your assignments</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        {['all', 'upcoming', 'completed'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All Tasks' : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div
            key={task.task_id}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition hover:shadow-md ${
              task.completed ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.task_id)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {task.task_name}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Course:</span>{' '}
                    {task.course_code || task.course_name || '—'}
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
                {task.notes && <p className="text-sm text-gray-500">{task.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(task)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit task</h2>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, deadline: '' })}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Remove deadline
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Task</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Complete assignment"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course (existing)</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value, new_course_name: '' })}
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
                  value={formData.new_course_name}
                  onChange={(e) => setFormData({ ...formData, new_course_name: e.target.value, course_id: '' })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., CS 101"
                  disabled={Boolean(formData.course_id)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
