/** 나의 펫 서랍의 '별 상점 가기'는 그 종류 탭으로 연다 (v1.30) */
import { collectErrors, seedHatchedPet } from './helpers';
import { expect, test } from './fixtures';

const CASES = [
  { care: '씻기', tab: '위생' },
  { care: '놀기', tab: '장난감' },
  { care: '밥', tab: '먹이' },
  { care: '꾸미기', tab: '모자' },
];

test('씻기·놀기·밥·꾸미기에서 별 상점 가기 → 그 탭', async ({ page }) => {
  const errors = collectErrors(page);
  await seedHatchedPet(page);
  for (const c of CASES) {
    await page.getByRole('link', { name: /나의 펫/ }).click();
    await page.locator('.care', { hasText: c.care }).click();
    await page.getByRole('button', { name: '별 상점 가기' }).click();
    await expect(page).toHaveURL(/#\/shop\?tab=/);
    await expect(page.getByRole('tab', { name: c.tab })).toHaveAttribute('aria-selected', 'true');
  }
  expect(errors).toEqual([]);
});
