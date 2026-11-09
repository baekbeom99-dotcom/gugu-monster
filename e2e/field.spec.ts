import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ viewport: { width: 375, height: 812 } });

async function pos(page: Page) {
  const [x, y] = ((await page.getByTestId('field-canvas').getAttribute('data-pos')) ?? '0,0').split(',').map(Number);
  return { x, y };
}

test('패드 오른쪽을 누르면 걷고, 떼면 멈춘다', async ({ page }) => {
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const box = (await page.getByLabel('십자 패드').boundingBox())!;
  const before = await pos(page);
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  expect((await pos(page)).x).toBeGreaterThan(before.x);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(400);
  expect(await pos(page)).toEqual(stopped);
});

test('눌린 채 pointercancel이 오면 걸음이 멈춘다', async ({ page }) => {
  await page.goto('/#/field');
  const pad = page.getByLabel('십자 패드');
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await pad.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(500);
  expect(await pos(page)).toEqual(stopped);
  await page.mouse.up();
});

test('걸은 뒤 새로고침해도 같은 자리', async ({ page }) => {
  await page.goto('/#/field');
  const box = (await page.getByLabel('십자 패드').boundingBox())!;
  const before = await pos(page);
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await pos(page);
  expect(after.x).toBeGreaterThan(before.x);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', `${after.x},${after.y}`);
});

test('표지판 앞에서 A를 누르면 글이 보이고, B로 닫는다', async ({ page }) => {
  await page.goto('/#/field');
  // 표지판(9,5) 바로 아래 (9,6)에 위쪽을 보고 서 있는 저장본을 만든다
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { position: { map: 'meadow', x: 9, y: 6, facing: 'up' } } } }),
    );
  });
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,6');
  await page.getByLabel('A 버튼').click();
  await expect(page.getByRole('dialog', { name: '표지판' })).toContainText('← 물가 · 사막 →');
  await page.getByLabel('B 버튼').click();
  await expect(page.getByRole('dialog', { name: '표지판' })).toHaveCount(0);
});

test('메뉴의 처음 화면으로 돌아간다', async ({ page }) => {
  await page.goto('/#/field');
  await page.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('button', { name: '처음 화면' }).click();
  await expect(page).toHaveURL(/#\/$/);
});
