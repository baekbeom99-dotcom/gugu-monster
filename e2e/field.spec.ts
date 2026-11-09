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
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const box = (await pad.boundingBox())!;
  const before = await pos(page);
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  expect((await pos(page)).x).toBeLessThan(before.x); // 취소 전에 실제로 걸었다
  await pad.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(500);
  expect(await pos(page)).toEqual(stopped);
  await page.mouse.up();
});

test('패드 밖으로 끌고 가서 떼도 걸음이 멈춘다', async ({ page }) => {
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const box = (await page.getByLabel('십자 패드').boundingBox())!;
  const before = await pos(page);
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  expect((await pos(page)).x).toBeGreaterThan(before.x);
  await page.mouse.move(box.x + box.width / 2, 60); // 패드 밖(화면 위쪽)으로
  await page.mouse.up();
  await page.waitForTimeout(400);
  const stopped = await pos(page);
  await page.waitForTimeout(500);
  expect(await pos(page)).toEqual(stopped);
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

// ── 야생 전투 ──

/** 풀숲(6,8) 바로 왼쪽 (5,8)에 오른쪽을 보고 선 저장본 + 만남 100% 스위치 */
async function standBesideGrass(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_FIELD__: boolean }).__GUGU_E2E_FIELD__ = true;
  });
  await page.goto('/#/field');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { position: { map: 'meadow', x: 5, y: 8, facing: 'right' } } } }),
    );
  });
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '5,8');
}

async function stepIntoGrass(page: Page) {
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await expect(page).toHaveURL(/#\/field\/battle$/);
}

/** 말풍선의 문제를 읽어 답을 계산한다 */
async function solveWild(page: Page): Promise<number> {
  const q = page.locator('.wild__bubble .question');
  await expect(q).toBeVisible();
  const parts = (await q.locator('> *').allTextContents()).map((t) => t.trim());
  const [a, , b, , r] = parts;
  if (r === '?') return Number(a) * Number(b);
  if (a === '?') return Number(r) / Number(b);
  return Number(r) / Number(a);
}

function moveButton(page: Page, answer: number) {
  return page.locator('.wild-move').filter({ has: page.locator(`.wild-move__num:text-is("${answer}")`) });
}

async function totalAttempts(page: Page): Promise<number> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save') ?? '{}').state?.learning?.totalAttempts ?? 0);
}

test('풀숲에서 만나 정답으로 HP를 0으로 만들면 캡슐 던지기 버튼이 나온다', async ({ page }) => {
  await standBesideGrass(page);
  await stepIntoGrass(page);
  await expect(page.getByText(/나타났다/)).toBeVisible();
  for (let i = 0; i < 3; i++) {
    if (await page.getByRole('button', { name: '캡슐 던지기' }).isVisible()) break;
    const answer = await solveWild(page);
    const buttons = page.locator('.wild-move');
    await expect(buttons).toHaveCount(3);
    await expect(moveButton(page, answer)).toHaveCount(1);
    await moveButton(page, answer).click();
    await page.waitForTimeout(800);
  }
  await expect(page.getByRole('button', { name: '캡슐 던지기' })).toBeVisible();
  await expect(page.getByLabel('야생 체력 0')).toBeVisible();
});

test('전투 중 답 하나 뒤 새로고침하면 필드로 돌아오고 답은 기록돼 있다', async ({ page }) => {
  await standBesideGrass(page);
  const before = await totalAttempts(page);
  await stepIntoGrass(page);
  const answer = await solveWild(page);
  await moveButton(page, answer).click();
  await page.reload();
  await expect(page).toHaveURL(/#\/field$/);
  expect(await totalAttempts(page)).toBe(before + 1);
});

test('정답 버튼을 빠르게 두 번 눌러도 한 번만 기록된다', async ({ page }) => {
  await standBesideGrass(page);
  const before = await totalAttempts(page);
  await stepIntoGrass(page);
  const answer = await solveWild(page);
  await moveButton(page, answer).dblclick();
  await page.waitForTimeout(300);
  expect(await totalAttempts(page)).toBe(before + 1);
});

test('도망치기로 끝내고 돌아오면 바로 다음 풀숲 걸음에는 만나지 않는다', async ({ page }) => {
  await standBesideGrass(page);
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '도망치기' }).click();
  await page.getByRole('dialog', { name: '도망치기' }).getByRole('button', { name: '도망갈래' }).click();
  await expect(page.getByText('무사히 도망쳤다!')).toBeVisible();
  await expect(page).toHaveURL(/#\/field$/);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '6,8');
  // 풀숲 (7,8)으로 한 걸음: 안전 걸음이라 만나지 않는다
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '7,8');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/#\/field$/);
});
