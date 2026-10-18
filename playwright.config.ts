import { defineConfig, devices } from '@playwright/test';

/** E2E — 설계서 12-3. 이 PC에 설치된 Microsoft Edge를 휴대폰 크기로 띄워 실행한다. */
// 5173을 다른 앱이 쓰고 있으면 E2E_PORT로 바꾼다 (같은 포트의 서버를 그대로 재사용하므로)
declare const process: { env: Record<string, string | undefined> };
const PORT = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 8_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Pixel 5'],
    channel: 'msedge',
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
