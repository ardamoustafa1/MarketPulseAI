import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../pages/UsersPage';
import { AssetsPage } from '../pages/AssetsPage';
import { LogsPage } from '../pages/LogsPage';
import { HealthPage } from '../pages/HealthPage';
import { OperationsPage } from '../pages/OperationsPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export type AdminChildRoute = {
  path?: string;
  index?: boolean;
  element: ReactElement;
};

export const adminChildRoutes: AdminChildRoute[] = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: 'dashboard', element: <DashboardPage /> },
  { path: 'users', element: <UsersPage /> },
  { path: 'assets', element: <AssetsPage /> },
  { path: 'logs', element: <LogsPage /> },
  { path: 'health', element: <HealthPage /> },
  {
    path: 'operations',
    element: (
      <ProtectedRoute requiredRoles={['super_admin', 'ops_admin']}>
        <OperationsPage />
      </ProtectedRoute>
    ),
  },
];
