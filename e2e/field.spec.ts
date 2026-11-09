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

test('패드 오른쪽을 누르면 걷고, 떼면 멈춘다', async ({ page }) => {
  await seedStarter(page);
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
  await seedStarter(page);
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
  await seedStarter(page);
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
  await seedStarter(page);
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
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/); // 지도가 뜬 뒤에 저장본을 바꾼다
  // 표지판(9,5) 바로 아래 (9,6)에 위쪽을 보고 서 있는 저장본을 만든다
  await page.evaluate((starter) => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { ...starter, position: { map: 'meadow', x: 9, y: 6, facing: 'up' } } } }),
    );
  }, STARTER_FIELD);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,6');
  await page.getByLabel('A 버튼').click();
  await expect(page.getByRole('dialog', { name: '표지판' })).toContainText('← 물가 · 사막 →');
  await page.getByLabel('B 버튼').click();
  await expect(page.getByRole('dialog', { name: '표지판' })).toHaveCount(0);
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
