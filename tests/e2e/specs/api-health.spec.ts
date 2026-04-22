import { test, expect } from '@playwright/test';

test('api health and readiness are reachable', async ({ request }) => {
  const health = await request.get('/api/v1/health');
  expect(health.ok()).toBeTruthy();
  const healthJson = await health.json();
  expect(healthJson.status).toBe('active');

  const readiness = await request.get('/api/v1/health/readiness');
  expect(readiness.ok()).toBeTruthy();
  const readinessJson = await readiness.json();
  expect(typeof readinessJson.ready).toBe('boolean');
});
