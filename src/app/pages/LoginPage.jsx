import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, user, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(full_name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">StudyFlow</h1>
          <p className="text-gray-500 mt-2">Your study companion</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Create account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Jane Student"
                required={mode === 'register'}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="your.email@university.edu"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-500 text-sm">
          Run <code className="text-xs bg-gray-100 px-1 rounded">npm run dev</code> for the app and API (MongoDB must be
          running). Copy <code className="text-xs bg-gray-100 px-1 rounded">.env.example</code> to{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">.env</code> to override defaults.
        </p>
      </div>
    </div>
  );
}
