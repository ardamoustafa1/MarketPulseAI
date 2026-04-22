import type { NavItem } from '../types/admin';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/assets', label: 'Assets' },
  { to: '/logs', label: 'Logs' },
  { to: '/health', label: 'Health & Status' },
  { to: '/operations', label: 'Operations', requiredRoles: ['super_admin', 'ops_admin'] },
];
