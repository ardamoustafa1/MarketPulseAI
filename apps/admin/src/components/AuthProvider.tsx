import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AdminRole = 'super_admin' | 'ops_admin' | 'viewer';

type AuthState = {
  isAuthenticated: boolean;
  role: AdminRole | null;
  username: string | null;
};

type AuthContextType = {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getCsrfHeaders(): Record<string, string> {
  const csrf = sessionStorage.getItem('admin_csrf_token');
  return csrf ? { 'x-csrf-token': csrf } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiBaseUrl =
    import.meta.env.VITE_API_URL ??
    (typeof window !== 'undefined' && window.location?.hostname
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : 'http://localhost:8000');
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    username: null,
  });

  useEffect(() => {
    let cancelled = false;
    const bootstrapFromServer = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
          method: 'GET',
          credentials: 'include',
          headers: getCsrfHeaders(),
        });
        if (!response.ok) {
          throw new Error('not authenticated');
        }
        const payload = await response.json();
        const backendRole = String(payload?.role ?? '').toLowerCase();
        const mappedRole: AdminRole =
          backendRole === 'super_admin' || backendRole === 'admin'
            ? 'super_admin'
            : backendRole === 'ops_admin'
              ? 'ops_admin'
              : 'viewer';
        const username = String(payload?.email ?? '');
        if (!username) {
          throw new Error('missing user email');
        }
        localStorage.setItem('admin_role', mappedRole);
        localStorage.setItem('admin_username', username);
        if (!cancelled) {
          setState({
            isAuthenticated: true,
            role: mappedRole,
            username,
          });
        }
      } catch {
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_username');
        if (!cancelled) {
          setState({
            isAuthenticated: false,
            role: null,
            username: null,
          });
        }
      }
    };
    void bootstrapFromServer();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      const backendRole = String(payload?.user?.role ?? '').toLowerCase();
      const mappedRole: AdminRole =
        backendRole === 'super_admin' || backendRole === 'admin'
          ? 'super_admin'
          : backendRole === 'ops_admin'
            ? 'ops_admin'
            : 'viewer';
      const username = payload?.user?.email ?? email;
      localStorage.setItem('admin_role', mappedRole);
      localStorage.setItem('admin_username', username);
      const csrf = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('mp_csrf_token='))
        ?.split('=')[1];
      if (csrf) {
        sessionStorage.setItem('admin_csrf_token', decodeURIComponent(csrf));
      }

      setState({
        isAuthenticated: true,
        role: mappedRole,
        username,
      });
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    void fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getCsrfHeaders(),
      body: JSON.stringify({}),
    }).catch(() => undefined);
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_username');
    sessionStorage.removeItem('admin_csrf_token');
    setState({
      isAuthenticated: false,
      role: null,
      username: null,
    });
  };

  const value = useMemo(
    () => ({
      state,
      login,
      logout,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export type { AdminRole };
