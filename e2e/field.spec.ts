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

async function openSignAtNine(page: Page) {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate((starter) => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({ version: 1, state: { field: { ...starter, position: { map: 'meadow', x: 9, y: 6, facing: 'up' } } } }),
    );
  }, STARTER_FIELD);
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,6');
  await page.keyboard.down('ArrowUp');
  await expect(page.getByRole('dialog', { name: '표지판' })).toBeVisible();
  await page.keyboard.up('ArrowUp');
}

test('표지판 글은 Escape로 닫힌다', async ({ page }) => {
  await openSignAtNine(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '표지판' })).toHaveCount(0);
});

test('표지판 글이 열려 있으면 Space로도 닫힌다', async ({ page }) => {
  await openSignAtNine(page);
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog', { name: '표지판' })).toHaveCount(0);
});

test('Tab으로 메뉴 버튼에 포커스를 두고 Enter를 누르면 메뉴가 열린다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '메뉴' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
});

test('글 밖을 250ms쯤 눌렀다 떼도 표지판 글이 닫힌다', async ({ page }) => {
  await openSignAtNine(page);
  await page.mouse.move(100, 200);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: '표지판' })).toHaveCount(0);
});

test('글이 없을 때 Enter는 아무 일도 없다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  const before = await pos(page);
  const prevented = await page.evaluate(
    () =>
      new Promise<boolean[]>((resolve) => {
        const out: boolean[] = [];
        // 화면의 keydown 처리(window, 버블링)가 끝난 뒤 값을 읽는다
        const on = (e: KeyboardEvent) => {
          setTimeout(() => out.push(e.defaultPrevented));
        };
        document.addEventListener('keydown', on);
        for (const code of ['Enter', 'Space', 'Escape']) {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
        }
        setTimeout(() => resolve(out), 50);
      }),
  );
  expect(prevented).toEqual([false, false, false]);
  await page.waitForTimeout(300);
  expect(await pos(page)).toEqual(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('메뉴의 처음 화면으로 돌아간다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await page.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('button', { name: '처음 화면' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

// ── 야생 전투 ──

interface GrassOptions {
  /** 문제 시간이 흐르게 둔다 (기본은 __GUGU_E2E_NO_TIMER__로 멈춤) */
  timer?: boolean;
  /** 구름몬 기록에 덧붙일 값 (예: { hp: 20 }) */
  cloud?: Record<string, unknown>;
  /** 야생 강함 단계 고정 (__GUGU_E2E_TIER__) */
  tier?: string;
  /** 저장본의 캡슐 개수 (없으면 기본 3·3·3·0) */
  capsules?: Record<string, number>;
}

/** 풀숲(6,8) 바로 왼쪽 (5,8)에 오른쪽을 보고 선 저장본 + 만남 100% 스위치 */
async function standBesideGrass(page: Page, opts: GrassOptions = {}) {
  await page.addInitScript(
    ([timer, tier]) => {
      const w = window as unknown as Record<string, unknown>;
      w.__GUGU_E2E_FIELD__ = true;
      if (!timer) w.__GUGU_E2E_NO_TIMER__ = true;
      if (tier) w.__GUGU_E2E_TIER__ = tier;
    },
    [!!opts.timer, opts.tier ?? ''] as const,
  );
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate(
    ([starter, cloud, capsules]) => {
      localStorage.clear();
      const s = starter as typeof STARTER_FIELD;
      const field = {
        ...s,
        species: { cloud: { ...s.species.cloud, ...(cloud as object) } },
        position: { map: 'meadow', x: 5, y: 8, facing: 'right' },
        ...(capsules ? { capsules } : {}),
      };
      localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
    },
    [STARTER_FIELD, opts.cloud ?? {}, opts.capsules ?? null] as const,
  );
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '5,8');
}

/** 저장본의 구름몬 기록 */
async function savedCloud(page: Page): Promise<{ hp: number; wounds: { factId: string; type: string }[] }> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.species.cloud);
}

/** 정답이 아닌 기술 버튼 하나 */
function wrongMoveButton(page: Page, answer: number) {
  return page.locator('.wild-move').filter({ hasNot: page.locator(`.wild-move__num:text-is("${answer}")`) }).first();
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
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowDown');
  await expect(page).toHaveURL(/#\/field\/battle$/);
});

test('풀숲에서 만나 정답으로 HP를 0으로 만들면 캡슐 던지기 버튼이 나온다', async ({ page }) => {
  await standBesideGrass(page);
  await stepIntoGrass(page);
  await expect(page.getByText(/나타났다/)).toBeVisible();
  for (let i = 0; i < 6; i++) {
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

/** 저장본의 캡슐 개수 */
async function savedCapsules(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.capsules);
}

/** 정답만 골라 어지러워질 때까지 (캡슐 버튼이 나오거나, 캡슐이 없어 돌려보낼 때까지) */
async function answerUntilDizzy(page: Page) {
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: '캡슐 던지기' }).isVisible()) return;
    if (await page.getByText(/캡슐이 없어서/).isVisible()) return;
    const answer = await solveWild(page);
    await moveButton(page, answer).click();
    await page.waitForTimeout(800);
  }
}

test('던지기 버튼에 맞는 캡슐의 남은 수 (3)가 보인다', async ({ page }) => {
  await standBesideGrass(page, { tier: 'weak' });
  await stepIntoGrass(page);
  await answerUntilDizzy(page);
  const button = page.getByRole('button', { name: '캡슐 던지기' });
  await expect(button).toBeVisible();
  await expect(button).toContainText('캡슐 던지기 (3)');
  await page.screenshot({ path: '.superpowers/sdd/2026-11-12-field-adventure-2/task-14-shots/capsule-button-375.png' });
});

test('잡으면 초원 캡슐이 1개 준다 (3 → 2, 저장본)', async ({ page }) => {
  await standBesideGrass(page, { tier: 'weak' });
  await stepIntoGrass(page);
  await answerUntilDizzy(page);
  // 연타해도 한 번만 던진다
  await page.getByRole('button', { name: '캡슐 던지기' }).click();
  await page.getByRole('button', { name: '캡슐 던지기' }).click({ force: true }).catch(() => undefined);
  // 던지는 순간 바로 저장된다 (흔들리는 중)
  expect((await savedCapsules(page)).meadow).toBe(2);
  await expect(page.getByText(/잡았다!/)).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });
  expect(await savedCapsules(page)).toEqual({ meadow: 2, waterside: 3, desert: 3, legend: 0 });
});

test('캡슐 0개면 어지러워질 때 돌려보낸다 (버튼 없음)', async ({ page }) => {
  await standBesideGrass(page, { tier: 'weak', capsules: { meadow: 0, waterside: 3, desert: 3, legend: 0 } });
  await stepIntoGrass(page);
  await answerUntilDizzy(page);
  await expect(page.getByRole('status')).toHaveText('캡슐이 없어서 돌려보냈어! 상점에서 캡슐을 구해 오자');
  await expect(page.getByRole('button', { name: '캡슐 던지기' })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });
  const field = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field);
  expect(field.capsules.meadow).toBe(0);
  expect(field.stats).toMatchObject({ battles: 1, catches: 0, fled: 1 });
});

test('다른 종류 캡슐만 있으면 초원 구구몬은 돌려보낸다', async ({ page }) => {
  await standBesideGrass(page, { tier: 'weak', capsules: { meadow: 0, waterside: 5, desert: 5, legend: 5 } });
  await stepIntoGrass(page);
  await answerUntilDizzy(page);
  await expect(page.getByRole('status')).toHaveText(/캡슐이 없어서 돌려보냈어/);
  await expect(page.getByRole('button', { name: '캡슐 던지기' })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });
  expect(await savedCapsules(page)).toEqual({ meadow: 0, waterside: 5, desert: 5, legend: 5 });
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

test('오답이면 적이 공격해 내 체력이 줄고, 힌트의 빛나는 기술을 누르면 다시 문제', async ({ page }) => {
  await standBesideGrass(page);
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '싸우자!' }).click();
  await expect(page.getByLabel('내 체력 100')).toBeVisible();
  const answer = await solveWild(page);
  await wrongMoveButton(page, answer).click();
  const ally = page.getByLabel(/^내 체력 (80|75|66|50)$/);
  await expect(ally).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/의 .+!/); // "○○의 기술!"
  const shown = Number(((await ally.getAttribute('aria-label')) ?? '').replace(/\D/g, ''));
  const glow = page.locator('.wild-move--glow');
  await expect(glow).toHaveCount(1);
  await glow.click();
  await expect(glow).toHaveCount(0);
  await expect(page.locator('.wild__hint')).toHaveCount(0);
  await expect(page.locator('.wild__bubble .question')).toBeVisible();
  await expect(page.locator('.wild-move:enabled')).toHaveCount(3);
  const cloud = await savedCloud(page);
  expect(cloud.hp).toBe(shown);
  expect(cloud.wounds).toHaveLength(1);
});

test('시간이 다 되면 적이 공격하고, 쓰러지면 태초마을로 돌아가 "쓰러졌어…" 알림', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __GUGU_E2E_QUESTION__: unknown }).__GUGU_E2E_QUESTION__ = { factId: '7x8', type: 'product' };
  });
  // 단계를 보통(7초)으로 고정한다: 강함·강력(5초)이면 쓰러짐 글이 보이는 때가 달라진다
  await standBesideGrass(page, { timer: true, cloud: { hp: 20 }, tier: 'normal' });
  await stepIntoGrass(page);
  await expect(page.locator('.wild__bubble')).toHaveAttribute('data-fact', '7x8');
  await expect(page.getByRole('timer')).toBeVisible();
  // 필드로 돌아갈 때의 불러오기 화면은 아주 잠깐이라 화면 바뀜을 지켜 기록해 둔다
  await page.evaluate(() => {
    const w = window as unknown as { __loadingSeen: string[] };
    w.__loadingSeen = [];
    new MutationObserver(() => {
      const el = document.querySelector('[aria-label="불러오는 중"]');
      if (el) w.__loadingSeen.push(el.textContent ?? '');
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  // 정해진 시간만큼 자지 않고 쓰러짐 글이 뜨기를 기다린다 (7초 + 공격 연출)
  await expect(page.getByRole('status').filter({ hasText: '쓰러졌다' })).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/#\/field$/, { timeout: 5000 });
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '10,31'); // 태초마을 시작 칸
  const seen = await page.evaluate(() => (window as unknown as { __loadingSeen: string[] }).__loadingSeen);
  expect(seen.some((t) => t.includes('태초마을'))).toBe(true);
  await expect(page.getByRole('dialog', { name: '쓰러짐 알림' })).toContainText('쓰러졌어…');
  const field = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field);
  expect(field.position.map).toBe('town');
  expect(field.species.cloud.hp).toBe(0);
  expect(field.species.cloud.wounds[0]).toEqual({ factId: '7x8', type: 'product' });
});

test('쓰러진 동행이면 풀숲에서 만나지 않고 "구구몬이 쓰러졌어요" 알림이 보인다', async ({ page }) => {
  await standBesideGrass(page, { cloud: { hp: 0 } });
  await expect(page.getByRole('status').filter({ hasText: '구구몬이 쓰러졌어요' })).toBeVisible();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '6,8');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/#\/field$/);
  await expect(page.getByText('구구몬이 쓰러졌어요. 상점에서 회복시켜요')).toBeVisible();
});

test('전투 중 맞고 새로고침하면 필드로 돌아오고, 체력은 줄어 있다', async ({ page }) => {
  await standBesideGrass(page);
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '싸우자!' }).click();
  const answer = await solveWild(page);
  await wrongMoveButton(page, answer).click();
  await expect(page.getByLabel(/^내 체력 (80|75|66|50)$/)).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/#\/field$/);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  expect((await savedCloud(page)).hp).toBeLessThan(100);
});

test('도망 확인창을 6초 열어 둬도 시간이 흐르지 않아 맞지 않는다', async ({ page }) => {
  await standBesideGrass(page, { timer: true, tier: 'normal' }); // 시간 상한(7초)을 정해 둔다
  await stepIntoGrass(page);
  await page.getByRole('button', { name: '싸우자!' }).click();
  await expect(page.locator('.wild__bubble .question')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '도망치기' })).toBeVisible();
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: '계속 싸우기' }).click();
  const label = (await page.getByRole('timer').getAttribute('aria-label')) ?? '';
  expect(Number(label.replace(/\D/g, ''))).toBeGreaterThanOrEqual(3);
  await expect(page.getByLabel('내 체력 100')).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText(/시간이 지났어|의 .+!/);
});

test('강력한 야생은 이름 앞에 단계 말이 붙고 이름 카드에 색 테두리', async ({ page }) => {
  await standBesideGrass(page, { tier: 'mighty' });
  await stepIntoGrass(page);
  await expect(page.locator('.wild__card')).toHaveClass(/wild__card--mighty/);
  await expect(page.locator('.wild__name')).toHaveText(/^강력한 \S+ Lv\d+$/);
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
    const w = window as unknown as { __GUGU_E2E_FIELD__: boolean; __GUGU_E2E_NO_TIMER__: boolean };
    w.__GUGU_E2E_FIELD__ = true;
    w.__GUGU_E2E_NO_TIMER__ = true;
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
  // "약한 ○○ Lv3"처럼 단계 말이 앞에 붙는다
  const wildName = ((await page.locator('.wild__name').textContent()) ?? '')
    .replace(/\s*Lv\d+\s*$/, '')
    .replace(/^(약한|강한|강력한)\s+/, '')
    .trim();

  for (let i = 0; i < 6; i++) {
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

test('처음 필드는 첫 구구몬 고르기로 가고, 고르면 태초마을 @에서 시작한다', async ({ page }) => {
  await page.goto('/#/field');
  await expect(page).toHaveURL(/#\/field\/starter$/);
  await page.getByRole('button', { name: '젤리몬 고르기' }).click();
  await expect(page).toHaveURL(/#\/field$/);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '10,31');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.position);
  expect(saved).toEqual({ map: 'town', x: 10, y: 31, facing: 'down' });
});

// ── 상점 팝업 ──

/** 마을 상점 문(8,24) 바로 아래 (8,25)에서 위를 보고 선 저장본. extra로 필드 저장을 덧붙인다 */
async function standAtShopDoor(page: Page, extra: { species?: Record<string, unknown>; field?: Record<string, unknown> } = {}) {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate(
    ([starter, ex]) => {
      localStorage.clear();
      const s = starter as typeof STARTER_FIELD;
      const e = ex as { species?: Record<string, unknown>; field?: Record<string, unknown> };
      const field = { ...s, species: e.species ?? s.species, position: { map: 'town', x: 8, y: 25, facing: 'up' }, ...(e.field ?? {}) };
      localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
    },
    [STARTER_FIELD, extra] as const,
  );
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '8,25');
}

async function openShop(page: Page) {
  await page.keyboard.down('ArrowUp'); // 문(8,24)
  await expect(page.getByRole('dialog', { name: '상점' })).toBeVisible();
  await page.keyboard.up('ArrowUp');
}

async function savedFact(page: Page, id: string): Promise<{ box: number; dueAt: number | null }> {
  return page.evaluate((f) => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.learning.facts[f], id);
}

async function savedField(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field);
}

/** 연습 문제의 답 (a × b = ?) */
async function practiceAnswer(page: Page): Promise<number> {
  const q = page.getByRole('dialog', { name: '상점' }).locator('.practice__q .question');
  await expect(q).toBeVisible();
  const parts = (await q.locator('> *').allTextContents()).map((t) => t.trim());
  const [a, , b, , r] = parts;
  if (r === '?') return Number(a) * Number(b);
  if (a === '?') return Number(r) / Number(b);
  return Number(r) / Number(a);
}

/** 연습 보기: 숫자로 찾는다 (보기는 눌릴 때까지 자동으로 기다린다) */
function choice(page: Page, n: number) {
  return page.getByRole('dialog', { name: '상점' }).locator('.fshop-choice').filter({ hasText: new RegExp(`^${n}$`) });
}

async function wrongChoice(page: Page, answer: number) {
  const texts = await page.getByRole('dialog', { name: '상점' }).locator('.fshop-choice').allTextContents();
  return Number(texts.find((t) => Number(t) !== answer));
}

async function solveShop(page: Page) {
  const answer = await practiceAnswer(page);
  await choice(page, answer).click();
}

test('마을 문에 부딪히면 상점 팝업이 뜨고, 캡슐 탭에 네 줄이 있다 (황금 캡슐의 13단은 잠김)', async ({ page }) => {
  await standAtShopDoor(page);
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await expect(shop.getByText('초원 캡슐')).toBeVisible();
  await expect(shop.getByText('물가 캡슐')).toBeVisible();
  await expect(shop.getByText('사막 캡슐')).toBeVisible();
  await expect(shop.getByText('황금 캡슐')).toBeVisible();
  await shop.getByRole('button', { name: '황금 캡슐 얻기' }).click();
  await expect(shop.getByRole('button', { name: /13단/ })).toBeDisabled();
  await shop.getByRole('button', { name: '← 뒤로' }).click();
  await expect(shop.getByText('초원 캡슐')).toBeVisible();
});

test('상점이 열려 있는 동안은 걷지 않고, 닫기·Escape로 닫으면 문 앞 칸 그대로', async ({ page }) => {
  await standAtShopDoor(page);
  await openShop(page);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '8,25');
  await page.getByRole('dialog', { name: '상점' }).getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('dialog', { name: '상점' })).toHaveCount(0);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '8,25');
  // 방향을 떼었다 다시 누르면 다시 열리고, Escape로도 닫힌다
  await openShop(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '상점' })).toHaveCount(0);
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '8,25');
});

test('초원 캡슐 얻기: 2단 9문제 (첫 문제는 틀려 힌트 → 같은 문제), 캡슐 3개와 학습 기록', async ({ page }) => {
  await standAtShopDoor(page);
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  const before = await totalAttempts(page);
  await shop.getByRole('button', { name: '초원 캡슐 얻기' }).click();
  await shop.getByRole('button', { name: '2단' }).click();
  // 첫 문제 2 × 1: 일부러 틀린다
  const answer = await practiceAnswer(page);
  expect(answer).toBe(2);
  const boardBefore = await shop.locator('.fshop-choice').allTextContents();
  await choice(page, await wrongChoice(page, answer)).click();
  await expect(shop.locator('.fshop-choice--glow')).toHaveCount(1);
  await expect(shop.locator('.practice__hint')).toBeVisible();
  await shop.locator('.fshop-choice--glow').click();
  // 같은 문제, 같은 보기
  await expect(shop.locator('.practice__hint')).toHaveCount(0);
  expect(await practiceAnswer(page)).toBe(2);
  expect(await shop.locator('.fshop-choice').allTextContents()).toEqual(boardBefore);
  await solveShop(page);
  for (let i = 2; i <= 9; i++) {
    expect(await practiceAnswer(page)).toBe(2 * i);
    await solveShop(page);
  }
  await expect(shop.getByText('초원 캡슐 3개를 받았어요!')).toBeVisible();
  expect((await savedField(page)).capsules.meadow).toBe(6);
  expect(await totalAttempts(page)).toBe(before + 10);
  // 틀린 적 없는 사실을 맞히면 지금처럼 상자가 오른다 (다음 복습은 미래)
  const ok = await savedFact(page, '2x5');
  expect(ok.box).toBe(1);
  expect(ok.dueAt!).toBeGreaterThan(Date.now());
  // 틀렸다가 힌트 뒤 맞힌 사실(2x1)은 지금 복습 대상
  expect((await savedFact(page, '2x1')).dueAt!).toBeLessThanOrEqual(Date.now());
  await shop.getByRole('button', { name: '확인' }).click();
  await expect(shop.getByLabel('초원 캡슐 6개')).toBeVisible();
  expect((await savedField(page)).capsules.meadow).toBe(6);
});

test('연습 도중에 나가면 캡슐은 그대로 (그만하기·Escape)', async ({ page }) => {
  await standAtShopDoor(page);
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await shop.getByRole('button', { name: '초원 캡슐 얻기' }).click();
  await shop.getByRole('button', { name: '4단' }).click();
  await solveShop(page);
  await solveShop(page);
  await shop.getByRole('button', { name: '그만하기' }).click();
  await expect(shop.getByText('초원 캡슐')).toBeVisible();
  expect((await savedField(page)).capsules.meadow).toBe(3);
  // Escape는 연습만 그만두고 상점은 그대로
  await shop.getByRole('button', { name: '초원 캡슐 얻기' }).click();
  await shop.getByRole('button', { name: '8단' }).click();
  await solveShop(page);
  await page.keyboard.press('Escape');
  await expect(shop).toBeVisible();
  await expect(shop.getByText('초원 캡슐')).toBeVisible();
  expect((await savedField(page)).capsules.meadow).toBe(3);
});

test('회복약: 쓰러진 구구몬을 상처 문제 3바퀴로 회복한다', async ({ page }) => {
  await standAtShopDoor(page, {
    species: { cloud: { ...STARTER_FIELD.species.cloud, hp: 0, wounds: [{ factId: '7x8', type: 'product' }] } },
  });
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await shop.getByRole('tab', { name: '회복약' }).click();
  await expect(shop.getByText('쓰러짐')).toBeVisible();
  await shop.getByRole('button', { name: /고치기/ }).click();
  for (let i = 0; i < 3; i++) {
    expect(await practiceAnswer(page)).toBe(56);
    await solveShop(page);
  }
  await expect(shop.getByText(/다 나았어요/)).toBeVisible();
  const cloud = await savedCloud(page);
  expect(cloud.hp).toBe(100);
  expect(cloud.wounds).toEqual([]);
  await shop.getByRole('button', { name: '확인' }).click();
  await expect(shop.getByText('모두 건강해요!')).toBeVisible();
  await shop.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('dialog', { name: '상점' })).toHaveCount(0);
});

test('회복약: 틀리면 힌트 뒤 같은 문제, 틀린 답도 학습 기록에 남는다', async ({ page }) => {
  await standAtShopDoor(page, {
    species: { cloud: { ...STARTER_FIELD.species.cloud, hp: 40, wounds: [{ factId: '7x8', type: 'product' }] } },
  });
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await shop.getByRole('tab', { name: '회복약' }).click();
  await shop.getByRole('button', { name: /고치기/ }).click();
  const before = await totalAttempts(page);
  await choice(page, await wrongChoice(page, 56)).click();
  await expect(shop.locator('.fshop-choice--glow')).toHaveCount(1);
  await shop.locator('.fshop-choice--glow').click();
  await solveShop(page);
  expect(await totalAttempts(page)).toBe(before + 2);
  // 틀린 뒤 힌트로 맞혀도 오답 복습에 남는다: 상자 1, 지금 바로 복습 대상 (재출제 답으로 기록)
  const f = await savedFact(page, '7x8');
  expect(f.box).toBe(1);
  expect(f.dueAt!).toBeLessThanOrEqual(Date.now());
  expect((await savedCloud(page)).hp).toBe(40); // 아직 안 나음 (3번 맞혀야)
});

test('회복약: 쓰러진 마을 구구몬은 회복하고 상점을 닫으면 일어난다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', /\d+,\d+/);
  await page.evaluate((starter) => {
    localStorage.clear();
    const field = {
      ...starter,
      species: { ...starter.species, jelly: { level: 3, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1, hp: 0, wounds: [] } },
      seen: ['cloud', 'jelly'],
      position: { map: 'town', x: 8, y: 25, facing: 'up' },
    };
    localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
  }, STARTER_FIELD);
  await page.reload();
  const canvas = page.getByTestId('field-canvas');
  await expect(canvas).toHaveAttribute('data-sleeping', 'jelly');
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await shop.getByRole('tab', { name: '회복약' }).click();
  await shop.getByRole('button', { name: /고치기/ }).click(); // 상처가 없으면 바로 회복
  await expect(shop.getByText(/다 나았어요/)).toBeVisible();
  await shop.getByRole('button', { name: '닫기' }).click();
  await expect(canvas).toHaveAttribute('data-sleeping', '');
});

test('준비 중 탭은 안내만 나온다', async ({ page }) => {
  await standAtShopDoor(page);
  await openShop(page);
  const shop = page.getByRole('dialog', { name: '상점' });
  await shop.getByRole('tab', { name: '준비 중' }).click();
  await expect(shop.getByText('추후 업데이트로 열려요')).toBeVisible();
  await expect(shop.getByText('초원 캡슐')).toBeVisible(); // 탭은 그대로
});

test('초원 위 출구로 나가면 태초마을 아래 출구 위 칸, 마을 아래 출구로 나가면 초원 위 출구 아래 칸', async ({ page }) => {
  await standAt(page, 'meadow', 7, 1, 'up');
  await tap(page, 'ArrowUp');
  await expect(page.getByRole('status', { name: '불러오는 중' })).toContainText('태초마을');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,38');
  await page.reload();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '9,38');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.position.map)).toBe('town');

  await tap(page, 'ArrowDown', 400); // 도착하면 위를 보고 있어서 돌아선 뒤 걷는다
  await expect(page.getByRole('status', { name: '불러오는 중' })).toContainText('초원');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '7,1');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.position.map)).toBe('meadow');
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
    const w = window as unknown as { __GUGU_E2E_FIELD__: boolean; __GUGU_E2E_LEGEND__: boolean; __GUGU_E2E_NO_TIMER__: boolean };
    w.__GUGU_E2E_FIELD__ = true;
    w.__GUGU_E2E_LEGEND__ = true;
    w.__GUGU_E2E_NO_TIMER__ = true;
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

// ── 마을에서 돌아다니는 구구몬 ──

/** 젤리몬을 잡았고 동행은 구름몬인 저장본. Math.random은 pin이 켜져 있는 동안 0을 돌려줘 처음 자리를 정한다 */
async function seedTownRoam(page: Page, hero: { x: number; y: number }, facing: string) {
  await page.addInitScript(
    ([position]) => {
      if (!localStorage.getItem('gugu-monster:save')) {
        const field = {
          starterChosen: true,
          companion: 'cloud',
          species: {
            cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1 },
            jelly: { level: 4, exp: 0, stage: 1, caught: 1, firstCaughtAt: 2 },
          },
          seen: ['cloud', 'jelly'],
          position,
        };
        localStorage.setItem('gugu-monster:save', JSON.stringify({ version: 1, state: { field } }));
      }
      const w = window as unknown as { __pin: boolean };
      w.__pin = true;
      const real = Math.random;
      Math.random = () => (w.__pin ? 0 : real());
    },
    [{ map: 'town', ...hero, facing }] as const,
  );
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', `${hero.x},${hero.y}`);
}

test('마을에서는 잡은 구구몬(동행 빼고)이 자기 서식지에서 돌아다닌다', async ({ page }) => {
  await seedTownRoam(page, { x: 10, y: 31 }, 'down');
  const canvas = page.getByTestId('field-canvas');
  await expect(canvas).toHaveAttribute('data-roamers', /^jelly:\d+,\d+$/);
  await page.evaluate(() => ((window as unknown as { __pin: boolean }).__pin = false));
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const [, x, y] = ((await canvas.getAttribute('data-roamers')) ?? '').match(/^jelly:(\d+),(\d+)$/)!.map(Number);
    seen.add(`${x},${y}`);
    // 물가 서식지: 연못(5~10, 8~9) 둘레 4~11 × 7~10
    expect(x >= 4 && x <= 11 && y >= 7 && y <= 10).toBe(true);
    expect(x >= 5 && x <= 10 && y >= 8 && y <= 9).toBe(false);
    await page.waitForTimeout(500);
  }
});

test('구구몬에게 부딪히면 말풍선이 뜬다 (이름·Lv·체력)', async ({ page }) => {
  await seedTownRoam(page, { x: 4, y: 6 }, 'down');
  const canvas = page.getByTestId('field-canvas');
  await expect(canvas).toHaveAttribute('data-roamers', 'jelly:4,7'); // pin: 첫 서식지 칸
  await page.evaluate(() => ((window as unknown as { __pin: boolean }).__pin = false));
  await page.keyboard.down('ArrowDown'); // 이미 아래를 보고 있어 곧바로 부딪힌다
  const bubble = page.getByRole('dialog', { name: '구구몬 말풍선' });
  await expect(bubble).toContainText('젤리몬');
  await expect(bubble).toContainText('Lv4');
  await expect(bubble).toContainText('체력 100');
  await page.keyboard.up('ArrowDown');
  expect(await pos(page)).toEqual({ x: 4, y: 6 }); // 못 지나간다
  await expect(bubble).toHaveCount(0, { timeout: 4000 }); // 잠시 뒤 사라진다
});

test('구구몬이 있는 칸을 탭해도 말풍선이 뜬다', async ({ page }) => {
  await seedTownRoam(page, { x: 4, y: 12 }, 'down');
  const canvas = page.getByTestId('field-canvas');
  await expect(canvas).toHaveAttribute('data-roamers', 'jelly:4,7');
  await page.evaluate(() => ((window as unknown as { __pin: boolean }).__pin = false));
  const box = (await canvas.boundingBox())!;
  const [camX, camY, tile] = ((await canvas.getAttribute('data-cam')) ?? '0,0,1').split(',').map(Number);
  const cw = await canvas.evaluate((c) => (c as HTMLCanvasElement).width);
  const css = (tile * box.width) / cw;
  await page.mouse.click(box.x + (4.5 - camX) * css, box.y + (7.5 - camY) * css);
  await expect(page.getByRole('dialog', { name: '구구몬 말풍선' })).toContainText('젤리몬');
});

// ── 왼쪽 위 표시·태초마을로·도감 체력 ──

test('HUD에 도감 1/11과 캡슐 3개씩, 동행 체력이 보인다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  const hud = page.getByRole('group', { name: '필드 정보' });
  await expect(hud).toBeVisible();
  await expect(hud).toContainText('도감 1/11');
  await expect(hud.getByLabel('초원 캡슐 3개')).toBeVisible();
  await expect(hud.getByLabel('황금 캡슐 0개')).toBeVisible();
  await expect(hud.getByLabel('동행 체력 100')).toBeVisible();
  // 메뉴 버튼과 겹치지 않는다
  const a = (await hud.boundingBox())!;
  const b = (await page.getByRole('button', { name: '메뉴' }).boundingBox())!;
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
});

test('초원에서 메뉴의 태초마을로를 누르면 마을 @에 서고 저장본도 마을', async ({ page }) => {
  await standAt(page, 'meadow', 5, 8, 'right');
  await page.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('button', { name: '태초마을로' }).click();
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '10,31');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.field.position);
  expect(saved).toEqual({ map: 'town', x: 10, y: 31, facing: 'down' });
});

test('마을에서는 메뉴에 태초마을로가 없다', async ({ page }) => {
  await seedStarter(page);
  await page.goto('/#/field');
  await expect(page.getByTestId('field-canvas')).toHaveAttribute('data-pos', '10,31');
  await page.getByRole('button', { name: '메뉴' }).click();
  await expect(page.getByRole('button', { name: '구구몬 도감' })).toBeVisible();
  await expect(page.getByRole('button', { name: '태초마을로' })).toHaveCount(0);
});

test('도감에서 쓰러진 종은 쓰러짐 꼬리표와 빨간 막대, 함께 다니기가 꺼져 있다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 1,
        state: {
          field: {
            starterChosen: true,
            companion: 'cloud',
            species: {
              cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1 },
              jelly: { level: 3, exp: 0, stage: 1, caught: 1, firstCaughtAt: 2, hp: 0 },
              horn: { level: 3, exp: 0, stage: 1, caught: 1, firstCaughtAt: 3, hp: 40 },
            },
            seen: ['cloud', 'jelly', 'horn'],
          },
        },
      }),
    );
  });
  await page.goto('/#/field/dex');
  await expect(page.getByLabel('체력 0')).toHaveCount(1);
  await expect(page.getByLabel('체력 40')).toHaveCount(1);
  await expect(page.locator('.fdex__cell--caught').filter({ hasText: '쓰러짐' })).toHaveCount(1);
  await page.locator('.fdex__cell--caught').filter({ hasText: '쓰러짐' }).click();
  const btn = page.getByRole('button', { name: /함께 다니기/ });
  await expect(btn).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('상점에서 회복시켜요');
});
