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
    const token = localStorage.getItem('admin_access_token');
    const role = localStorage.getItem('admin_role') as AdminRole | null;
    const username = localStorage.getItem('admin_username');
    if (token && role && username) {
      setState({
        isAuthenticated: true,
        role,
        username,
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      const backendRole = payload?.user?.role;
      const mappedRole: AdminRole = backendRole === 'admin' ? 'super_admin' : 'viewer';
      const username = payload?.user?.email ?? email;
      const accessToken = payload?.token?.access_token;
      const refreshToken = payload?.token?.refresh_token;
      if (typeof accessToken !== 'string' || accessToken.length === 0) {
        return false;
      }

      localStorage.setItem('admin_access_token', accessToken);
      if (typeof refreshToken === 'string' && refreshToken.length > 0) {
        localStorage.setItem('admin_refresh_token', refreshToken);
      } else {
        localStorage.removeItem('admin_refresh_token');
      }
      localStorage.setItem('admin_role', mappedRole);
      localStorage.setItem('admin_username', username);

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
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_username');
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
