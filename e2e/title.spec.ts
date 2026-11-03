import { expect, test } from './fixtures';
import { seedHatchedPet } from './helpers';

test('타이틀에서 퀴즈 모험을 고르면 처음 쓰는 사람은 알 고르기로 간다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '퀴즈 모험' })).toBeVisible();
  await expect(page.getByRole('button', { name: '필드 모험' })).toBeVisible();
  await page.getByRole('button', { name: '퀴즈 모험' }).click();
  await expect(page).toHaveURL(/#\/welcome/);
});

test('알을 고른 사람은 퀴즈 모험에서 나의 펫으로 간다', async ({ page }) => {
  await seedHatchedPet(page);
  await page.goto('/#/');
  await page.getByRole('button', { name: '퀴즈 모험' }).click();
  await expect(page).toHaveURL(/#\/pet/);
});

test('필드 모험 버튼은 #/field로 간다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '필드 모험' }).click();
  await expect(page).toHaveURL(/#\/field/);
});

test('퀴즈 모험 위쪽 [처음 화면]을 누르면 타이틀로 돌아온다', async ({ page }) => {
  await seedHatchedPet(page);
  await page.goto('/#/pet');
  await page.getByRole('button', { name: '처음 화면' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('button', { name: '퀴즈 모험' })).toBeVisible();
});
