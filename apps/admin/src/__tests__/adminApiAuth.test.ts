import { describe, expect, it, vi, beforeEach } from 'vitest';
import { extractCsrfToken, getApiBaseUrl } from '../api/adminApi';

describe('adminApi auth helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves localhost base url by default', () => {
    const url = getApiBaseUrl();
    expect(url.startsWith('http')).toBe(true);
  });

  it('extracts csrf token from cookie payload', () => {
    const token = extractCsrfToken('foo=1; mp_csrf_token=test-csrf-token; bar=2', null);
    expect(token).toBe('test-csrf-token');
  });
});
