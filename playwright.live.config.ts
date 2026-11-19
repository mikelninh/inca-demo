import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['research-study.spec.ts', 'control-tower.spec.ts', 'document-lab.spec.ts', 'mission.spec.ts'],
  timeout: 90_000,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: 'https://mikelninh.github.io',
    headless: true,
    trace: 'retain-on-failure',
  },
})
