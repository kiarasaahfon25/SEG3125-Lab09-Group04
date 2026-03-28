import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

export default function StudyTimerPage() {
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const focusStartRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const FOCUS_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const list = await api(`/focus-sessions?from=${today}&to=${today}`);
        if (!cancelled) {
          const n = list.filter((s) => s.completed).length;
          setSessionsCompleted(Math.min(n, 8));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          const currentMode = modeRef.current;
          if (currentMode === 'focus') {
            const end = new Date();
            const start = focusStartRef.current || new Date(end.getTime() - FOCUS_TIME * 1000);
            focusStartRef.current = null;
            (async () => {
              try {
                const today = new Date().toISOString().slice(0, 10);
                await api('/focus-sessions', {
                  method: 'POST',
                  body: {
                    duration_minutes: 25,
                    actual_minutes: 25,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    completed: true,
                    session_date: today,
                  },
                });
                setSessionsCompleted((c) => Math.min(c + 1, 99));
              } catch {
                /* still switch to break */
              }
            })();
            setMode('break');
            return BREAK_TIME;
          }
          setMode('focus');
          return FOCUS_TIME;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (mode === 'focus' && !focusStartRef.current) {
      focusStartRef.current = new Date();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    focusStartRef.current = null;
    setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    focusStartRef.current = null;
    setTimeLeft(newMode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  };

  const totalTime = mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Timer</h1>
        <p className="text-gray-600">Use the Pomodoro technique to stay focused</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => switchMode('focus')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
                mode === 'focus'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              25 min Focus
            </button>
            <button
              type="button"
              onClick={() => switchMode('break')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
                mode === 'break'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              5 min Break
            </button>
          </div>

          <div className="flex justify-center mb-8">
            <div className="relative w-80 h-80">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="160" cy="160" r="120" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                <circle
                  cx="160"
                  cy="160"
                  r="120"
                  stroke="url(#timerGradient)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-gray-900 mb-2">{formatTime(timeLeft)}</div>
                <div className="text-lg text-gray-600 font-medium">
                  Current session: {mode === 'focus' ? 'Focus' : 'Break'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
              >
                <Play className="w-5 h-5" />
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              <RotateCcw className="w-5 h-5" />
              Reset
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Session progress</span>
              <span className="text-sm font-medium text-gray-900">
                {sessionsCompleted} completed today
              </span>
            </div>
            <div className="flex gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < sessionsCompleted ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Pomodoro tips</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Work for 25 minutes with full focus</li>
              <li>• Take a 5-minute break after each session</li>
              <li>• After 4 sessions, take a longer 15–30 minute break</li>
              <li>• Eliminate distractions during focus time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
