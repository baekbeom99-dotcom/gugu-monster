import { describe, expect, it } from 'vitest';
import { BASE_DANS, factsOfDan } from '../src/domain/facts';
import { DAY_MS } from '../src/domain/mastery';
import { createInitialSave, mergeSave } from '../src/store/saveData';
import {
  type AnswerInput,
  BOOST_COUNT,
  challengeEligible,
  DAN_TRIAL_MASTER_MS,
  finishDanTrial,
  finishExploration,
  initialEconomy,
  initialLearning,
  recordAnswer,
  repairChallengeUnlock,
} from '../src/domain/progress';

const NOW = new Date(2026, 9, 15, 10).getTime();

function input(over: Partial<AnswerInput> = {}): AnswerInput {
  return {
    factId: '7x8',
    type: 'product',
    correct: true,
    ms: 2000,
    inputMode: 'choice',
    isRetry: false,
    firstAttemptInBattle: true,
    battleStartedAt: NOW - 60_000,
    now: NOW,
    ...over,
  };
}

describe('답 기록', () => {
  it('정답이면 별 1개, 상자·통계·학습한 날 갱신', () => {
    const r = recordAnswer(initialLearning(), initialEconomy(), input());
    expect(r.stars).toBe(1);
    expect(r.economy.stars).toBe(1);
    expect(r.learning.facts['7x8'].box).toBe(1);
    expect(r.learning.typeStats.product).toEqual({ attempts: 1, correct: 1 });
    expect(r.learning.danRecent[7]).toEqual([true]);
    expect(r.learning.studyDays).toEqual(['2026-10-15']);
    expect(r.learning.totalAttempts).toBe(1);
  });

  it('오답이면 별 0개, 별이 줄지 않는다', () => {
    const economy = { ...initialEconomy(), stars: 10, totalEarned: 10 };
    const r = recordAnswer(initialLearning(), economy, input({ correct: false }));
    expect(r.stars).toBe(0);
    expect(r.economy.stars).toBe(10);
    expect(r.learning.facts['7x8'].box).toBe(1);
  });

  it('지난 탐험에서 틀린 사실을 이번에 처음 만나 맞히면 극복 +2 (하루 1번)', () => {
    const yesterday = NOW - DAY_MS;
    const wrong = recordAnswer(initialLearning(), initialEconomy(), input({ correct: false, now: yesterday, battleStartedAt: yesterday - 1000 }));
    const r = recordAnswer(wrong.learning, wrong.economy, input());
    expect(r.overcome).toBe(true);
    expect(r.stars).toBe(3);
    expect(r.learning.overcomeLog).toEqual([{ factId: '7x8', date: '2026-10-15' }]);

    // 같은 날 다시 틀렸다가 다음 탐험에서 맞혀도 두 번째 극복은 없다
    const again = recordAnswer(r.learning, r.economy, input({ correct: false, now: NOW + 1000 }));
    const second = recordAnswer(again.learning, again.economy, input({ now: NOW + 3_600_000, battleStartedAt: NOW + 3_000_000 }));
    expect(second.overcome).toBe(false);
  });

  it('같은 탐험에서 틀린 것을 재출제로 맞히면 극복이 아니다', () => {
    const wrong = recordAnswer(initialLearning(), initialEconomy(), input({ correct: false }));
    const retry = recordAnswer(wrong.learning, wrong.economy, input({ isRetry: true, firstAttemptInBattle: false, now: NOW + 5000 }));
    expect(retry.overcome).toBe(false);
    expect(retry.stars).toBe(1);
  });
});

describe('탐험 종료', () => {
  it('완료 +3, 오늘 첫 탐험 +5 (하루 1번)', () => {
    const first = finishExploration(initialLearning(), initialEconomy(), { completed: true, now: NOW });
    expect(first.bonuses.map((b) => b.stars)).toEqual([3, 5]);
    expect(first.economy.stars).toBe(8);
    expect(first.learning.totalExplorations).toBe(1);
    const second = finishExploration(first.learning, first.economy, { completed: true, now: NOW + 1000 });
    expect(second.bonuses.map((b) => b.stars)).toEqual([3]);
  });

  it('중간에 그만두면 완료 보상 없음, 탐험 횟수도 그대로', () => {
    const r = finishExploration(initialLearning(), initialEconomy(), { completed: false, now: NOW });
    expect(r.bonuses).toEqual([]);
    expect(r.learning.totalExplorations).toBe(0);
  });

  it('단 마스터 +20, 2~9단을 모두 마스터하면 도전 모드가 열린다', () => {
    const learning = initialLearning();
    for (const dan of BASE_DANS) for (const f of factsOfDan(dan)) learning.facts[f.id].box = 4;
    learning.masteredDans = BASE_DANS.filter((d) => d !== 9);
    const r = finishExploration(learning, initialEconomy(), { completed: true, now: NOW });
    expect(r.newlyMastered).toEqual([9]);
    expect(r.bonuses).toContainEqual({ label: '9단 마스터', stars: 20 });
    expect(r.challengeJustUnlocked).toBe(true);
    expect(r.learning.challengeUnlocked).toBe(true);
    expect(r.learning.challengeUnlockedBy).toBe('mastery');
  });

  it('12·13단 마스터는 +40', () => {
    const learning = { ...initialLearning(), challengeUnlocked: true };
    for (const f of factsOfDan(12)) learning.facts[f.id].box = 5;
    const r = finishExploration(learning, initialEconomy(), { completed: false, now: NOW });
    expect(r.bonuses).toEqual([{ label: '12단 마스터', stars: 40 }]);
  });
});


describe('단 도전 기록', () => {
  it('33초 안에 모두 맞히면 MASTER + 보너스 별 30 (처음 한 번만), 최고 기록 갱신', () => {
    const slow = finishDanTrial(initialLearning(), initialEconomy(), { dan: 7, timeMs: 40_000, mistakes: 0, now: NOW });
    expect(slow).toMatchObject({ newBest: true, justMastered: false, bonus: 0 });
    expect(slow.record).toMatchObject({ bestMs: 40_000, master: false, plays: 1 });

    const fast = finishDanTrial(slow.learning, slow.economy, { dan: 7, timeMs: DAN_TRIAL_MASTER_MS, mistakes: 0, now: NOW });
    expect(fast).toMatchObject({ newBest: true, justMastered: true, bonus: 30 });
    expect(fast.economy.stars).toBe(30);
    expect(fast.record.masteredAt).toBe('2026-10-15');

    const again = finishDanTrial(fast.learning, fast.economy, { dan: 7, timeMs: 31_000, mistakes: 0, now: NOW });
    expect(again).toMatchObject({ newBest: true, justMastered: false, bonus: 0 });
    expect(again.record).toMatchObject({ master: true, bestMs: 31_000, plays: 3 });

    const worse = finishDanTrial(again.learning, again.economy, { dan: 7, timeMs: 50_000, mistakes: 0, now: NOW });
    expect(worse.newBest).toBe(false);
    expect(worse.record.master).toBe(true);
  });

  it('33초 안이어도 하나라도 틀리면 MASTER가 아니다 (기록은 남는다)', () => {
    const r = finishDanTrial(initialLearning(), initialEconomy(), { dan: 7, timeMs: 15_000, mistakes: 1, now: NOW });
    expect(r).toMatchObject({ justMastered: false, bonus: 0, newBest: true, mistakes: 1 });
    expect(r.record).toMatchObject({ master: false, bestMs: 15_000 });
    const perfect = finishDanTrial(r.learning, r.economy, { dan: 7, timeMs: 25_000, mistakes: 0, now: NOW });
    expect(perfect).toMatchObject({ justMastered: true, bonus: 30, newBest: false });
  });

  it('12·13단 MASTER 보너스는 50', () => {
    expect(finishDanTrial(initialLearning(), initialEconomy(), { dan: 13, timeMs: 20_000, mistakes: 0, now: NOW }).bonus).toBe(50);
  });

  it('단 도전에서 틀리면 부스트, 추천 탐험에서 처음 만나 맞힐 때마다 하나씩 줄어든다', () => {
    let l = recordAnswer(initialLearning(), initialEconomy(), input({ correct: false, source: 'trial' })).learning;
    expect(l.boosted['7x8']).toBe(BOOST_COUNT);
    // 단 도전 안에서 다시 맞혀도 부스트는 그대로
    l = recordAnswer(l, initialEconomy(), input({ correct: true, source: 'trial', isRetry: true })).learning;
    expect(l.boosted['7x8']).toBe(BOOST_COUNT);
    // 추천 탐험: 재출제 정답은 세지 않고, 처음 만나 맞히면 줄어든다
    l = recordAnswer(l, initialEconomy(), input({ correct: true, isRetry: true })).learning;
    expect(l.boosted['7x8']).toBe(BOOST_COUNT);
    for (let i = 0; i < BOOST_COUNT; i++) l = recordAnswer(l, initialEconomy(), input({ correct: true })).learning;
    expect(l.boosted['7x8']).toBeUndefined();
  });
});

describe('12·13단 도전 모드 열기', () => {
  const trials = (dans: readonly number[]) =>
    Object.fromEntries(dans.map((d) => [d, { bestMs: 30_000, plays: 1, master: true, masteredAt: '2026-10-15' }]));

  it('2~9단 단 도전 MASTER를 모두 받으면 탐험을 마칠 때 열린다', () => {
    const learning = { ...initialLearning(), danTrials: trials(BASE_DANS) };
    const r = finishExploration(learning, initialEconomy(), { completed: true, now: NOW });
    expect(r.challengeJustUnlocked).toBe(true);
    expect(r.learning.challengeUnlocked).toBe(true);
  });

  it('MASTER가 하나라도 빠지면 열리지 않는다', () => {
    const learning = { ...initialLearning(), danTrials: trials(BASE_DANS.filter((d) => d !== 9)) };
    expect(challengeEligible(learning)).toBe(false);
    expect(finishExploration(learning, initialEconomy(), { completed: true, now: NOW }).challengeJustUnlocked).toBe(false);
  });

  it('예전 저장 데이터: 조건을 채웠는데 닫혀 있으면 불러올 때 열고, 다른 기록은 그대로 둔다', () => {
    const old = { ...initialLearning(), masteredDans: [...BASE_DANS], totalExplorations: 42, studyDays: ['2026-10-01'] };
    const fixed = repairChallengeUnlock(old);
    expect(fixed).toMatchObject({ challengeUnlocked: true, challengeUnlockedBy: 'mastery', totalExplorations: 42, studyDays: ['2026-10-01'] });
    expect(fixed.facts).toBe(old.facts);
    const merged = mergeSave(createInitialSave(NOW), { learning: { ...old, danTrials: {} }, economy: { stars: 77 } });
    expect(merged.learning.challengeUnlocked).toBe(true);
    expect(merged.learning.totalExplorations).toBe(42);
    expect(merged.economy.stars).toBe(77);
    // 조건을 못 채웠으면 그대로
    expect(repairChallengeUnlock(initialLearning()).challengeUnlocked).toBe(false);
  });
});
