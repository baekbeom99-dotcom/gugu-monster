/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

declare const process: { env: Record<string, string | undefined> };

// GitHub Pages는 https://<계정>.github.io/<저장소>/ 아래에서 열리므로 배포 때 BASE_PATH로 경로를 넘긴다.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // Google 글꼴을 한 번 받으면 오프라인에서도 쓰도록 캐시
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: '구구단 몬스터 탐험대',
        short_name: '구구몬',
        description: '구구단을 풀어 몬스터를 잡고 나만의 펫을 키워요',
        lang: 'ko',
        theme_color: '#ffe14d',
        background_color: '#fff1c9',
        display: 'standalone',
        start_url: base,
        scope: base,
        orientation: 'portrait',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
