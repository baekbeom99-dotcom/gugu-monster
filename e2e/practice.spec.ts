/** 셈 연습: 탐험 탭 → 받아올림 덧셈 → 오답 힌트 → 끝까지 → 별이 옛 저장본 위에 더해지고 기록 탭에 남는다 */
import { expect, type Page, test } from '@playwright/test';
import { collectErrors, seedHatchedPet } from './helpers';

/** 화면의 셈 문제를 읽어 빈칸 값을 계산한다 */
async function solveArith(page: Page): Promise<number> {
  const parts = (await page.locator('.battle__question .question > *').allTextContents()).map((t) => t.trim());
  const [a, op, b, , r] = parts;
  const add = op === '+';
  if (r === '?') return add ? Number(a) + Number(b) : Number(a) - Number(b);
  if (a === '?') return add ? Number(r) - Number(b) : Number(r) + Number(b);
  return add ? Number(r) - Number(a) : Number(a) - Number(r);
}

async function answerArith(page: Page, correct: boolean): Promise<void> {
  const answer = await solveArith(page);
  const choices = page.locator('.choices .choice');
  if ((await choices.count()) > 0) {
    const texts = (await choices.allTextContents()).map((t) => t.trim());
    const pick = correct ? String(answer) : texts.find((t) => t !== String(answer))!;
    await choices.filter({ hasText: new RegExp(`^${pick}$`) }).first().click();
    return;
  }
  const value = correct ? String(answer) : String(answer + 1);
  for (const digit of value) await page.locator('.keypad .key', { hasText: new RegExp(`^${digit}$`) }).click();
  await page.locator('.keypad .key', { hasText: '확인' }).click();
}

async function playPractice(page: Page, { wrongFirst }: { wrongFirst: boolean }): Promise<void> {
  let first = true;
  for (let i = 0; i < 30 && !(await page.locator('.result').isVisible()); i++) {
    if (await page.locator('.choice--glow').isVisible()) {
      await page.locator('.choice--glow').click();
    } else if (await page.locator('.battle__question').isVisible()) {
      await answerArith(page, !(wrongFirst && first));
      first = false;
    }
    await page.waitForTimeout(1400);
  }
  await expect(page.locator('.result')).toBeVisible();
}

const savedState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!));

test('받아올림 덧셈 연습: 힌트, 결과, 별 유지·적립, 기록', async ({ page }) => {
  const errors = collectErrors(page);
  // 옛 버전(1) 저장본: 별 50개
  await seedHatchedPet(page);
  await expect(page.locator('.topbar, .tabbar').first()).toBeVisible();
  expect((await savedState(page)).state.economy.stars).toBe(50);

  await page.getByRole('link', { name: /탐험/ }).click();
  await expect(page.locator('.practice-button')).toHaveCount(6);
  await page.locator('.practice-button', { hasText: '받아올림 있는 덧셈' }).click();
  await expect(page).toHaveURL(/practice\?kind=addCarry/);

  // 첫 문제를 틀리면 자리별 계산 힌트가 나온다
  await expect(page.locator('.battle__question .question')).toContainText('+');
  await answerArith(page, false);
  await expect(page.locator('.arith-steps')).toBeVisible();
  await expect(page.locator('.arith-steps__step').first()).toContainText('일의 자리');
  await page.locator('.choice--glow').click();
  await page.waitForTimeout(600);

  await playPractice(page, { wrongFirst: false });
  await expect(page.locator('.result__title')).toHaveText('받아올림 있는 덧셈 완료!');
  await expect(page.locator('.result__lines')).toContainText('셈 연습 완료');

  // 별: 50개 위에 정답 9 + 포획 6 + 완료 3 = 18개 더
  const save = await savedState(page);
  expect(save.version).toBe(2);
  expect(save.state.economy.stars).toBe(68);
  expect(save.state.practice.addCarry).toMatchObject({ plays: 1, correct: 9 });
  expect(save.state.practice.addCarry.attempts).toBeGreaterThanOrEqual(10);
  // 구구단 기록은 그대로
  expect(save.state.learning.totalExplorations).toBe(1);

  await page.getByRole('button', { name: '탐험으로' }).click();
  await expect(page.locator('.practice-button', { hasText: '받아올림 있는 덧셈' })).toContainText('초');
  await page.getByRole('link', { name: /기록/ }).click();
  await expect(page.locator('.type-rates--practice')).toContainText('받아올림 있는 덧셈');
  await expect(page.locator('.type-rates--practice')).toContainText('(9/');
  expect(errors).toEqual([]);
});

test('10의 보수 연습: 10칸 틀 힌트', async ({ page }) => {
  await seedHatchedPet(page);
  await page.goto('/#/practice?kind=comp10');
  await expect(page.locator('.battle__question .question')).toContainText('10');
  await answerArith(page, false);
  await expect(page.locator('.frame')).toBeVisible();
  await expect(page.locator('.frame__cell')).toHaveCount(10);
  await page.locator('.choice--glow').click();
  await page.waitForTimeout(600);
  await playPractice(page, { wrongFirst: false });
  await expect(page.locator('.result__title')).toHaveText('10의 보수 완료!');
});
