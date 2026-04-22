import type { AdminRole } from '../components/AuthProvider';

export function canAccessRoute(
  isAuthenticated: boolean,
  role: AdminRole | null,
  requiredRoles?: AdminRole[]
): boolean {
  if (!isAuthenticated) return false;
  if (requiredRoles && (!role || !requiredRoles.includes(role))) return false;
  return true;
}
