import { defineConfig, devices } from '@playwright/test';

/** E2E — 설계서 12-3. 이 PC에 설치된 Microsoft Edge를 휴대폰 크기로 띄워 실행한다. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 8_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Pixel 5'],
    channel: 'msedge',
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
