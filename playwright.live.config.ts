import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['research-study.spec.ts', 'control-tower.spec.ts', 'document-lab.spec.ts', 'v4-workspace.spec.ts', 'v5-reader.spec.ts', 'v6-operator-desk.spec.ts', 'v7-cinematic.spec.ts', 'v8-experience.spec.ts', 'v9-quiet-workspace.spec.ts'],
  timeout: 90_000,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: 'https://mikelninh.github.io',
    headless: true,
    trace: 'retain-on-failure',
  },
})
