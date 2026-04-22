import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../pages/UsersPage';
import { AssetsPage } from '../pages/AssetsPage';
import { LogsPage } from '../pages/LogsPage';
import { HealthPage } from '../pages/HealthPage';
import { OperationsPage } from '../pages/OperationsPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ADMIN_CRITICAL_ROUTES } from './routeMatrix';

export type AdminChildRoute = {
  path?: string;
  index?: boolean;
  element: ReactElement;
};

export const adminChildRoutes: AdminChildRoute[] = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: ADMIN_CRITICAL_ROUTES[0], element: <DashboardPage /> },
  { path: ADMIN_CRITICAL_ROUTES[1], element: <UsersPage /> },
  { path: ADMIN_CRITICAL_ROUTES[2], element: <AssetsPage /> },
  { path: ADMIN_CRITICAL_ROUTES[3], element: <LogsPage /> },
  { path: ADMIN_CRITICAL_ROUTES[4], element: <HealthPage /> },
  {
    path: ADMIN_CRITICAL_ROUTES[5],
    element: (
      <ProtectedRoute requiredRoles={['super_admin', 'ops_admin']}>
        <OperationsPage />
      </ProtectedRoute>
    ),
  },
];
