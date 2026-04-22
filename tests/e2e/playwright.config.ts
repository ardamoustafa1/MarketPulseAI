import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'admin-ui',
      use: {
        baseURL: process.env.E2E_ADMIN_BASE_URL || 'http://127.0.0.1:4173',
      },
      testMatch: ['**/admin-*.spec.ts'],
    },
    {
      name: 'api',
      use: {
        baseURL: process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000',
      },
      testMatch: ['**/api-*.spec.ts'],
    },
  ],
});
