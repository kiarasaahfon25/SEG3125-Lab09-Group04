import { useState, useEffect } from 'react';
import { User, Target, Bell, Moon, Sun, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user, settings, refreshMe, updateLocalUser, updateLocalSettings } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [studyGoal, setStudyGoal] = useState(10);
  const [notifications, setNotifications] = useState({
    deadlineReminders: true,
    dailySummary: true,
    studyReminders: true,
  });
  const [theme, setTheme] = useState('light');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({ name: user.full_name || '', email: user.email || '' });
    }
    if (settings) {
      setStudyGoal(settings.weekly_study_goal_hours ?? 10);
      setTheme(settings.theme || 'light');
      setNotifications({
        deadlineReminders: settings.deadline_reminders !== false,
        dailySummary: settings.daily_summary_reminders !== false,
        studyReminders: settings.study_reminders !== false,
      });
    }
  }, [user, settings]);

  const handleSave = async () => {
    setError('');
    setSaved(false);
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: { full_name: profile.name.trim(), email: profile.email.trim() },
      });
      await api('/settings', {
        method: 'PUT',
        body: {
          theme,
          weekly_study_goal_hours: studyGoal,
          study_reminders: notifications.studyReminders,
          daily_summary_reminders: notifications.dailySummary,
          deadline_reminders: notifications.deadlineReminders,
        },
      });
      updateLocalUser({ full_name: profile.name.trim(), email: profile.email.trim() });
      updateLocalSettings({
        theme,
        weekly_study_goal_hours: studyGoal,
        study_reminders: notifications.studyReminders,
        daily_summary_reminders: notifications.dailySummary,
        deadline_reminders: notifications.deadlineReminders,
      });
      await refreshMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Save failed');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your profile and preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Profile information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Study goal settings</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weekly study hours goal</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="50"
                value={studyGoal}
                onChange={(e) => setStudyGoal(Number(e.target.value))}
                className="flex-1"
              />
              <div className="w-20 px-4 py-2 bg-gray-100 rounded-lg text-center font-medium text-gray-900">
                {studyGoal}h
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Set a realistic weekly study goal to stay motivated</p>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Recommended:</span> 20–30 hours per week for full-time students
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Notification settings</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'deadlineReminders',
                title: 'Deadline reminders',
                desc: 'Get notified about upcoming deadlines',
              },
              {
                key: 'dailySummary',
                title: 'Daily summary',
                desc: 'Receive a summary of your daily progress',
              },
              {
                key: 'studyReminders',
                title: 'Study reminders',
                desc: 'Get reminded to start your study sessions',
              },
            ].map(({ key, title, desc }) => (
              <label
                key={key}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{title}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gray-100 p-2 rounded-lg">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-gray-700" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                theme === 'light' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Sun className="w-6 h-6 text-gray-700" />
                <span className="font-medium text-gray-900">Light mode</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                theme === 'dark' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Moon className="w-6 h-6 text-gray-700" />
                <span className="font-medium text-gray-900">Dark mode</span>
              </div>
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Theme preference is saved to your account (full dark UI styling can be added later).
          </p>
        </div>

        <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          {saved && <p className="text-green-600 font-medium">Settings saved successfully.</p>}
          <button
            type="button"
            onClick={handleSave}
            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
          >
            <Save className="w-5 h-5" />
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
