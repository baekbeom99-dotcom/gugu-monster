/** 설계서 12-3: 첫 실행 → 알 선택 → 진단 탐험 → 부화 → 이름 → 돌봄 → 상점 구매·주기, 새로고침 후 유지 */
import { expect, test } from './fixtures';
import { collectErrors, playExploration } from './helpers';

test('처음 시작한 학생이 펫을 부화시키고 돌보고 상점에서 산다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 환영 → 알 고르기
  await expect(page.getByRole('heading', { name: '구구단 몬스터 탐험대' })).toBeVisible();
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.locator('.egg-choice', { hasText: '줄무늬 알' }).click();
  await page.getByRole('button', { name: '이 알로 할래!' }).click();
  await page.getByRole('button', { name: '첫 탐험 떠나기' }).click();

  // 진단 탐험: 첫 문제는 일부러 틀려 힌트 흐름도 지나간다
  await expect(page).toHaveURL(/mode=diagnostic/);
  await playExploration(page, { wrongFirst: true });
  await expect(page.locator('.result__title')).toHaveText('탐험 성공!');
  await expect(page.locator('.result__total')).toContainText('+23');
  await expect(page.locator('.trial-result__label')).toHaveText('풀이에 걸린 시간');

  // 부화 → 이름 짓기 → 시작 선물
  await page.getByRole('button', { name: /알이 흔들려요/ }).click();
  await page.getByRole('button', { name: '이름 지어 주기' }).click({ timeout: 10_000 });
  await page.getByLabel('펫 이름').fill('꼬북');
  await page.getByRole('button', { name: '이 이름으로 할래!' }).click();
  await expect(page.getByRole('heading', { name: '꼬북이 태어났어요!' })).toBeVisible();
  await page.getByRole('button', { name: '펫에게 가기' }).click();

  // 나의 펫: 시작 별 23 + 선물 10
  await expect(page.locator('.pet-name')).toHaveText('꼬북');
  await expect(page.locator('.topbar .stars')).toContainText('33');

  // 무료 밥 주기 (첫 밥 안내)
  await page.locator('.care', { hasText: '밥' }).click();
  await page.locator('.bag-item', { hasText: '기본 사료' }).click();
  await expect(page.locator('.speech--room')).toHaveText('냠냠! 맛있다!');

  // 상점에서 사과 사서 바로 주기
  await page.getByRole('link', { name: /별 상점/ }).click();
  await page.locator('.shop-card', { hasText: '사과' }).click();
  await page.getByRole('button', { name: '살래!' }).click();
  await page.getByRole('button', { name: '바로 주기' }).click();
  await expect(page.locator('.modal__title')).toHaveText('냠냠! 고마워!');
  await page.getByRole('button', { name: '좋아!' }).click();
  // 사과 6★ (v1.20 가격 2배)
  await expect(page.locator('.topbar .stars')).toContainText('27');

  // 새로고침해도 그대로
  await page.reload();
  await expect(page.locator('.topbar .stars')).toContainText('27');
  await page.getByRole('link', { name: /나의 펫/ }).click();
  await expect(page.locator('.pet-name')).toHaveText('꼬북');
  await page.getByRole('link', { name: /기록/ }).click();
  await expect(page.locator('.tile', { hasText: '탐험' })).toContainText('1');
  await expect(page.locator('.album')).toContainText('아기');

  expect(errors).toEqual([]);
});
