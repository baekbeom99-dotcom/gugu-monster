/** 도감: 친밀도 Lv10이면 칭호를 받고 도감으로 → 새 알 → 탐험 → 부화 → 도감에서 예전 펫과 자리 바꾸기. 관리자 '새 펫 시작하기'. */
import { expect, test } from '@playwright/test';
import { collectErrors, enterPin, playExploration, seedHatchedPet } from './helpers';

test('Lv10이 된 펫이 칭호를 받고 도감에 들어가고, 새 알을 키우고, 다시 예전 펫과 함께한다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 1,
        state: {
          pet: {
            species: 'cat', stage: 'adult', name: '나비', fullness: 100, mood: 100, cleanliness: 100,
            affection: 320, statsUpdatedAt: now, lastVisitDate: null, hatchedAt: '2026-10-01',
            evolutionCards: [{ stage: 'baby', date: '2026-10-01' }, { stage: 'adult', date: '2026-10-12' }],
          },
          learning: { totalExplorations: 20, totalOvercome: 6, studyDays: ['2026-10-01', '2026-10-02'] },
          economy: { stars: 40 },
        },
      }),
    );
  });
  await page.reload();
  await page.goto('/#/pet');

  // 작별 → 칭호
  await expect(page.locator('.graduation')).toContainText('나비와 친밀도 Lv10이 됐어요!');
  await page.getByRole('button', { name: /칭호 받기/ }).click();
  await expect(page.locator('.title-stamp__title')).toHaveText('용감한 탐험가');
  await expect(page.locator('.title-stamp__name')).toHaveText('나비');
  await page.getByRole('button', { name: '도감에 넣고 새 알 고르기' }).click();

  // 이미 공부해 온 학생은 바로 알 고르기, 진단 대신 추천 탐험
  await expect(page.getByRole('heading', { name: '새 친구가 될 알을 골라 줘!' })).toBeVisible();
  await expect(page.getByRole('button', { name: /도감 보기 \(1마리\)/ })).toBeVisible();
  await page.locator('.egg-choice', { hasText: '바다 알' }).click();
  await page.getByRole('button', { name: '이 알로 할래!' }).click();
  await page.getByRole('button', { name: '탐험 떠나기' }).click();
  await expect(page).toHaveURL(/mode=recommended/);
  await playExploration(page);

  // 탐험을 마쳤으니 새 알이 부화
  await page.getByRole('button', { name: /알이 흔들려요/ }).click();
  await page.getByRole('button', { name: '이름 지어 주기' }).click({ timeout: 10_000 });
  await page.getByLabel('펫 이름').fill('퐁퐁');
  await page.getByRole('button', { name: '이 이름으로 할래!' }).click();
  await page.getByRole('button', { name: '펫에게 가기' }).click();
  await expect(page.locator('.pet-name')).toHaveText('퐁퐁');

  // 도감에 나비가 칭호와 함께
  await page.getByRole('button', { name: '📖 도감' }).click();
  const card = page.locator('.dex-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('용감한 탐험가');
  await expect(card).toContainText('나비');

  // 별은 그대로 (40 + 탐험 보상 + 시작 선물)
  const stars = Number((await page.locator('.topbar .stars strong').textContent()) ?? 0);
  expect(stars).toBeGreaterThan(40);

  // 도감에서 나비를 고르면 퐁퐁은 도감에서 쉬고 나비가 칭호·레벨 그대로 돌아온다
  await card.getByRole('button', { name: '다시 함께하기' }).click();
  await expect(page.locator('.dex-swap')).toContainText('퐁퐁이는 도감에서 쉬어요');
  await page.getByRole('button', { name: '함께하기', exact: true }).click();
  await expect(page.locator('.pet-name')).toHaveText('나비');
  await expect(page.locator('.pet-title')).toContainText('용감한 탐험가');
  await expect(page.locator('.pet-chip--love')).toContainText('Lv10');
  await expect(page.locator('.growth')).toContainText('이미 졸업한 친구예요');
  await expect(page.locator('.graduation')).toHaveCount(0); // 졸업은 한 번만

  await page.getByRole('button', { name: '📖 도감' }).click();
  await expect(page.locator('.dex-card')).toHaveCount(1);
  await expect(page.locator('.dex-card')).toContainText('퐁퐁');
  await expect(page.locator('.dex-card')).toContainText('쉬는 중');
  expect(errors).toEqual([]);
});

test('놀기: 산책과 장난감마다 다른 놀이 장면', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'gugu-monster:save',
      JSON.stringify({
        version: 1,
        state: {
          pet: { species: 'penguin', stage: 'child', name: '뒤뚱', mood: 50, statsUpdatedAt: Date.now() },
          learning: { totalExplorations: 2 },
          economy: { stars: 10, owned: ['toy_ball', 'toy_bubbles'] },
        },
      }),
    );
  });
  await page.reload();
  await page.goto('/#/pet');

  await page.locator('.care', { hasText: '놀기' }).click();
  await expect(page.locator('.bag-item--free')).toHaveCount(2);
  await page.locator('.bag-item', { hasText: '산책하기' }).click();
  await expect(page.locator('.play--walk')).toBeVisible();
  await expect(page.locator('.pet-button')).toHaveClass(/pet-play--walk/);
  await page.waitForTimeout(2800);

  await page.locator('.care', { hasText: '놀기' }).click();
  await page.locator('.bag-item', { hasText: '공' }).click();
  await expect(page.locator('.play-prop--bounce')).toBeVisible();
  await expect(page.locator('.pet-button')).toHaveClass(/pet-play--bounce/);
  await page.waitForTimeout(2800);

  await page.locator('.care', { hasText: '놀기' }).click();
  await page.locator('.bag-item', { hasText: '비눗방울' }).click();
  await expect(page.locator('.play-prop--float').first()).toBeVisible();
  await expect(page.locator('.pet-button')).toHaveClass(/pet-play--float/);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.pet);
  expect(saved.careCounts).toMatchObject({ walk: 1, 'item:toy': 2 });
  expect(errors).toEqual([]);
});

test('관리자가 새 펫을 시작하면 지금 펫은 도감으로 가고, 별은 그대로다', async ({ page }) => {
  const errors = collectErrors(page);
  await seedHatchedPet(page);
  await page.getByRole('link', { name: /관리/ }).click();
  await enterPin(page, '4321');
  await enterPin(page, '4321');
  await page.getByRole('button', { name: '적어 두었어요' }).click();
  await page.locator('.admin-menu__item', { hasText: '펫 관리' }).click();
  await expect(page.locator('.admin-summary')).toContainText('졸업하면 받을 칭호');

  await page.getByRole('button', { name: '새 펫 시작하기' }).click();
  await expect(page.locator('.modal')).toContainText('냥이는');
  await page.getByRole('button', { name: '네' }).click();
  await enterPin(page, '4321');

  await expect(page).toHaveURL(/#\/welcome/);
  await expect(page.getByRole('heading', { name: '새 친구가 될 알을 골라 줘!' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gugu-monster:save')!).state);
  expect(saved.dex).toHaveLength(1);
  expect(saved.dex[0]).toMatchObject({ name: '냥이', reason: 'admin' });
  expect(saved.economy.stars).toBe(50);
  expect(saved.pet.species).toBeNull();
  expect(errors).toEqual([]);
});
