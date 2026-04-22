import { describe, expect, it } from 'vitest';
import { canAccessRoute } from '../utils/routeAccess';

describe('canAccessRoute', () => {
  it('denies unauthenticated user', () => {
    expect(canAccessRoute(false, null, ['super_admin'])).toBe(false);
  });

  it('denies authenticated user with null role when role is required', () => {
    expect(canAccessRoute(true, null, ['super_admin'])).toBe(false);
  });

  it('denies authenticated user with insufficient role', () => {
    expect(canAccessRoute(true, 'viewer', ['super_admin'])).toBe(false);
  });

  it('allows authenticated user with required role', () => {
    expect(canAccessRoute(true, 'super_admin', ['super_admin'])).toBe(true);
  });
});
