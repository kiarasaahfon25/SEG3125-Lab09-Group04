import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSettings(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      setSettings(data.settings);
    } catch {
      setToken(null);
      setUser(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    await refreshMe();
    return data.user;
  }, [refreshMe]);

  const register = useCallback(async (full_name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { full_name, email, password } });
    setToken(data.token);
    setUser(data.user);
    await refreshMe();
    return data.user;
  }, [refreshMe]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSettings(null);
  }, []);

  const updateLocalUser = useCallback((partial) => {
    setUser((u) => (u ? { ...u, ...partial } : u));
  }, []);

  const updateLocalSettings = useCallback((partial) => {
    setSettings((s) => (s ? { ...s, ...partial } : s));
  }, []);

  const value = useMemo(
    () => ({
      user,
      settings,
      loading,
      login,
      register,
      logout,
      refreshMe,
      updateLocalUser,
      updateLocalSettings,
    }),
    [user, settings, loading, login, register, logout, refreshMe, updateLocalUser, updateLocalSettings]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
