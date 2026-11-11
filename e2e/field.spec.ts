import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ viewport: { width: 375, height: 812 } });

/** 첫 구구몬(구름몬)을 이미 고른 저장본 */
const STARTER_FIELD = {
  starterChosen: true,
  companion: 'cloud',
  species: { cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1 } },
  seen: ['cloud'],
};

/** 페이지가 열리기 전에 첫 구구몬을 고른 저장본을 넣는다 (이미 저장이 있으면 그대로) */
async function seedStarter(page: Page) {
  await page.addInitScript((field) => {
    if (!localStorage.getItem('gugu-monster:save')) {
      localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
    }
  }, STARTER_FIELD);
}

async function pos(page: Page) {
  const [x, y] = ((await page.getByTestId('field-canvas').getAttribute('data-pos')) ?? '0,0').split(',').map(Number);
  return { x, y };
}

/** 화면 가운데쯤 (조이스틱을 누를 자리) */
async function center(page: Page) {
  const box = (await page.getByTestId('field-canvas').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('조이스틱을 오른쪽으로 끌면 걷고, 떼면 멈춘다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const c = await center(page);
  const before = await pos(page);
  await expect(page.getByLabel('조이스틱')).toHaveCount(0);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y, { steps: 4 });
  await expect(page.getByLabel('조이스틱')).toBeVisible();
  await page.waitForTimeout(500);
  expect((await pos(page)).x).toBeGreaterThan(before.x);
  await page.mouse.up();
  await expect(page.getByLabel('조이스틱')).toHaveCount(0);
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(400);
  expect(await pos(page)).toEqual(stopped);
});

test('눌린 채 pointercancel이 오면 걸음이 멈춘다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const c = await center(page);
  const before = await pos(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x - 60, c.y, { steps: 4 });
  await page.waitForTimeout(500);
  expect((await pos(page)).x).toBeLessThan(before.x); // 취소 전에 실제로 걸었다
  await page.getByTestId('joystick-layer').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(500);
  expect(await pos(page)).toEqual(stopped);
  await page.mouse.up();
});

test('화면 밖으로 끌고 나가서 떼도 걸음이 멈춘다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const c = await center(page);
  const before = await pos(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y, { steps: 4 });
  await page.waitForTimeout(400);
  expect((await pos(page)).x).toBeGreaterThan(before.x);
  await page.mouse.move(c.x, -50); // 화면 밖(위쪽)으로
  await page.mouse.up();
  await page.waitForTimeout(400);
  const stopped = await pos(page);
  await page.waitForTimeout(500);
  expect(await pos(page)).toEqual(stopped);
});

test('걸은 뒤 새로고침해도 같은 자리', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const c = await center(page);
  const before = await pos(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y, { steps: 4 });
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await pos(page);
  expect(after.x).toBeGreaterThan(before.x);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', `${after.x},${after.y}`);
});

test('표지판에 부딪히면 글이 뜨고, 탭하면 닫히고, 계속 눌러도 다시 안 열린다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/); // 지도가 뜬 뒤에 저장본을 바꾼다
  // 표지판(9,5) 바로 아래 (9,6)에 서 있는 저장본을 만든다
  await page.evaluate((starter) => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { ...starter, position: { map: 'meadow', x: 9, y: 6, facing: 'up' } } } }),
    );
  }, STARTER_FIELD);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,6');
  const dialog = page.getByRole('dialog', { name: '표지판' });
  await page.keyboard.down('ArrowUp');
  await expect(dialog).toContainText('← 물가 · 사막 →');
  await dialog.click();
  await expect(dialog).toHaveCount(0);
  await page.waitForTimeout(300); // 위쪽을 계속 누르고 있어도 다시 안 열린다
  await expect(dialog).toHaveCount(0);
  await page.keyboard.up('ArrowUp');
  expect(await pos(page)).toEqual({ x: 9, y: 6 });
});

test('메뉴의 처음 화면으로 돌아간다', async ({ page }) => {
  await seedStarter(page);
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
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate((starter) => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { ...starter, position: { map: 'meadow', x: 5, y: 8, facing: 'right' } } } }),
    );
  }, STARTER_FIELD);
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

test('길 스위치를 켜면 풀숲 밖 길 한 걸음에도 만나 전투 화면으로 간다', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_PATH__: boolean }).__GUGU_E2E_PATH__ = true;
  });
  await standBesideGrass(page); // (5,8)에서 오른쪽을 봄. 아래 (5,9)는 길 칸
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowDown');
  await expect(page).toHaveURL(/#\/field\/battle$/);
});

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

test('처음 필드는 첫 구구몬 고르기로 가고, 젤리몬을 골라 풀숲에서 잡으면 도감에 색으로 남는다', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_FIELD__: boolean }).__GUGU_E2E_FIELD__ = true;
  });
  await page.goto('/#/field');
  await expect(page).toHaveURL(/#\/field\/starter$/);
  await page.getByRole('button', { name: '젤리몬 고르기' }).click();
  await expect(page).toHaveURL(/#\/field$/);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);

  // 풀숲 바로 옆으로 자리를 옮긴다
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('gugu-monster:save')!);
    raw.state.field.position = { map: 'meadow', x: 5, y: 8, facing: 'right' };
    localStorage.setItem('gugu-monster:save', JSON.stringify(raw));
  });
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '5,8');
  await stepIntoGrass(page);
  const wildName = ((await page.locator('.wild__name').textContent()) ?? '').replace(/\s*Lv\d+\s*$/, '').trim();

  for (let i = 0; i < 3; i++) {
    if (await page.getByRole('button', { name: '캡슐 던지기' }).isVisible()) break;
    const answer = await solveWild(page);
    await moveButton(page, answer).click();
    await page.waitForTimeout(800);
  }
  await page.getByRole('button', { name: '캡슐 던지기' }).click();
  await expect(page.getByText(/잡았다!/)).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });

  await page.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('button', { name: '구구몬 도감' }).click();
  await expect(page).toHaveURL(/#\/field\/dex$/);
  await expect(page.getByLabel(`${wildName} 잡음`)).toBeVisible();
  await expect(page.getByLabel('젤리몬 잡음')).toBeVisible();
  await expect(page.locator('.fdex__cell--caught')).toHaveCount(2);
  await expect(page.locator('.fdex__cell--unknown')).toHaveCount(9);

  // 잡은 구구몬을 동행으로
  await page.getByLabel(`${wildName} 잡음`).click();
  await page.getByRole('button', { name: '함께 다니기' }).click();
  await expect(page.getByLabel(`${wildName} 잡음`).getByText('함께 다니는 중')).toBeVisible();
});

// ── 필드 사이 이동 ──

/** 이미 첫 구구몬을 고른 저장본에서 원하는 필드·자리로 옮겨 서게 한다 */
async function standAt(page: Page, map: string, x: number, y: number, facing: string) {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate(
    ([starter, position]) => {
      localStorage.clear();
      localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field: { ...(starter as object), position } } }));
    },
    [STARTER_FIELD, { map, x, y, facing }] as const,
  );
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', `${x},${y}`);
}

async function tap(page: Page, key: string, ms = 120) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test('초원 왼쪽 출구로 나가면 불러오기 화면 뒤 물가 입구에 서고, 새로고침해도 물가', async ({ page }) => {
  await standAt(page, 'meadow', 1, 10, 'left');
  await tap(page, 'ArrowLeft');
  await expect(page.getByRole('status', { name: '불러오는 중' })).toContainText('물가 · 3·6·9단');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '18,10');
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '18,10');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.position.map);
  expect(saved).toBe('waterside');
});

test('물가 오른쪽 출구로 나가면 초원 왼쪽 입구로 돌아온다', async ({ page }) => {
  await standAt(page, 'waterside', 18, 10, 'right');
  await tap(page, 'ArrowRight');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '1,10');
});

test('초원 오른쪽 출구로 나가면 사막 (5·7단)', async ({ page }) => {
  await standAt(page, 'meadow', 18, 10, 'right');
  await tap(page, 'ArrowRight');
  await expect(page.getByRole('status', { name: '불러오는 중' })).toContainText('사막 · 5·7단');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '1,10');
});

test('물가 풀숲에서 만난 구구몬은 젤리몬·안테나몬·뿔뿔몬 중 하나', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_FIELD__: boolean }).__GUGU_E2E_FIELD__ = true;
  });
  await standAt(page, 'waterside', 4, 9, 'right');
  await tap(page, 'ArrowRight');
  await expect(page).toHaveURL(/#\/field\/battle$/);
  const species = await page.locator('.wild__stage').getAttribute('data-species');
  expect(['jelly', 'antenna', 'horn']).toContain(species);
});

// ── 레전드 전투 ──

/** 12·13단이 열린 저장본으로 풀숲 바로 옆에 서서(만남 100%, 레전드 강제) 한 걸음 */
async function standBesideGrassWith(page: Page, unlocked: boolean) {
  await page.addInitScript(() => {
    const w = window as unknown as { __GUGU_E2E_FIELD__: boolean; __GUGU_E2E_LEGEND__: boolean };
    w.__GUGU_E2E_FIELD__ = true;
    w.__GUGU_E2E_LEGEND__ = true;
  });
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate(
    ([starter, open]) => {
      localStorage.clear();
      const learning = open ? { challengeUnlocked: true, challengeUnlockedBy: 'admin' } : {};
      localStorage.setItem(
        'gugu-monster:save',
        JSON.stringify({
          version: 1,
          state: { field: { ...(starter as object), position: { map: 'meadow', x: 5, y: 8, facing: 'right' } }, learning },
        }),
      );
    },
    [STARTER_FIELD, unlocked] as const,
  );
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '5,8');
}

test('12·13단이 열렸으면 레전드가 나타나 13단 문제를 낸다', async ({ page }) => {
  await standBesideGrassWith(page, true);
  await stepIntoGrass(page);
  await expect(page.getByRole('status').filter({ hasText: /^전설의 .*나타났다!$/ })).toBeVisible();
  await expect(page.locator('.wild__stage')).toHaveAttribute('data-species', /^legend-/);
  await expect(page.locator('.wild__stage')).toHaveClass(/wild__stage--legend/);
  await expect(page.locator('.wild__bubble')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.wild__bubble')).toHaveAttribute('data-fact', /^13x\d+$/);
    const answer = await solveWild(page);
    await moveButton(page, answer).click();
    await page.waitForTimeout(800);
  }
});

test('13단이 잠긴 저장본에서는 레전드 스위치가 있어도 보통 만남', async ({ page }) => {
  await standBesideGrassWith(page, false);
  await stepIntoGrass(page);
  await expect(page.locator('.wild__stage')).not.toHaveAttribute('data-species', /^legend-/);
  await expect(page.getByText(/전설의/)).toHaveCount(0);
});

// ── 성장과 동행 ──

async function companionPos(page: Page) {
  return page.getByTestId('field-canvas').getAttribute('data-companion-pos');
}

test('동행이 주인공이 방금 떠난 칸을 따라온다', async ({ page }) => {
  await standAt(page, 'meadow', 5, 8, 'right');
  await expect.poll(() => companionPos(page)).toBe('4,8'); // 처음에는 바로 뒤 칸
  await tap(page, 'ArrowRight');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '6,8');
  await expect.poll(() => companionPos(page)).toBe('5,8');
  await tap(page, 'ArrowUp', 200);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '6,7');
  await expect.poll(() => companionPos(page)).toBe('6,8');
});

test('전투를 마치면 필드에서 "레벨이 올랐어!" 알림이 뜨고, 도감에 새 레벨이 남는다', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_FIELD__: boolean }).__GUGU_E2E_FIELD__ = true;
  });
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate((starter) => {
    localStorage.clear();
    // 구름몬 Lv5, 다음 레벨까지 5 모자란 상태 (전투 참여 +10이면 Lv6)
    const field = {
      ...starter,
      species: { cloud: { level: 5, exp: 65, stage: 1, caught: 1, firstCaughtAt: 1 } },
      position: { map: 'meadow', x: 5, y: 8, facing: 'right' },
    };
    localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
  }, STARTER_FIELD);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '5,8');
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '도망치기' }).click();
  await page.getByRole('dialog', { name: '도망치기' }).getByRole('button', { name: '도망갈래' }).click();
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });
  const notice = page.getByRole('dialog', { name: '성장 알림' });
  await expect(notice).toContainText('레벨이 올랐어!');
  await expect(notice).toContainText('Lv6');
  await notice.click();
  await expect(notice).toHaveCount(0);

  await page.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('button', { name: '구구몬 도감' }).click();
  await expect(page.getByLabel('새싹몬 잡음')).toContainText('Lv6');
});

// ── 꾸미기 (375px 화면 배치) ──

/** 가장 긴 문제("13 × ? = 130"·"? × 13 = 130")를 강제로 띄운다 */
async function battleWithQuestion(page: Page, factId: string, type: string) {
  await page.addInitScript(
    ([f, t]) => {
      (window as unknown as { __GUGU_E2E_QUESTION__: unknown }).__GUGU_E2E_QUESTION__ = { factId: f, type: t };
    },
    [factId, type] as const,
  );
  await standBesideGrassWith(page, true);
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '싸우자!' }).click();
  await expect(page.locator('.wild__bubble')).toHaveAttribute('data-fact', factId);
}

/** 두 상자가 겹치는지 */
function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const vp of [
  { width: 375, height: 812 },
  { width: 360, height: 800 },
  { width: 320, height: 640 },
]) {
for (const [type, text] of [
  ['missingSecond', '13×?=130'],
  ['missingFirst', '?×10=130'], // 단(13)은 늘 앞자리라 "? × 13"은 나오지 않는다. 글자 수가 같은 가장 긴 꼴
] as const) {
  test(`가장 긴 문제 "${text}"도 ${vp.width}px에서 말풍선이 야생 구구몬과 겹치지 않고 한 줄에 들어간다`, async ({ page }) => {
    await page.setViewportSize(vp);
    await battleWithQuestion(page, '13x10', type);
    const q = page.locator('.wild__bubble .question');
    await expect(q).toHaveText(text.replace(/\s/g, ''), { useInnerText: false });
    const bubble = (await page.locator('.wild__bubble').boundingBox())!;
    const foeSvg = (await page.locator('.wild__foe svg').boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(overlaps({ ...bubble, width: bubble.width + 12 }, foeSvg)).toBe(false); // 꼬리(12px)까지
    expect(bubble.x).toBeGreaterThanOrEqual(0);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(viewport.width);
    // 넘치지 않는다 (글자가 말풍선 밖으로 나가거나 줄이 바뀌지 않음)
    const fits = await q.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().height < 60);
    expect(fits).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`battle-longest-${vp.width}.png`) });
  });
}
}

test('도망 확인창을 열어 둔 시간은 답하는 데 걸린 시간에 들어가지 않는다', async ({ page }) => {
  await battleWithQuestion(page, '13x10', 'missingSecond');
  const answer = await solveWild(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: '계속 싸우기' }).click();
  await moveButton(page, answer).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.learning.facts['13x10']?.avgMs ?? -1))
    .toBeGreaterThanOrEqual(0);
  const ms = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.learning.facts['13x10'].avgMs);
  expect(ms).toBeLessThan(1500);
});
