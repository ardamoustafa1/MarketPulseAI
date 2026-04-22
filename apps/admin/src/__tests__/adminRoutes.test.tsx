import { describe, expect, it } from 'vitest';
import { ADMIN_CRITICAL_ROUTES } from '../config/routeMatrix';

describe('admin critical route matrix', () => {
  it('includes core operational pages', () => {
    expect(ADMIN_CRITICAL_ROUTES).toEqual(
      expect.arrayContaining(['dashboard', 'users', 'assets', 'logs', 'health', 'operations'])
    );
  });

  it('keeps operations route in critical set', () => {
    expect(ADMIN_CRITICAL_ROUTES.includes('operations')).toBe(true);
  });
});
