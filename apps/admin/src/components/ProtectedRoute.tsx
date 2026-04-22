import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type AdminRole } from './AuthProvider';
import { canAccessRoute } from '../utils/routeAccess';

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

  if (!canAccessRoute(isAuthenticated, role, requiredRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
