import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type AdminRole } from './AuthProvider';

export function ProtectedRoute({
  children,
  requiredRoles,
}: {
  children: ReactElement;
  requiredRoles?: AdminRole[];
}) {
  const {
    state: { isAuthenticated, role },
  } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
