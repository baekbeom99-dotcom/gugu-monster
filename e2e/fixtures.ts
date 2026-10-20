/** E2E 공통: 똥·병·식중독 주사위를 꺼서(언제나 '안 일어남') 테스트 결과가 흔들리지 않게 한다. */
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as unknown as { __GUGU_E2E_CALM__: boolean }).__GUGU_E2E_CALM__ = true;
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
