import { expect, type Page } from '@playwright/test';

/** 화면에 보이는 문제를 읽어 답을 계산한다 (앱 내부 상태를 보지 않는다) */
async function solveOnScreen(page: Page): Promise<number> {
  return page.evaluate(() => {
    const q =
      document.querySelector('.battle__question .question--stack .question') ?? document.querySelector('.battle__question .question');
    if (!q) throw new Error('문제가 없음');
    const parts = [...q.children].map((c) => (c.textContent ?? '').replace(',', '').trim());
    if (q.classList.contains('question--sequence')) {
      const t = parts.map((p) => (p === '?' ? null : Number(p)));
      const known = t.map((v, i) => [i, v] as const).filter(([, v]) => v !== null) as [number, number][];
      const step = (known[1][1] - known[0][1]) / (known[1][0] - known[0][0]);
      return known[0][1] + (t.indexOf(null) - known[0][0]) * step;
    }
    const [a, op, b, , r] = parts;
    // 추천 탐험에는 덧셈·뺄셈(셈 연습 문제)도 섞여 나온다
    if (op === '+' || op === '−') {
      const add = op === '+';
      if (r === '?') return add ? Number(a) + Number(b) : Number(a) - Number(b);
      if (a === '?') return add ? Number(r) - Number(b) : Number(r) + Number(b);
      return add ? Number(r) - Number(a) : Number(a) - Number(r);
    }
    if (r === '?') return Number(a) * Number(b);
    if (a === '?') return Number(r) / Number(b);
    return Number(r) / Number(a);
  });
}

/** 지금 문제에 답한다 (선택형이면 보기를, 키패드면 숫자를 누른다) */
export async function answerCurrent(page: Page, correct = true): Promise<void> {
  const answer = await solveOnScreen(page);
  const choices = page.locator('.choices .choice');
  if ((await choices.count()) > 0) {
    const texts = await choices.allTextContents();
    const pick = correct ? String(answer) : texts.find((t) => t.trim() !== String(answer))!;
    await choices.filter({ hasText: new RegExp(`^${pick.trim()}$`) }).first().click();
    return;
  }
  const value = correct ? String(answer) : String(answer + 1);
  for (const digit of value) await page.locator('.keypad .key', { hasText: new RegExp(`^${digit}$`) }).click();
  await page.locator('.keypad .key', { hasText: '확인' }).click();
}

/** 결과 화면이 나올 때까지 탐험을 진행한다 */
export async function playExploration(page: Page, { wrongFirst = false } = {}): Promise<void> {
  let first = true;
  for (let i = 0; i < 30; i++) {
    if (await page.locator('.result').isVisible()) return;
    const glow = page.locator('.choice--glow');
    if (await glow.isVisible()) {
      await glow.click();
    } else if (await page.locator('.battle__question').isVisible()) {
      await answerCurrent(page, !(wrongFirst && first));
      first = false;
    }
    // 공격·포획 연출이 끝날 때까지
    await page.waitForTimeout(1400);
  }
  await expect(page.locator('.result')).toBeVisible();
}

export async function enterPin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await page.locator('.pinpad__keys .key', { hasText: new RegExp(`^${d}$`) }).click();
  await page.waitForTimeout(400);
}

/** 펫이 이미 부화한 기기 (온보딩을 건너뛰고 싶은 테스트용). 나머지는 앱이 기본값으로 채운다. */
export async function seedHatchedPet(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 1,
        state: {
          pet: { species: 'cat', stage: 'baby', name: '냥이', statsUpdatedAt: Date.now() },
          learning: { totalExplorations: 1 },
          economy: { stars: 50 },
        },
      }),
    );
  });
  await page.reload();
}

/** 펫 화면에 진화 축하 창이 뜨면 닫는다 (탐험으로 친밀도가 올라 진화할 수 있다) */
export async function closeEvolutionIfShown(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: '진화' });
  const shown = await dialog
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => true)
    .catch(() => false);
  if (shown) await dialog.getByRole('button', { name: '멋져!' }).click();
}

/** 앱에서 잡히지 않은 오류를 모은다 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
