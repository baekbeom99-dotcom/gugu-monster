/** 설계서 6-6: 똥을 싸면 화난 표정·청소, 아프면 아픈 표정·주사. 치울 때까지 표정이 계속된다. */
import { collectErrors } from './helpers';
import { expect, test } from './fixtures';

test('똥은 치우고, 아프면 주사를 맞힌다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 2,
        state: {
          pet: {
            species: 'dog', stage: 'child', name: '멍멍', affection: 40, statsUpdatedAt: Date.now(),
            lastVisitDate: new Date().toISOString().slice(0, 10), poops: 2, sick: { since: Date.now(), cause: 'food' },
          },
          learning: { totalExplorations: 3 },
          economy: { stars: 120 },
          lastSeenAt: Date.now(),
        },
      }),
    );
  });
  await page.reload();
  await page.goto('/#/pet');

  // 아프면 아픈 표정이 먼저, 똥 두 개가 방에 있다
  await expect(page.locator('.speech--room')).toContainText('상한 걸 먹었나 봐');
  await expect(page.locator('.room .poop')).toHaveCount(2);
  await expect(page.locator('.trouble--clean')).toContainText('똥 치우기 (2)');

  // 아플 때 펫을 눌러도 놀지 않는다
  await page.locator('.pet-button').click();
  await expect(page.locator('.speech--room')).toContainText('몸이 안 좋아');

  // 주사 → 병이 낫고, 남은 똥 때문에 화난 표정
  await page.locator('.trouble--shot').click();
  await expect(page.locator('.speech--room')).toContainText('다 나았어');
  await expect(page.locator('.trouble--shot')).toHaveCount(0);
  await page.waitForTimeout(1600);
  await page.locator('.pet-button').click();
  await expect(page.locator('.speech--room')).toHaveText('흥! 똥부터 치워 줘!');

  // 청소 → 똥이 사라지고 버튼도 사라진다
  await page.locator('.trouble--clean').click();
  await expect(page.locator('.speech--room')).toContainText('깨끗해졌다');
  await expect(page.locator('.room .poop')).toHaveCount(0);
  await expect(page.locator('.trouble-bar')).toHaveCount(0);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.pet);
  expect(saved).toMatchObject({ poops: 0, sick: null, name: '멍멍' });
  expect(saved.careCounts).toMatchObject({ clean: 1, shot: 1 });
  // 주사 ★50 + 청소 ★50
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.economy.stars)).toBe(20);
  expect(errors).toEqual([]);
});

test('배부름 15 이하면 밥만 줄 수 있고, 똥 치우기는 된다 · 기분 30 이하면 화난 표정', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 2,
        state: {
          pet: {
            species: 'pig', stage: 'child', name: '꿀꿀', affection: 40, fullness: 10, mood: 25, cleanliness: 60,
            statsUpdatedAt: Date.now(), lastVisitDate: new Date().toISOString().slice(0, 10), poops: 1,
          },
          learning: { totalExplorations: 3 },
          economy: { stars: 120 },
          lastSeenAt: Date.now(),
        },
      }),
    );
  });
  await page.reload();
  await page.goto('/#/pet');

  // 밥 말고는 모두 잠김
  await expect(page.locator('.care--blocked')).toHaveCount(4);
  // 잠긴 버튼(aria-disabled)도 누르면 왜 안 되는지 말해 준다
  await page.locator('.care', { hasText: '놀기' }).click({ force: true });
  await expect(page.locator('.speech--room')).toHaveText('배가 너무 고파서 아무것도 못 하겠어… 밥부터 줘!');
  await expect(page.locator('.drawer')).toHaveCount(0);
  await expect(page.locator('.gauge__bar--danger')).toHaveCount(2);

  // 똥 치우기는 된다
  await page.locator('.trouble--clean').click();
  await expect(page.locator('.room .poop')).toHaveCount(0);

  // 밥을 먹으면 잠금이 풀린다 (기분은 아직 30 이하라 화난 말)
  await page.waitForTimeout(1600);
  await page.locator('.care', { hasText: '밥' }).click();
  await page.locator('.bag-item', { hasText: '기본 사료' }).click();
  await expect(page.locator('.care--blocked')).toHaveCount(0);
  await page.waitForTimeout(1800);
  await page.locator('.care', { hasText: '잠' }).click();
  await expect(page.locator('.speech--room')).not.toContainText('배가 너무 고파서');
  expect(errors).toEqual([]);
});

test('별이 50개보다 적으면 똥을 치우거나 주사를 맞힐 수 없다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 2,
        state: {
          pet: { species: 'cat', stage: 'child', name: '냥이', statsUpdatedAt: Date.now(), lastVisitDate: new Date().toISOString().slice(0, 10), poops: 1 },
          learning: { totalExplorations: 3 },
          economy: { stars: 30 },
          lastSeenAt: Date.now(),
        },
      }),
    );
  });
  await page.reload();
  await page.goto('/#/pet');
  await expect(page.locator('.trouble--clean')).toContainText('★50');
  await expect(page.locator('.trouble--clean')).toHaveClass(/trouble--short/);
  await page.locator('.trouble--clean').click();
  await expect(page.locator('.speech--room')).toContainText('별이 50개 필요해요! 별이 20개 모자라요');
  await expect(page.locator('.room .poop')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.economy.stars)).toBe(30);
});
