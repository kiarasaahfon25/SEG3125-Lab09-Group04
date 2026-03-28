import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import StudyTimerPage from './pages/StudyTimerPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';

function RequireAuthLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <Layout />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/app',
    Component: RequireAuthLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'tasks', Component: TasksPage },
      { path: 'calendar', Component: CalendarPage },
      { path: 'timer', Component: StudyTimerPage },
      { path: 'progress', Component: ProgressPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
