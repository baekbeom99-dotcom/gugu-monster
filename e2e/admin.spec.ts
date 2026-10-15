/** 설계서 12-3: 관리자 PIN → 사과 가격 3★→5★ → 상점 반영 → 설정 코드 내보내기 → 초기화한 기기에서 불러오기 */
import { expect, test } from '@playwright/test';
import { collectErrors, enterPin, seedHatchedPet } from './helpers';

test('관리자가 바꾼 상점 설정을 코드로 다른 기기에 옮긴다', async ({ page }) => {
  const errors = collectErrors(page);
  await seedHatchedPet(page);

  // PIN 만들기 → 복구 코드
  await page.getByRole('link', { name: /관리/ }).click();
  await enterPin(page, '1234');
  await enterPin(page, '1234');
  await expect(page.locator('.recovery__code')).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await page.getByRole('button', { name: '적어 두었어요' }).click();

  // 사과 가격 3 → 5
  await page.locator('.admin-menu__item', { hasText: '상점 아이템 관리' }).click();
  await page.locator('.item-row__main', { hasText: '사과' }).click();
  await page.locator('.field', { hasText: /^가격/ }).locator('input').fill('5');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.locator('.item-row', { hasText: '사과' })).toContainText('★ 5');

  // 학생이 보는 상점에 반영
  await page.getByRole('link', { name: /별 상점/ }).click();
  await expect(page.locator('.shop-card', { hasText: '사과' }).locator('.price')).toHaveText('★ 5');

  // 관리 탭을 떠났다 오면 다시 잠겨 있다 → 공유 코드 복사
  await page.getByRole('link', { name: /관리/ }).click();
  await expect(page.getByRole('heading', { name: '어른용 화면이에요' })).toBeVisible();
  await enterPin(page, '1234');
  await page.locator('.admin-menu__item', { hasText: '상점 설정 공유' }).click();
  const code = await page.getByLabel('상점 설정 코드').inputValue();
  expect(code).toMatch(/^GUGU1-/);

  // 전체 초기화 (두 번 확인 + PIN)
  await page.getByRole('button', { name: '관리 메뉴로' }).click();
  await page.locator('.admin-menu__item', { hasText: '데이터 관리' }).click();
  await page.getByRole('button', { name: '전체 초기화…' }).click();
  await page.getByRole('button', { name: '네' }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await enterPin(page, '1234');
  await expect(page).toHaveURL(/#\/welcome/);

  // 새 기기처럼: 펫을 다시 두고, 새 PIN으로 들어가 코드 불러오기
  await seedHatchedPet(page);
  await page.getByRole('link', { name: /별 상점/ }).click();
  await expect(page.locator('.shop-card', { hasText: '사과' }).locator('.price')).toHaveText('★ 3');
  await page.getByRole('link', { name: /관리/ }).click();
  await enterPin(page, '9876');
  await enterPin(page, '9876');
  await page.getByRole('button', { name: '적어 두었어요' }).click();
  await page.locator('.admin-menu__item', { hasText: '상점 설정 공유' }).click();
  await page.getByLabel('불러올 코드').fill(code);
  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.locator('.admin-note')).toContainText('가격 변경 1개');
  await page.getByRole('button', { name: '적용하기' }).click();
  await expect(page.locator('.admin-note')).toContainText('적용했어요');

  await page.getByRole('link', { name: /별 상점/ }).click();
  await expect(page.locator('.shop-card', { hasText: '사과' }).locator('.price')).toHaveText('★ 5');

  expect(errors).toEqual([]);
});

test('PIN을 5번 틀리면 잠긴다', async ({ page }) => {
  await seedHatchedPet(page);
  await page.getByRole('link', { name: /관리/ }).click();
  await enterPin(page, '1111');
  await enterPin(page, '1111');
  await page.getByRole('button', { name: '적어 두었어요' }).click();
  await page.getByRole('button', { name: /잠그기/ }).click();
  for (let i = 0; i < 5; i++) await enterPin(page, '0000');
  await expect(page.locator('.pinpad__error')).toContainText('초 뒤에 다시');
  await expect(page.locator('.pinpad__keys .key').first()).toBeDisabled();
});
