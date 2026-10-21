/** 단 골라 탐험 = 단 도전: 그 단의 11문제만, 모두 맞힐 때까지, 33초 안이면 MASTER + 보너스. 틀린 문제는 추천 탐험에 다시 나온다. */
import { expect, test } from './fixtures';
import { answerCurrent, closeEvolutionIfShown, collectErrors, playExploration, seedHatchedPet } from './helpers';

test('7단 도전: 11문제 모두, 틀리면 MASTER 아님, 틀린 문제는 추천 탐험에서 다시, 오답 0개면 MASTER', async ({ page }) => {
  const errors = collectErrors(page);
  await seedHatchedPet(page);
  await page.getByRole('link', { name: /탐험/ }).click();
  await page.locator('.dan-button', { hasText: /^7단/ }).click();
  await expect(page).toHaveURL(/mode=dan&dan=7/);
  await expect(page.locator('.trial-clock')).toContainText('0/11');

  // 문제를 모으며 끝까지: 첫 문제만 일부러 틀린다
  const seen = new Set<string>();
  let wrongFact: string | null = null;
  for (let i = 0; i < 40 && !(await page.locator('.result').isVisible()); i++) {
    if (await page.locator('.choice--glow').isVisible()) {
      await page.locator('.choice--glow').click();
    } else if (await page.locator('.battle__question').isVisible()) {
      const q = (await page.locator('.battle__question .question').innerText()).replace(/\s+/g, ' ');
      expect(q).toMatch(/^7 × \d+ = \?$/); // 7단만, 답 구하기만
      seen.add(q);
      const first = wrongFact === null;
      if (first) wrongFact = q;
      await answerCurrent(page, !first);
    }
    await page.waitForTimeout(1400);
  }
  expect(seen.size).toBe(11);

  // 결과: 시간은 남지만, 하나 틀렸으니 MASTER는 아니다
  await expect(page.locator('.result__title')).toHaveText('7단 도전 완료!');
  await expect(page.locator('.trial-result__time')).toContainText('초');
  await expect(page.locator('.trial-result__sub')).toContainText('틀린 문제 1개');
  await expect(page.locator('.banner--master')).toHaveCount(0);

  // 틀린 문제는 부스트 3 → 추천 탐험에서 다시 나와 맞히면 2로, 결과에 풀이 시간
  const factId = `7x${wrongFact!.match(/7 × (\d+)/)![1]}`;
  const boostOf = () => page.evaluate((id) => JSON.parse(localStorage.getItem('gugu-monster:save')!).state.learning.boosted[id], factId);
  expect(await boostOf()).toBe(3);
  await page.getByRole('button', { name: '펫에게 가기' }).click();
  await closeEvolutionIfShown(page);
  await page.getByRole('link', { name: /탐험/ }).click();
  await page.locator('.explore__main--recommended').click();
  await expect(page).toHaveURL(/mode=recommended/);
  await playExploration(page);
  await expect(page.locator('.trial-result__label')).toHaveText('풀이에 걸린 시간');
  await expect(page.locator('.trial-result__sub')).toContainText('한 문제에 평균');
  expect(await boostOf()).toBe(2);

  // 다시 7단 도전: 하나도 틀리지 않으면 MASTER + 보너스
  await page.getByRole('button', { name: '펫에게 가기' }).click();
  await closeEvolutionIfShown(page);
  await page.getByRole('link', { name: /탐험/ }).click();
  await page.locator('.dan-button', { hasText: /^7단/ }).click();
  await playExploration(page);
  await expect(page.locator('.banner--master')).toContainText('7단 MASTER 달성!');
  await expect(page.locator('.trial-result__sub')).toContainText('오답 0개');
  await expect(page.locator('.result__lines')).toContainText('7단 MASTER 보너스');
  await expect(page.locator('.result__lines')).toContainText('+30');

  // 탐험 선택: 7단 버튼에 MASTER와 최고 기록
  await page.getByRole('button', { name: '펫에게 가기' }).click();
  await closeEvolutionIfShown(page);
  await page.getByRole('link', { name: /탐험/ }).click();
  const btn = page.locator('.dan-button', { hasText: /^MASTER7단/ });
  await expect(btn.locator('.master-sticker')).toHaveText('MASTER');
  await expect(btn.locator('.dan-button__best')).toContainText('초');

  expect(errors).toEqual([]);
});
