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
          economy: { stars: 20 },
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
  expect(errors).toEqual([]);
});
