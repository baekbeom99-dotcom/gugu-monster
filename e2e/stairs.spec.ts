/** 설계서 4-5: 무한의 계단 — 맞히면 한 칸, 틀리거나 5초가 지나면 끝, 오른 계단만큼 별·최고 기록 */
import type { Page } from '@playwright/test';
import { collectErrors, seedHatchedPet } from './helpers';
import { expect, test } from './fixtures';

async function answerStairs(page: Page, correct: boolean): Promise<void> {
  const [a, , b] = (await page.locator('.stairs__question .question > *').allTextContents()).map((t) => t.trim());
  const answer = Number(a) * Number(b);
  const choices = page.locator('.choices .choice');
  const texts = (await choices.allTextContents()).map((t) => t.trim());
  const pick = correct ? String(answer) : texts.find((t) => t !== String(answer))!;
  await choices.filter({ hasText: new RegExp(`^${pick}$`) }).first().click();
}

test('무한의 계단: 세 칸 오르고 틀리면 끝, 별 6개(계단 × 2)와 최고 기록', async ({ page }) => {
  const errors = collectErrors(page);
  await seedHatchedPet(page);
  await page.getByRole('link', { name: /탐험/ }).click();
  await page.locator('.explore__main--stairs').click();
  await expect(page).toHaveURL(/#\/stairs/);
  await expect(page.locator('.stairs__pet svg')).toBeVisible();
  await page.getByRole('button', { name: '오르기 시작!' }).click();

  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.stairs__question')).toBeVisible();
    await answerStairs(page, true);
    await expect(page.locator('.stairs__count strong')).toHaveText(String(i + 1));
  }
  await answerStairs(page, false);
  await expect(page.locator('.stairs__reason')).toHaveText('앗, 헛디뎠어요!');
  await expect(page.locator('.stairs__result')).toContainText('3칸 올랐어요');
  await expect(page.locator('.stairs__stars')).toHaveText('+6 ★');
  await expect(page.locator('.banner--master')).toContainText('최고 기록');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state);
  expect(saved.stairs).toMatchObject({ best: 3, plays: 1, totalSteps: 3 });
  expect(saved.economy.stars).toBe(56);

  // 다시 오르면 5초 안에 답하지 않아 떨어진다
  await page.getByRole('button', { name: '다시 오르기' }).click();
  await expect(page.locator('.stairs__question')).toBeVisible();
  await expect(page.locator('.stairs__reason')).toHaveText('⏰ 시간이 다 됐어요!', { timeout: 8000 });
  await expect(page.locator('.stairs__record')).toContainText('최고 기록 3칸');

  await page.getByRole('button', { name: '탐험으로' }).click();
  await expect(page.locator('.explore__main--stairs')).toContainText('최고 3칸');
  expect(errors).toEqual([]);
});
